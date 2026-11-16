import type {
  GridCell,
  SimDelta,
  SimInverseDelta,
  WorldSimState,
} from './types.js';

export function cloneCell(cell: GridCell): GridCell {
  const copy: GridCell = {
    x: cell.x,
    y: cell.y,
    elevation: cell.elevation,
    kind: cell.kind,
    stackHeight: cell.stackHeight,
  };
  if (cell.blockType !== undefined) copy.blockType = cell.blockType;
  if (cell.cropType !== undefined) copy.cropType = cell.cropType;
  if (cell.label !== undefined) copy.label = cell.label;
  if (cell.item !== undefined) copy.item = cell.item;
  if (cell.itemCount !== undefined) copy.itemCount = cell.itemCount;
  return copy;
}

export function cloneState(state: WorldSimState): WorldSimState {
  return {
    width: state.width,
    height: state.height,
    seed: state.seed,
    cargoTracking: state.cargoTracking,
    cells: state.cells.map(cloneCell),
    robot: {
      x: state.robot.x,
      y: state.robot.y,
      z: state.robot.z,
      facing: state.robot.facing,
      cargo: { ...state.robot.cargo },
      sayHistory: [...state.robot.sayHistory],
      rowIndex: state.robot.rowIndex,
    },
    bridge: { ...state.bridge },
    sensor: { ...state.sensor },
    scale: { ...state.scale },
    gate: { ...state.gate },
    farm: {
      rows: state.farm.rows,
      cols: state.farm.cols,
      rowStarts: state.farm.rowStarts.map((rs) => ({ ...rs })),
      plantedCount: state.farm.plantedCount,
      targetCount: state.farm.targetCount,
    },
    depot: { ...state.depot },
    altar: { ...state.altar },
    beacon: {
      lines: [...state.beacon.lines],
      signLines: [...state.beacon.signLines],
      litSegments: state.beacon.litSegments,
      engravedName: state.beacon.engravedName,
    },
  };
}

function setCellInState(state: WorldSimState, cell: GridCell): void {
  if (cell.x < 0 || cell.x >= state.width || cell.y < 0 || cell.y >= state.height) {
    return;
  }
  state.cells[cell.y * state.width + cell.x] = cloneCell(cell);
}

function applyCargoSet(
  cargo: Record<string, number>,
  cargoSet: Record<string, number | null> | undefined,
): void {
  if (!cargoSet) return;
  for (const key of Object.keys(cargoSet)) {
    const val = cargoSet[key];
    if (val === undefined) continue;
    if (val === null) {
      delete cargo[key];
    } else {
      cargo[key] = val;
    }
  }
}

export function applyDeltaToState(state: WorldSimState, delta: SimDelta): void {
  if (delta.robot) {
    if (delta.robot.x !== undefined) state.robot.x = delta.robot.x;
    if (delta.robot.y !== undefined) state.robot.y = delta.robot.y;
    if (delta.robot.z !== undefined) state.robot.z = delta.robot.z;
    if (delta.robot.facing !== undefined) state.robot.facing = delta.robot.facing;
    if (delta.robot.rowIndex !== undefined) state.robot.rowIndex = delta.robot.rowIndex;
  }

  if (delta.sayAppend && delta.sayAppend.length > 0) {
    state.robot.sayHistory.push(...delta.sayAppend);
  }

  applyCargoSet(state.robot.cargo, delta.cargoSet);

  if (delta.cells) {
    for (const c of delta.cells) {
      setCellInState(state, c.cell);
    }
  }

  if (delta.bridge) {
    Object.assign(state.bridge, delta.bridge);
  }
  if (delta.sensor) {
    Object.assign(state.sensor, delta.sensor);
  }
  if (delta.scale) {
    Object.assign(state.scale, delta.scale);
  }
  if (delta.gate) {
    Object.assign(state.gate, delta.gate);
  }
  if (delta.farm) {
    Object.assign(state.farm, delta.farm);
  }
  if (delta.depot) {
    Object.assign(state.depot, delta.depot);
  }
  if (delta.altar) {
    Object.assign(state.altar, delta.altar);
  }
  if (delta.beacon) {
    if (delta.beacon.lines !== undefined) {
      state.beacon.lines = [...delta.beacon.lines];
    }
    if (delta.beacon.signLines !== undefined) {
      state.beacon.signLines = [...delta.beacon.signLines];
    }
    if (delta.beacon.litSegments !== undefined) {
      state.beacon.litSegments = delta.beacon.litSegments;
    }
    if (delta.beacon.engravedName !== undefined) {
      state.beacon.engravedName = delta.beacon.engravedName;
    }
  }
}

