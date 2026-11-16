import fs from 'node:fs';
import path from 'node:path';

interface PaletteEntry {
  index: number;
  id: string;
  group: string;
  hex: string;
  role: string;
  exemptSaturation?: boolean;
  maxEmissive?: number;
}

interface PaletteFile {
  version: number;
  name: string;
  calibratedTo: string;
  colors: PaletteEntry[];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function rgbToHslSaturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return 0;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  return s * 100;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results;
}

function main(): void {
  const root = process.cwd();
  const palettePath = path.join(root, 'src', 'content', 'palette.json');
  if (!fs.existsSync(palettePath)) {
    console.error(`[palette:lint] Missing ${palettePath}`);
    process.exit(1);
  }

  const palette = JSON.parse(fs.readFileSync(palettePath, 'utf8')) as PaletteFile;
  const errors: string[] = [];

  if (palette.colors.length !== 48) {
    errors.push(`Expected exactly 48 colors in palette.json, found ${palette.colors.length}`);
  }

  const hexSet = new Set<string>();
  const idSet = new Set<string>();
  const indexSet = new Set<number>();

  for (const color of palette.colors) {
    if (!/^#[0-9A-Fa-f]{6}$/.test(color.hex)) {
      errors.push(`Invalid hex "${color.hex}" for color "${color.id}"`);
      continue;
    }
    const upperHex = color.hex.toUpperCase();
    hexSet.add(upperHex);

    if (idSet.has(color.id)) {
      errors.push(`Duplicate palette id "${color.id}"`);
    }
    idSet.add(color.id);

    if (indexSet.has(color.index) || color.index < 1 || color.index > 48) {
      errors.push(`Invalid or duplicate palette index ${color.index} for "${color.id}"`);
    }
    indexSet.add(color.index);

    const [r, g, b] = hexToRgb(upperHex);
    const sat = rgbToHslSaturation(r, g, b);
    if (sat > 62 && !color.exemptSaturation) {
      errors.push(
        `Color "${color.id}" (${upperHex}) HSL saturation is ${sat.toFixed(1)}% (> 62% cap without exemptSaturation)`
      );
    }
    if (sat > 88) {
      errors.push(`Color "${color.id}" (${upperHex}) HSL saturation ${sat.toFixed(1)}% exceeds hard ceiling 88%`);
    }
    if (color.maxEmissive !== undefined && color.maxEmissive > 1.2) {
      errors.push(`Color "${color.id}" maxEmissive=${color.maxEmissive} exceeds 1.2x albedo limit`);
    }
  }

  // Verify world/prefab content files use only locked palette hexes & indices
  const awakeningDir = path.join(root, 'src', 'content', 'awakening');
  const contentFiles = walkJsonFiles(awakeningDir);
  for (const filePath of contentFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const hexMatches = raw.match(/#[0-9A-Fa-f]{6}\b/g) ?? [];
    for (const match of hexMatches) {
      if (!hexSet.has(match.toUpperCase())) {
        errors.push(
          `Out-of-palette hex ${match} in ${path.relative(root, filePath)}`
        );
      }
    }
  }

  // Verify WCAG 2.1 AA contrast for core Slate & Parchment UI pairs (Section 11.5 + RC-10)
  const uiChecks: Array<{ name: string; fg: string; bg: string; minRatio: number }> = [
    { name: 'Slate primary text (#E8EEF0 on #1C2427)', fg: '#E8EEF0', bg: '#1C2427', minRatio: 4.5 },
    { name: 'Slate secondary text (#A9B8BD on #1C2427)', fg: '#A9B8BD', bg: '#1C2427', minRatio: 4.5 },
    { name: 'Slate muted text (#8FA3A9 on #1C2427, RC-10)', fg: '#8FA3A9', bg: '#1C2427', minRatio: 4.5 },
    { name: 'Parchment ink (#2A2420 on #F3EAD8)', fg: '#2A2420', bg: '#F3EAD8', minRatio: 4.5 },
  ];
  for (const check of uiChecks) {
    const ratio = contrastRatio(check.fg, check.bg);
    if (ratio < check.minRatio) {
      errors.push(`${check.name} failed WCAG AA: ${ratio.toFixed(2)}:1 < ${check.minRatio}:1`);
    }
  }

  // Check tokens.css if present for forbidden visual effects (Section 11.6)
  const tokensCssPath = path.join(root, 'src', 'ui', 'tokens.css');
  if (fs.existsSync(tokensCssPath)) {
    const css = fs.readFileSync(tokensCssPath, 'utf8');
    if (/backdrop-filter\s*:/i.test(css)) {
      errors.push('src/ui/tokens.css contains forbidden backdrop-filter glassmorphism');
    }
  }

  if (errors.length > 0) {
    console.error('[palette:lint] FAILED:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `[palette:lint] OK: 48 palette entries verified, ${contentFiles.length} content JSON file(s) checked, WCAG AA contrast verified.`
  );
}

main();
