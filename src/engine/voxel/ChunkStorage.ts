import { PALETTE_TABLES, VoxelId } from './palette';

export const CHUNK_SIZE = 32;
export const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE;
export const PADDED_SIZE = CHUNK_SIZE + 2;

export interface VoxelChunk {
  cx: number;
  cy: number;
  cz: number;
  key: string;
  /** 32^3 palette-indexed voxel buffer; layout (y << 10) | (z << 5) | x */
  data: Uint8Array;
  /** Island/restoration zone identifier owning this chunk */
  zoneId: string;
  dirty: boolean;
}

export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

export function localIndex(lx: number, ly: number, lz: number): number {
  return (ly << 10) | (lz << 5) | lx;
}

export function floorDiv(n: number, d: number): number {
  return Math.floor(n / d);
}

export function mod32(n: number): number {
  return ((n % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

export interface SerializedChunkEntry {
  cx: number;
  cy: number;
  cz: number;
  zoneId: string;
  /** Run-length encoded pairs: [countLo, countHi, voxelId] stored as base64 or number[] */
  rle: number[];
}

export interface SerializedWorldData {
  version: 1;
  chunks: SerializedChunkEntry[];
}

/**
 * Palette-indexed 32^3 chunk storage supporting O(1) world-coordinate queries,
 * neighbor-padded extraction for seamless greedy meshing & AO, and compact RLE serialization.
 */
export class ChunkStorage {
  private readonly chunks = new Map<string, VoxelChunk>();

  getChunk(cx: number, cy: number, cz: number): VoxelChunk | undefined {
    return this.chunks.get(chunkKey(cx, cy, cz));
  }

  getOrCreateChunk(cx: number, cy: number, cz: number, zoneId = 'awakening'): VoxelChunk {
    const key = chunkKey(cx, cy, cz);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = {
        cx,
        cy,
        cz,
        key,
        data: new Uint8Array(CHUNK_VOLUME),
        zoneId,
        dirty: true,
      };
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  setChunkZone(cx: number, cy: number, cz: number, zoneId: string): void {
    const chunk = this.chunks.get(chunkKey(cx, cy, cz));
    if (chunk) {
      chunk.zoneId = zoneId;
    }
  }

  getAllChunks(): VoxelChunk[] {
    return Array.from(this.chunks.values());
  }

  getDirtyChunks(): VoxelChunk[] {
    const dirty: VoxelChunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) dirty.push(chunk);
    }
    return dirty;
  }

  markClean(key: string): void {
    const chunk = this.chunks.get(key);
    if (chunk) chunk.dirty = false;
  }

  markAllDirty(): void {
    for (const chunk of this.chunks.values()) {
      chunk.dirty = true;
    }
  }

  clear(): void {
    this.chunks.clear();
  }

  getVoxel(wx: number, wy: number, wz: number): number {
    const ix = Math.floor(wx);
    const iy = Math.floor(wy);
    const iz = Math.floor(wz);
    const cx = floorDiv(ix, CHUNK_SIZE);
    const cy = floorDiv(iy, CHUNK_SIZE);
    const cz = floorDiv(iz, CHUNK_SIZE);
    const chunk = this.chunks.get(chunkKey(cx, cy, cz));
    if (!chunk) return VoxelId.AIR;
    const lx = mod32(ix);
    const ly = mod32(iy);
    const lz = mod32(iz);
    return chunk.data[localIndex(lx, ly, lz)] ?? VoxelId.AIR;
  }

  setVoxel(wx: number, wy: number, wz: number, id: number, zoneId?: string): void {
    const ix = Math.floor(wx);
    const iy = Math.floor(wy);
    const iz = Math.floor(wz);
    const cx = floorDiv(ix, CHUNK_SIZE);
    const cy = floorDiv(iy, CHUNK_SIZE);
    const cz = floorDiv(iz, CHUNK_SIZE);
    const chunk = this.getOrCreateChunk(cx, cy, cz, zoneId ?? 'awakening');
    const lx = mod32(ix);
    const ly = mod32(iy);
    const lz = mod32(iz);
    const idx = localIndex(lx, ly, lz);
    if (chunk.data[idx] === id) return;
    chunk.data[idx] = id;
    chunk.dirty = true;
    if (zoneId) chunk.zoneId = zoneId;

    // Mark adjacent chunks dirty if edit touches a chunk border (for seamless AO & culling)
    if (lx === 0) this.markNeighborDirty(cx - 1, cy, cz);
    if (lx === CHUNK_SIZE - 1) this.markNeighborDirty(cx + 1, cy, cz);
    if (ly === 0) this.markNeighborDirty(cx, cy - 1, cz);
    if (ly === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cy + 1, cz);
    if (lz === 0) this.markNeighborDirty(cx, cy, cz - 1);
    if (lz === CHUNK_SIZE - 1) this.markNeighborDirty(cx, cy, cz + 1);
  }

  private markNeighborDirty(cx: number, cy: number, cz: number): void {
    const neighbor = this.chunks.get(chunkKey(cx, cy, cz));
    if (neighbor) neighbor.dirty = true;
  }

  isSolid(wx: number, wy: number, wz: number): boolean {
    const id = this.getVoxel(wx, wy, wz);
    return PALETTE_TABLES.solid[id] === 1;
  }

  isOpaque(wx: number, wy: number, wz: number): boolean {
    const id = this.getVoxel(wx, wy, wz);
    return PALETTE_TABLES.opaque[id] === 1;
  }

  /**
   * Builds a 34^3 padded buffer around chunk (cx, cy, cz) so the mesher worker
   * can evaluate cross-chunk face culling and vertex AO with zero border seams.
   */
  extractPaddedChunk(cx: number, cy: number, cz: number): Uint8Array {
    const padded = new Uint8Array(PADDED_SIZE * PADDED_SIZE * PADDED_SIZE);
    const baseX = cx * CHUNK_SIZE;
    const baseY = cy * CHUNK_SIZE;
    const baseZ = cz * CHUNK_SIZE;

    const centerChunk = this.getChunk(cx, cy, cz);
    if (centerChunk) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const srcOffset = (y << 10) | (z << 5);
          const dstOffset = ((y + 1) * PADDED_SIZE + (z + 1)) * PADDED_SIZE + 1;
          padded.set(centerChunk.data.subarray(srcOffset, srcOffset + CHUNK_SIZE), dstOffset);
        }
      }
    }

    // Fill 1-voxel boundary shell from adjacent chunks
    for (let py = 0; py < PADDED_SIZE; py++) {
      const yBorder = py === 0 || py === PADDED_SIZE - 1;
      for (let pz = 0; pz < PADDED_SIZE; pz++) {
        const zBorder = pz === 0 || pz === PADDED_SIZE - 1;
        for (let px = 0; px < PADDED_SIZE; px++) {
          if (!yBorder && !zBorder && px > 0 && px < PADDED_SIZE - 1) {
            px = PADDED_SIZE - 2; // skip interior already copied in bulk
            continue;
          }
          const v = this.getVoxel(baseX + px - 1, baseY + py - 1, baseZ + pz - 1);
          if (v !== 0) {
            padded[(py * PADDED_SIZE + pz) * PADDED_SIZE + px] = v;
          }
        }
      }
    }

    return padded;
  }

  serialize(): SerializedWorldData {
    const chunks: SerializedChunkEntry[] = [];
    for (const chunk of this.chunks.values()) {
      let hasAny = false;
      for (let i = 0; i < chunk.data.length; i++) {
        if (chunk.data[i] !== 0) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) continue;

      const rle: number[] = [];
      let current = chunk.data[0] ?? 0;
      let count = 1;
      for (let i = 1; i < chunk.data.length; i++) {
        const v = chunk.data[i] ?? 0;
        if (v === current) {
          count++;
        } else {
          rle.push(count, current);
          current = v;
          count = 1;
        }
      }
      rle.push(count, current);

      chunks.push({
        cx: chunk.cx,
        cy: chunk.cy,
        cz: chunk.cz,
        zoneId: chunk.zoneId,
        rle,
      });
    }
    return { version: 1, chunks };
  }

  deserialize(world: SerializedWorldData): void {
    this.clear();
    for (const entry of world.chunks) {
      const chunk = this.getOrCreateChunk(entry.cx, entry.cy, entry.cz, entry.zoneId);
      let cursor = 0;
      for (let i = 0; i < entry.rle.length; i += 2) {
        const count = entry.rle[i] ?? 0;
        const val = entry.rle[i + 1] ?? 0;
        if (val !== 0) {
          chunk.data.fill(val, cursor, cursor + count);
        }
        cursor += count;
      }
      chunk.dirty = true;
    }
  }
}
