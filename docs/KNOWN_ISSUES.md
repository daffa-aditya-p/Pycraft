# PYCRAFT — Known Issues & Mitigations

| ID | Area | Description | Mitigation / Status |
|---|---|---|---|
| `KI-01` | Audio | No external `.ogg`/`.mp3` files bundled in `public/audio/` initially | `src/audio/AudioManager.ts` synthesizes all SFX and ambient motifs procedurally via Web Audio API so audio works 100% offline with zero 404 errors. |
| `KI-02` | Fonts | System fallback fonts active if OFL `.woff2` files are not yet placed in `public/fonts/` | `index.html` and `tokens.css` include crisp geometric sans/mono fallbacks until optional `.woff2` binaries are added. |
| `KI-03` | Cross-Origin Isolation | Some school/proxy WebViews strip `COOP`/`COEP` headers | `RuntimeClient` automatically falls back to pre-run AST `input()` answer queues and `worker.terminate()` stop handling (`RC-05`). |
