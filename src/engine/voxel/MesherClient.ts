import { ChunkStorage, type VoxelChunk } from './ChunkStorage';
import { meshPaddedChunk, type ChunkMeshResult } from './mesher';
import type { MesherWorkerRequest, MesherWorkerResponse } from './mesher.worker';

/**
 * Coordinates off-thread greedy meshing via mesher.worker.ts with a synchronous
 * main-thread fallback when Web Workers are unavailable (e.g., Node/Vitest).
 */
export class MesherClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<
    number,
    { resolve: (res: ChunkMeshResult) => void; reject: (err: unknown) => void }
  >();

  constructor() {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./mesher.worker.ts', import.meta.url), {
          type: 'module',
        });
        this.worker.onmessage = (event: MessageEvent<MesherWorkerResponse>) => {
          const { id, result } = event.data;
          const entry = this.pending.get(id);
          if (entry) {
            this.pending.delete(id);
            entry.resolve(result);
          }
        };
        this.worker.onerror = (err) => {
          for (const entry of this.pending.values()) {
            entry.reject(err);
          }
          this.pending.clear();
        };
      } catch {
        this.worker = null;
      }
    }
  }

  async meshChunk(storage: ChunkStorage, chunk: VoxelChunk): Promise<ChunkMeshResult> {
    const padded = storage.extractPaddedChunk(chunk.cx, chunk.cy, chunk.cz);
    if (!this.worker) {
      return meshPaddedChunk(padded, chunk.cx, chunk.cy, chunk.cz, chunk.key);
    }

    const id = this.nextId++;
    return new Promise<ChunkMeshResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const msg: MesherWorkerRequest = {
        id,
        key: chunk.key,
        cx: chunk.cx,
        cy: chunk.cy,
        cz: chunk.cz,
        padded,
      };
      this.worker!.postMessage(msg, [padded.buffer]);
    });
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.pending.clear();
  }
}