export function applyInverseDeltaToState(
  state: WorldSimState,
  inverse: SimInverseDelta,
): void {
  if (inverse.robot) {
    if (inverse.robot.x !== undefined) state.robot.x = inverse.robot.x;
    if (inverse.robot.y !== undefined) state.robot.y = inverse.robot.y;
    if (inverse.robot.z !== undefined) state.robot.z = inverse.robot.z;
    if (inverse.robot.facing !== undefined) state.robot.facing = inverse.robot.facing;
    if (inverse.robot.rowIndex !== undefined) state.robot.rowIndex = inverse.robot.rowIndex;
  }

  if (inverse.sayPopCount && inverse.sayPopCount > 0) {
    const count = Math.min(inverse.sayPopCount, state.robot.sayHistory.length);
    state.robot.sayHistory.splice(state.robot.sayHistory.length - count, count);
  }

  applyCargoSet(state.robot.cargo, inverse.cargoSet);

  if (inverse.cells) {
    for (const c of inverse.cells) {
      setCellInState(state, c.cell);
    }
  }

  if (inverse.bridge) {
    Object.assign(state.bridge, inverse.bridge);
  }
  if (inverse.sensor) {
    Object.assign(state.sensor, inverse.sensor);
  }
  if (inverse.scale) {
    Object.assign(state.scale, inverse.scale);
  }
  if (inverse.gate) {
    Object.assign(state.gate, inverse.gate);
  }
  if (inverse.farm) {
    Object.assign(state.farm, inverse.farm);
  }
  if (inverse.depot) {
    Object.assign(state.depot, inverse.depot);
  }
  if (inverse.altar) {
    Object.assign(state.altar, inverse.altar);
  }
  if (inverse.beacon) {
    if (inverse.beacon.lines !== undefined) {
      state.beacon.lines = [...inverse.beacon.lines];
    }
    if (inverse.beacon.signLines !== undefined) {
      state.beacon.signLines = [...inverse.beacon.signLines];
    }
    if (inverse.beacon.litSegments !== undefined) {
      state.beacon.litSegments = inverse.beacon.litSegments;
    }
    if (inverse.beacon.engravedName !== undefined) {
      state.beacon.engravedName = inverse.beacon.engravedName;
    }
  }
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => (v === undefined ? 'null' : canonicalJson(v)));
    return `[${items.join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${parts.join(',')}}`;
}

// Pure-TypeScript synchronous SHA-256 (FIPS 180-4) with zero DOM/Node/WebCrypto dependencies.
const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function utf8Encode(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        const cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
        i++;
      } else {
        bytes.push(0xef, 0xbf, 0xbd);
      }
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(input: string): string {
  const data = utf8Encode(input);
  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;

  const view = new DataView(padded.buffer);
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  view.setUint32(paddedLen - 8, highBits, false);
  view.setUint32(paddedLen - 4, lowBits, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const w15 = w[i - 15] ?? 0;
      const w2 = w[i - 2] ?? 0;
      const w16 = w[i - 16] ?? 0;
      const w7 = w[i - 7] ?? 0;
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      w[i] = (w16 + s0 + w7 + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + (SHA256_K[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

export function computeStateSha256(state: WorldSimState): string {
  return sha256Hex(canonicalJson(state));
}
