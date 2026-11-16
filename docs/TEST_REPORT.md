# PYCRAFT — Test Report

**Environment:** Windows, Node.js v24.14.1, Vitest + Playwright

## Verification Runs

| Check | Command | Status | Scope / Notes |
|---|---|---|---|
| TypeScript check | `npm run typecheck` | Pending | To be run after foundation + module integration |
| ESLint & Boundaries | `npm run lint` | Pending | Enforces `src/sim`, `src/runtime/worker`, `src/persistence`, `src/ui` import rules |
| Palette Lint | `npm run palette:lint` | Pending | Validates 48-color `palette.json` + WCAG 2.1 AA contrast |
| Content Check | `npm run content:check` | Pending | Validates content manifests against Zod schemas |
| Unit & Integration Tests | `npm test` | Pending | Vitest suite (`tests/unit/**`, `tests/integration/**`) |
| E2E Browser Tests | `npm run test:e2e` | Pending | Playwright across Desktop, Tablet, Phone Portrait & Landscape |
