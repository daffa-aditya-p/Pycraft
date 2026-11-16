import { CHUNK_SIZE, PADDED_SIZE } from './ChunkStorage';
import { PALETTE_TABLES, VoxelId } from './palette';

/** 4-level baked vertex AO brightness table (Section 11.1 / Phase 1 spec). */
export const AO_LEVELS = [0.62, 0.76, 0.88, 1.0] as const;

export interface LayerMeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  dormantColors: Float32Array;
  ao: Float32Array;
  emissive: Float32Array;
  indices: Uint32Array;
  faceCount: number;
}

export interface ChunkMeshResult {
  key: string;
  cx: number;
  cy: number;
  cz: number;
  solid: LayerMeshBuffers;
  water: LayerMeshBuffers;
  skybridge: LayerMeshBuffers;
  stats: {
    naiveFaces: number;
    mergedFaces: number;
    reductionRatio: number;
    durationMs: number;
  };
}

class MeshBufferBuilder {
  private positions: number[] = [];
  private normals: number[] = [];
  private colors: number[] = [];
  private dormantColors: number[] = [];
  private ao: number[] = [];
  private emissive: number[] = [];
  private indices: number[] = [];
  private vertexCount = 0;
  public faceCount = 0;

  pushQuad(
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    lr: number,
    lg: number,
    lb: number,
    dr: number,
    dg: number,
    db: number,
    emissiveVal: number,
    ao0: number,
    ao1: number,
    ao2: number,
    ao3: number,
  ): void {
    const base = this.vertexCount;
    this.positions.push(
      p0[0], p0[1], p0[2],
      p1[0], p1[1], p1[2],
      p2[0], p2[1], p2[2],
      p3[0], p3[1], p3[2],
    );
    this.normals.push(
      nx, ny, nz,
      nx, ny, nz,
      nx, ny, nz,
      nx, ny, nz,
    );
    this.colors.push(
      lr, lg, lb,
      lr, lg, lb,
      lr, lg, lb,
      lr, lg, lb,
    );
    this.dormantColors.push(
      dr, dg, db,
      dr, dg, db,
      dr, dg, db,
      dr, dg, db,
    );
    this.ao.push(ao0, ao1, ao2, ao3);
    this.emissive.push(emissiveVal, emissiveVal, emissiveVal, emissiveVal);

    // Flip quad diagonal when diagonal 1-3 has higher AO sum to prevent anisotropy artifacts
    if (ao0 + ao2 < ao1 + ao3) {
      this.indices.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    } else {
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    this.vertexCount += 4;
    this.faceCount += 1;
  }

  build(): LayerMeshBuffers {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
      dormantColors: new Float32Array(this.dormantColors),
      ao: new Float32Array(this.ao),
      emissive: new Float32Array(this.emissive),
      indices: new Uint32Array(this.indices),
      faceCount: this.faceCount,
    };
  }
}

function paddedIdx(px: number, py: number, pz: number): number {
  return (py * PADDED_SIZE + pz) * PADDED_SIZE + px;
}

/**
 * Computes 4-level vertex AO for a corner of a face at padded coordinates (px, py, pz)
 * looking outward along axis `d` with `sign` (+1 or -1).
 */
function sampleCornerAoLevel(
  padded: Uint8Array,
  opaqueTable: Uint8Array,
  px: number,
  py: number,
  pz: number,
  d: 0 | 1 | 2,
  u: 0 | 1 | 2,
  v: 0 | 1 | 2,
  sign: number,
  su: number,
  sv: number,
): number {
  const c: [number, number, number] = [px, py, pz];
  c[d] += sign;

  const s1: [number, number, number] = [c[0], c[1], c[2]];
  s1[u] += su;
  const side1 = opaqueTable[padded[paddedIdx(s1[0], s1[1], s1[2])] ?? 0] === 1 ? 1 : 0;

  const s2: [number, number, number] = [c[0], c[1], c[2]];
  s2[v] += sv;
  const side2 = opaqueTable[padded[paddedIdx(s2[0], s2[1], s2[2])] ?? 0] === 1 ? 1 : 0;

  if (side1 && side2) return 0;

  const diag: [number, number, number] = [c[0], c[1], c[2]];
  diag[u] += su;
  diag[v] += sv;
  const corner = opaqueTable[padded[paddedIdx(diag[0], diag[1], diag[2])] ?? 0] === 1 ? 1 : 0;

  return 3 - (side1 + side2 + corner);
}

