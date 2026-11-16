# PYCRAFT — Architecture Decisions

> Mirrors and tracks the authoritative architectural decisions from [PYCRAFT_MASTER_PLAN.md](file:///D:/Pycraft/docs/PYCRAFT_MASTER_PLAN.md).

## Core Decisions (Locked for R1 MVP)

1. **Simulate in the Worker, Replay on the Main Thread**
   - `src/sim/` is 100% pure deterministic TypeScript with zero React, Three.js, IDB, or DOM imports.
   - Python executes synchronously against `WorldSim` inside `src/runtime/worker/python.worker.ts` (self-hosted Pyodide in `/pyodide/`).
   - Main thread `ActionPlayer` re-validates every `action` delta against its own authoritative `WorldSim` copy and animates the 3D scene without blocking rendering.

2. **Deferred `sys.settrace` Snapshot State Machine (RC-02)**
   - Python's `sys.settrace` `'line'` hook fires *before* a line executes. `pycraft.tracer` tracks `pending_line` and diffs `frame.f_locals` on the subsequent line (or `'return'` / `'exception'` / teardown) so variable changes stamp to the line that caused them.

3. **Dual-Stage Code Inspection (RC-01)**
   - `ast.parse()` validates syntax and structural construct rules (`For`, `While`, `If`, `FunctionDef`, `Return`), while `tokenize.generate_tokens()` inspects `COMMENT` tokens for M1.3 and indentation consistency.

4. **Three-Tier Sandbox & Dual-Mode `input()` / Heap Governance (RC-04, RC-05)**
   - Web Worker isolates compute; `sys.meta_path` + AST allowlist provide pedagogical gating (not security); browser origin sandbox + `public/_headers` (COOP/COEP/CORP/CSP) enforce host security.
   - `input()` and execution interruption use `SharedArrayBuffer` + `Atomics` when `crossOriginIsolated === true`, falling back cleanly to pre-run AST `input()` answer queues and `worker.terminate()` + respawn when `false`.
   - WASM heap (`HEAPU8.byteLength`) > 128 MB triggers automatic worker recycle (< 800 ms).

5. **Two Voxel Scales & Reference-Calibrated 48-Color Palette (RC-07)**
   - World voxel = `1.0 u`; Detail voxel = `0.125 u`. No pixel textures; greedy meshing with 4-level baked vertex AO and ±3% per-cell shader jitter.
   - Locked 48-color palette in `src/content/palette.json` calibrated to `docs/art/reference.png`, enforced by `npm run palette:lint`.
   - Zero bloom, lens flare, or backdrop-blur glassmorphism; emissives strictly capped at `<= 1.2x` albedo.

6. **Pre-Transaction SHA-256 & Web Locks Persistence**
   - `pycraft_db` (IndexedDB v1 via `idb` + `zod`) computes SHA-256 digests asynchronously in memory *before* opening `db.transaction(['slots', 'save_states'], 'readwrite')`.
   - Multi-tab contention guarded by `navigator.locks` with a `localStorage` heartbeat + `BroadcastChannel` fallback.

7. **R1 Scope & Pedagogy**
   - R1 ships strictly Adventure Mode (The Awakening, 7 islands, M1–M5 + Final Core Spire) with `CuratedMentorProvider` (100% offline Indonesian error translator + 4-rung hint ladder).
   - `farm.rows` and `farm.cols` expose integer dimensions in M4 (no tuple unpacking prior to R2 Data Valley).
   - Automation Mode, Creative Sandbox, and Challenge Mode render strictly as non-interactive `[Segera Hadir]` rows.
