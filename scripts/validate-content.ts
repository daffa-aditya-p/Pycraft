import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const PaletteSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1),
  calibratedTo: z.string().min(1),
  colors: z
    .array(
      z.object({
        index: z.number().int().min(1).max(48),
        id: z.string().min(1),
        group: z.string().min(1),
        hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        role: z.string().min(1),
        exemptSaturation: z.boolean().optional(),
        maxEmissive: z.number().max(1.2).optional(),
      })
    )
    .length(48),
});

function walkJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(full);
    }
  }
  return files;
}

function main(): void {
  const root = process.cwd();
  const contentDir = path.join(root, 'src', 'content');
  const palettePath = path.join(contentDir, 'palette.json');

  const paletteRaw = JSON.parse(fs.readFileSync(palettePath, 'utf8'));
  PaletteSchema.parse(paletteRaw);

  const jsonFiles = walkJsonFiles(contentDir);
  for (const filePath of jsonFiles) {
    try {
      JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.error(`[content:check] Invalid JSON in ${path.relative(root, filePath)}:`, err);
      process.exit(1);
    }
  }

  console.log(`[content:check] OK: Validated palette.json and ${jsonFiles.length} JSON file(s).`);
}

main();