/**
 * Greedy meshes a 34^3 padded voxel chunk into transferable typed arrays separated by
 * solid, water, and skybridge layers. Merges coplanar faces that share both palette index
 * and 4-corner baked AO signature.
 */
export function meshPaddedChunk(
  padded: Uint8Array,
  cx: number,
  cy: number,
  cz: number,
  key = `${cx},${cy},${cz}`,
): ChunkMeshResult {
  const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const { lushRgb, dormantRgb, emissive, layer, opaque } = PALETTE_TABLES;

  const builders: [MeshBufferBuilder, MeshBufferBuilder, MeshBufferBuilder] = [
    new MeshBufferBuilder(), // solid (layer 1)
    new MeshBufferBuilder(), // water (layer 2)
    new MeshBufferBuilder(), // skybridge (layer 3)
  ];

  let naiveFaces = 0;
  let mergedFaces = 0;

  // Mask holds: (layer << 16) | (aoPack << 8) | voxelId, or 0 for empty/culled
  const mask = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);

  for (const d of [0, 1, 2] as const) {
    const u = ((d + 1) % 3) as 0 | 1 | 2;
    const v = ((d + 2) % 3) as 0 | 1 | 2;

    for (const sign of [1, -1] as const) {
      const normal: [number, number, number] = [0, 0, 0];
      normal[d] = sign;

      for (let slice = 0; slice < CHUNK_SIZE; slice++) {
        mask.fill(0);
        let anyInSlice = false;

        // 1. Build 2D mask of exposed faces in this slice
        for (let iv = 0; iv < CHUNK_SIZE; iv++) {
          for (let iu = 0; iu < CHUNK_SIZE; iu++) {
            const coord: [number, number, number] = [0, 0, 0];
            coord[d] = slice + 1;
            coord[u] = iu + 1;
            coord[v] = iv + 1;

            const vid = padded[paddedIdx(coord[0], coord[1], coord[2])] ?? VoxelId.AIR;
            if (vid === VoxelId.AIR) continue;
            const vLayer = layer[vid] ?? 0;
            if (vLayer === 0) continue;

            const nCoord: [number, number, number] = [coord[0], coord[1], coord[2]];
            nCoord[d] += sign;
            const nVid = padded[paddedIdx(nCoord[0], nCoord[1], nCoord[2])] ?? VoxelId.AIR;
            const nLayer = layer[nVid] ?? 0;

            // Face culling rules per layer
            if (vLayer === 1) {
              if (opaque[nVid] === 1) continue;
            } else if (vLayer === 2) {
              if (nLayer === 2 || opaque[nVid] === 1) continue;
            } else if (vLayer === 3) {
              if (nLayer === 3 || opaque[nVid] === 1) continue;
            }

            naiveFaces++;
            anyInSlice = true;

            // Compute 4-corner AO signature (water/skybridge skip dark AO for clean translucency)
            let aoPack = 0xff; // all 3s (1.0)
            if (vLayer === 1) {
              const a00 = sampleCornerAoLevel(padded, opaque, coord[0], coord[1], coord[2], d, u, v, sign, -1, -1);
              const a10 = sampleCornerAoLevel(padded, opaque, coord[0], coord[1], coord[2], d, u, v, sign, 1, -1);
              const a11 = sampleCornerAoLevel(padded, opaque, coord[0], coord[1], coord[2], d, u, v, sign, 1, 1);
              const a01 = sampleCornerAoLevel(padded, opaque, coord[0], coord[1], coord[2], d, u, v, sign, -1, 1);
              aoPack = a00 | (a10 << 2) | (a11 << 4) | (a01 << 6);
            }

            mask[iv * CHUNK_SIZE + iu] = (vLayer << 16) | (aoPack << 8) | vid;
          }
        }

        if (!anyInSlice) continue;

        // 2. Greedy merge maximal rectangles with identical mask value (palette + AO + layer)
        for (let iv = 0; iv < CHUNK_SIZE; iv++) {
          for (let iu = 0; iu < CHUNK_SIZE; ) {
            const mIdx = iv * CHUNK_SIZE + iu;
            const cell = mask[mIdx] ?? 0;
            if (cell === 0) {
              iu++;
              continue;
            }

            // Expand width along u
            let w = 1;
            while (iu + w < CHUNK_SIZE && mask[mIdx + w] === cell) {
              w++;
            }

            // Expand height along v
            let h = 1;
            outer: while (iv + h < CHUNK_SIZE) {
              const rowOffset = (iv + h) * CHUNK_SIZE + iu;
              for (let k = 0; k < w; k++) {
                if (mask[rowOffset + k] !== cell) {
                  break outer;
                }
              }
              h++;
            }

            // Clear merged region
            for (let dv = 0; dv < h; dv++) {
              const rowOffset = (iv + dv) * CHUNK_SIZE + iu;
              for (let du = 0; du < w; du++) {
                mask[rowOffset + du] = 0;
              }
            }

            // Emit quad
            const vid = cell & 0xff;
            const aoPack = (cell >> 8) & 0xff;
            const vLayer = (cell >> 16) & 0xff;
            const builder = builders[vLayer - 1];
            if (builder) {
              const a00 = AO_LEVELS[aoPack & 0x3] ?? 1.0;
              const a10 = AO_LEVELS[(aoPack >> 2) & 0x3] ?? 1.0;
              const a11 = AO_LEVELS[(aoPack >> 4) & 0x3] ?? 1.0;
              const a01 = AO_LEVELS[(aoPack >> 6) & 0x3] ?? 1.0;

              const planePos = sign > 0 ? slice + 1 : slice;
              const p0: [number, number, number] = [0, 0, 0];
              const p1: [number, number, number] = [0, 0, 0];
              const p2: [number, number, number] = [0, 0, 0];
              const p3: [number, number, number] = [0, 0, 0];

              p0[d] = planePos;
              p1[d] = planePos;
              p2[d] = planePos;
              p3[d] = planePos;

              if (sign > 0) {
                // CCW: (u0, v0) -> (u1, v0) -> (u1, v1) -> (u0, v1)
                p0[u] = iu;     p0[v] = iv;
                p1[u] = iu + w; p1[v] = iv;
                p2[u] = iu + w; p2[v] = iv + h;
                p3[u] = iu;     p3[v] = iv + h;

                const i3 = vid * 3;
                builder.pushQuad(
                  p0, p1, p2, p3,
                  normal[0] ?? 0, normal[1] ?? 0, normal[2] ?? 0,
                  lushRgb[i3] ?? 0, lushRgb[i3 + 1] ?? 0, lushRgb[i3 + 2] ?? 0,
                  dormantRgb[i3] ?? 0, dormantRgb[i3 + 1] ?? 0, dormantRgb[i3 + 2] ?? 0,
                  emissive[vid] ?? 0,
                  a00, a10, a11, a01,
                );
              } else {
                // CCW for -d normal: (u0, v0) -> (u0, v1) -> (u1, v1) -> (u1, v0)
                p0[u] = iu;     p0[v] = iv;
                p1[u] = iu;     p1[v] = iv + h;
                p2[u] = iu + w; p2[v] = iv + h;
                p3[u] = iu + w; p3[v] = iv;

                const i3 = vid * 3;
                builder.pushQuad(
                  p0, p1, p2, p3,
                  normal[0] ?? 0, normal[1] ?? 0, normal[2] ?? 0,
                  lushRgb[i3] ?? 0, lushRgb[i3 + 1] ?? 0, lushRgb[i3 + 2] ?? 0,
                  dormantRgb[i3] ?? 0, dormantRgb[i3 + 1] ?? 0, dormantRgb[i3 + 2] ?? 0,
                  emissive[vid] ?? 0,
                  a00, a01, a11, a10,
                );
              }
              mergedFaces++;
            }

            iu += w;
          }
        }
      }
    }
  }

  const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const reductionRatio = naiveFaces > 0 ? 1 - mergedFaces / naiveFaces : 0;

  return {
    key,
    cx,
    cy,
    cz,
    solid: builders[0].build(),
    water: builders[1].build(),
    skybridge: builders[2].build(),
    stats: {
      naiveFaces,
      mergedFaces,
      reductionRatio,
      durationMs: endMs - startMs,
    },
  };
}

export function collectTransferables(result: ChunkMeshResult): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [];
  for (const layer of [result.solid, result.water, result.skybridge]) {
    buffers.push(
      layer.positions.buffer as ArrayBuffer,
      layer.normals.buffer as ArrayBuffer,
      layer.colors.buffer as ArrayBuffer,
      layer.dormantColors.buffer as ArrayBuffer,
      layer.ao.buffer as ArrayBuffer,
      layer.emissive.buffer as ArrayBuffer,
      layer.indices.buffer as ArrayBuffer,
    );
  }
  return buffers;
}
