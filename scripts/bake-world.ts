import fs from 'node:fs';
import path from 'node:path';
import {
  generateAwakeningWorld,
  serializeGeneratedWorld,
} from '../src/engine/voxel/islandGenerator';

/**
 * Build-time world baker (T-WLD-01):
 * Deterministically generates all 7 Awakening Islands + Tier 2/3/4 placements
 * and outputs compact RLE-compressed JSON to src/content/awakening/world.baked.json.
 */
function main(): void {
  const start = performance.now();
  const world = generateAwakeningWorld();
  const payload = serializeGeneratedWorld(world);
  const json = JSON.stringify(payload);

  const outDir = path.join(process.cwd(), 'src', 'content', 'awakening');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'world.baked.json');
  fs.writeFileSync(outPath, json, 'utf8');

  const elapsedMs = (performance.now() - start).toFixed(1);
  const sizeKb = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);

  console.log(
    `[bake:world] Baked ${payload.chunks.chunks.length} chunks, ${payload.props.length} instanced props, ` +
      `${payload.zones.length} islands -> ${path.relative(process.cwd(), outPath)} (${sizeKb} KB in ${elapsedMs} ms)`,
  );
}

main();
