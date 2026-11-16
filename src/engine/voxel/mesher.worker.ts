import { collectTransferables, meshPaddedChunk } from './mesher';

export interface MesherWorkerRequest {
  id: number;
  key: string;
  cx: number;
  cy: number;
  cz: number;
  padded: Uint8Array;
}

export interface MesherWorkerResponse {
  id: number;
  result: ReturnType<typeof meshPaddedChunk>;
}

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<MesherWorkerRequest>) => void) | null;
  postMessage: (msg: MesherWorkerResponse, transfer: Transferable[]) => void;
};

ctx.onmessage = (event: MessageEvent<MesherWorkerRequest>) => {
  const { id, key, cx, cy, cz, padded } = event.data;
  const result = meshPaddedChunk(padded, cx, cy, cz, key);
  const transfers = collectTransferables(result);
  ctx.postMessage({ id, result }, transfers);
};
