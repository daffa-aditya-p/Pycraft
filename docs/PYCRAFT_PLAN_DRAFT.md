# PYCRAFT — Master Implementation Plan
### "Code Your World." · Planning deliverable v1.0 · 2026-11-12

> [!IMPORTANT]
> This is a planning document only. The repository has not been modified, no dependencies were installed and no application code was written. Performance numbers below are **targets**, not measurements.

---

## What I understood about PYCRAFT

PYCRAFT is a **3D voxel adventure game that runs in the browser**. Writing real Python is how the player changes the world. The player is an **Architect** who wakes up in **Aetheria**, a group of floating islands. The world's machines stopped working when the ancient **Code Core** failed. With **NEO** (a companion robot who teaches) and a small builder robot they program, the player writes real Python (run by Pyodide in a Web Worker). That code moves robots, opens gates, plants farms and builds structures, and the results animate in the world. The game teaches beginners (ages 13–18, plus casual learners) from `print()` all the way to OOP. The player learns because they want to fix something in the game, not because a lesson tells them to. The first release is one polished region, **The Awakening**. It must play well on desktop and on mobile (both portrait and landscape), save locally to IndexedDB, and look like an art-directed indie game rather than a "gamified course" website.

---

## 1. Executive Summary

**What we build first (Release R1 = MVP):** a polished, complete Adventure Mode slice. It has a main menu that shows the live 3D world, three local save slots, The Awakening region (7 floating islands), the player, NEO, BIT (the robot you program), BOLT and two villagers, five learning missions plus a final Code Core challenge, real Python execution with execution visualization, a learning engine that adapts the level of help, a curated (non-AI) NEO mentor, XP, ranks and cosmetics, and IndexedDB saves with migrations, backups and export/import. It works with mouse and keyboard and with touch.

**The central technical bet (locked):** *simulate in the worker, replay on the main thread.*
Player code runs inside Pyodide in a dedicated Web Worker, against a deterministic TypeScript world simulation that lives in that same worker. Robot commands run synchronously against that simulation, so commands like `robot.front()` return real values right away, and loops and conditions work with no special handling. The worker streams a recorded event log (lines, variable changes, stdout, world actions with state changes) to the main thread. There, an **Action Player** animates the events at a speed the player chooses, and the rendering thread is never blocked. The main thread re-applies every action through its own copy of the same simulation, so it stays authoritative over world state. `input()` blocks for real through `SharedArrayBuffer` + `Atomics` when the page is cross-origin isolated. Otherwise it falls back to a list of answers the player fills in before running.

**Stack (locked):** Vite + React 19 + TypeScript (strict) · Three.js via React Three Fiber (only a few Drei helpers) · a custom voxel mesher and kinematic character controller (**no Rapier in MVP**) · Pyodide (self-hosted, pinned) in a Web Worker · CodeMirror 6 · Zustand · IndexedDB through `idb` with `zod` validation · Cloudflare Pages (+ Pages Functions later, for the AI proxy) · Vitest + Playwright.

### 1.1 Decision ledger

| Type | Item |
|---|---|
| **Locked decisions** | Greenfield Vite/React/TS app with npm in one package · R3F as the scene layer, but per-frame game logic in plain TypeScript systems (no React state updated per frame) · custom voxel engine (greedy meshing, baked vertex AO, color jitter in the shader) · two voxel scales only: **World voxel = 1.0 unit**, **Detail voxel = 0.125 unit** · no pixel textures (vertex colors from a locked palette) · no bloom, SSAO or lens effects · fixed late-morning time of day · simulate in the worker / replay on main · each run starts from the puzzle's initial state · conditional missions validated against several hidden scenarios · capability allowlist per mission · 3 save slots · global settings · UI language Bahasa Indonesia (default) + English; Python API identifiers in English · region unlock = previous region's Core challenge completed (mastery sets the level of help, never gates progress) · the title screen renders the real Awakening world (smooth hand-off into gameplay) · in-world dialogue camera instead of 2D portraits · Cloudflare Pages hosting with COOP/COEP headers |
| **Reasonable assumptions** | Indonesian is the main audience language (the brief asks for Indonesian error explanations) · the target is browsers released in the last ~3 years with WebGL2 · players have a connection for the first load (offline after that through the PWA cache) · MVP playtime is about 2–3 h (to be checked in playtests) · the implementer has no 3D artist, so all art comes from code and data (prefab JSON + an island generator), which is why the art bible is strict and enforced by lint |
| **External dependencies** | **The reference image was not found** in the message attachments or in `D:\Pycraft`. The art direction below is based on the written brief, and task T-ART-00 checks it against the image once the image is placed at `docs/art/reference.*` · Cloudflare account (hosting, later AI proxy and rate limiting) · an AI provider account and API key (R2) · CC0 or licensed sound effects and 2 music tracks · OFL fonts (Atkinson Hyperlegible Next, Barlow Semi Condensed, JetBrains Mono) · real test devices · 5–8 playtesters aged 13–18 (with guardian consent) |
| **Deferred functionality** | Remote LLM mentor (R2, the interface ships in R1) · key rebinding · gamepad · regions 2–8 · Automation, Creative Sandbox and Challenge modes (shown as "Segera Hadir", not playable) · cloud saves and accounts · teacher dashboard · WebGPU renderer · `.vox` import tooling |

---

## 2. Product Understanding and Design Principles

1. **Code is the verb.** Every coding task changes something you can see in the world. If a concept has no world effect, it is taught through an in-world device (rune pillars, signboards, the Beacon terminal), never through a bare quiz.
2. **Want first, learn second.** Each mission opens with a problem in the world (a dark beacon, a missing bridge, a locked gate) before NEO introduces the concept.
3. **Honest feedback.** The world shows exactly what the code did. A wrong program gives a visible, readable result (BIT bumps into a rock) instead of a silent failure.
4. **Help adapts to the person, not to the level number.** The amount of help follows measured performance, and the learner can always choose more or less help.
5. **No shame, no manipulation.** Hints never reduce base XP. There are no streaks, timers, loot boxes or push notifications, and nothing is lost by stepping away.
6. **Restraint is the art style.** A locked palette, two voxel scales, one sun, baked AO and minimal UI. Effects never stand in for composition.
7. **Mobile is first-class.** Every essential action works by touch in both portrait and landscape.
8. **Local-first and safe.** No account, saves stay on the device, failures are reported clearly, and the player's code is isolated in a worker.
9. **Build only what R1 needs, with seams for later.** Runtime, learning engine, saves and rendering are shared modules so future modes can reuse them, but nothing is built for those modes before they are needed.

---

## 3. Repository and Existing Stack Assessment

| Check | Finding (inspected 2026-11-12 21:02 local) |
|---|---|
| `D:\Pycraft` contents | **Empty directory** (created 2026-11-12 21:00:55). No source, config or assets. |
| Version control | **Not a git repository.** |
| Node.js / npm | v24.14.1 / 11.11.0 available |
| pnpm | Not installed |
| Host Python | 3.13.12 (useful for authoring scripts; **not** the game runtime) |
| Reference image | **Not present** in the workspace or the conversation |

**Conclusion:** this is a greenfield project, so there is no existing stack to keep. The stack is chosen on merit (Section 13). We use **npm** (already installed) rather than adding pnpm. A single package is enough for one web app plus a small `functions/` directory, and module boundaries are enforced by lint rules instead of a monorepo. The first task (T-00-01) runs `git init` and sets up the toolchain.

---

## 4. Product Scope and Explicit Non-Goals

**Priority meaning:** **P0** = must have for MVP Definition of Done · **P1** = in MVP scope and part of DoD unless explicitly descoped in writing · **P2** = only if time allows in the MVP window, otherwise R2.
**Release meaning:** **R1 MVP** (The Awakening) · **R2 Next** (Data Valley + Arithmetic Mines, remote AI mentor, rebinding) · **R3+ Future**.

| # | Feature from brief | Class | Priority / notes |
|---|---|---|---|
| 1 | Immersive start screen (live 3D world) | R1 | P0 |
| 2 | Continue / New Adventure with overwrite protection | R1 | P0 |
| 3 | Game Modes screen (Adventure available; 3 marked "Segera Hadir") | R1 | P0; future modes are non-interactive cards |
| 4 | World / Progress screen (regions, missions, learning) | R1 | P1 |
| 5 | Settings: audio, graphics, controls (view + sensitivity/invert), language, accessibility, save management | R1 | P0 (key rebinding → R2) |
| 6 | Fullscreen toggle (user-initiated) | R1 | P0 |
| 7 | PWA install + offline after first load | R1 | P1 |
| 8 | Awakening region (7 islands) | R1 | P0 |
| 9 | Regions 2–8 | R2 (2, 3), R3 (4–6), R4 (7, 8) | Visible on the world map as locked |
| 10 | Third-person + isometric cameras with transitions | R1 | P0 |
| 11 | Walk / jump / interact / collect resources | R1 | P0 |
| 12 | Desktop controls (WASD, mouse, scroll, keys) | R1 | P0 |
| 13 | Touch controls (joystick, contextual buttons, camera drag, pinch) | R1 | P0 |
| 14 | Gamepad | R3 | — |
| 15 | NEO, BIT, BOLT + villagers (Mira, Tamo) | R1 | P0 |
| 16 | The Guardian | R1 cameo (silhouette + voice text); full role R4 | — |
| 17 | Quest/objective system, dialogue | R1 | P0 |
| 18 | Real Python (Pyodide) in a worker + Game API | R1 | P0 |
| 19 | 5 missions + final Core challenge | R1 | P0 |
| 20 | Code editor (highlighting, autocomplete, line numbers, run/stop, console, reset, examples, hints) | R1 | P0 (autocomplete P1) |
| 21 | Visualization: line highlight, status, play/pause/stop, speed, step forward | R1 | P0 |
| 22 | Visualization: variable panel, loop counters, scrub/rewind | R1 | P1 |
| 23 | Function call stack view | R3 (Function Kingdom) | Trace already records call/return events |
| 24 | Learning engine: 4 assistance levels, mastery, adaptive offers | R1 | P0 (Mastery tier = optional bonus) |
| 25 | XP, ranks, skill tree, cosmetics, BIT customization, restoration | R1 | P0 (skill tree P1) |
| 26 | Curated NEO mentor (explain, error translation, hint ladder, Socratic prompts) | R1 | P0 |
| 27 | Remote LLM mentor through server proxy, limits, moderation | R2 | Interface and context builder in R1 |
| 28 | IndexedDB saves (all listed data), migrations, backups, status | R1 | P0 |
| 29 | Save export/import (JSON + checksum) | R1 | P1 |
| 30 | Multi-tab write protection (Web Locks) | R1 | P1 |
| 31 | Scratchpad (console-only Python anywhere) | R1 | P2 |
| 32 | Automation Mode / Creative Sandbox / Challenge Mode | R3+ | Not playable in R1 |
| 33 | Audio (SFX, 2 music tracks, ambience) | R1 | P1 |
| 34 | Adaptive graphics quality + FPS overlay | R1 | P0 |
| 35 | Lore notes (side collectibles, e.g. "What is Python") | R1 | P2 |

**Explicit non-goals for R1:** multiplayer or social features · accounts, cloud sync, any remote database · leaderboards · monetization · voice acting · procedurally generated infinite worlds · free-form AI chat · native app stores · a WebGPU renderer · user-generated content sharing · teacher/classroom dashboards · Python packages beyond the standard library (no `micropip`) · day/night cycle · combat.


---

## 5. Game Design Document

### 5.1 Identity
- **Genre:** third-person exploration and puzzle adventure where programming the robot is the main puzzle mechanic.
- **Fantasy:** "I am an Architect. My words (Python) bring machines and the world back to life."
- **Session shape:** missions take about 15–30 min each, with checkpoints after every step so a 5-minute mobile session still makes progress.
- **Fail states:** none that punish the player. Falling off an island fades out and respawns you at the last safe ground position. A bad program gives a visible result and an explanation, never a "game over".

### 5.2 Player verbs

| Verb | Desktop | Touch | Notes |
|---|---|---|---|
| Move | WASD / arrows | Left-side floating joystick | Walking speed 4.0 u/s; sprint ×1.6 (Shift / push joystick past 90%) |
| Jump | Space | Jump button | Apex 1.3 u, so the player can climb a 1-block step and never a 2-block one |
| Camera orbit | Hold RMB or LMB-drag on the world | One-finger drag on the right side | Optional pointer lock in settings |
| Zoom | Scroll | Pinch | Third-person distance 3–9 u; iso zoom 0.6×–1.6× |
| Interact / talk / collect | E | Contextual button with icon + label | Appears within 2.0 u of an interactable, with a highlight frame |
| Camera mode toggle | V | Camera button | Auto-switches to iso in puzzle zones (setting) |
| Iso rotate 90° | Z / C | Two-finger twist or ⟲⟳ buttons in iso mode | |
| Open editor | Tab | `</>` button | Allowed anywhere; Run needs a mission context (or Scratchpad, P2) |
| Run / Stop | Ctrl/Cmd+Enter / Ctrl+. | ▶ / ■ in editor | |
| Journal (quests, inventory, skills, profile) | J / I / K | Journal button in pause menu and HUD | |
| Map | M | Pause → Map | |
| Pause | Esc / P | ☰ button | Esc first closes the topmost panel |

While a text field or the editor has focus, the game ignores keyboard input. The editor never "steals" WASD and the game never steals typing.

### 5.3 Systems overview

| System | Responsibility | R1 |
|---|---|---|
| Exploration | Character controller, voxel collision, cameras, interactables | ✓ |
| Puzzle zones | Bounded grid areas where BIT runs code; they own a puzzle simulation | ✓ |
| Code runtime | Pyodide worker, Game API, tracing, limits | ✓ |
| Action playback | Animates the recorded event stream, timeline | ✓ |
| Quests and dialogue | Data-driven quest graph, dialogue trees, objective tracker | ✓ |
| Learning engine | Concepts, mastery, choosing the help level, validators | ✓ |
| Mentor | Curated hint ladder, error translation, concept cards (provider interface) | ✓ (curated) |
| Progression | XP, ranks, unlocks, cosmetics, restoration flags | ✓ |
| Inventory | Player items and resources; BIT's per-mission cargo | ✓ |
| Persistence | IndexedDB slots, autosave, backups | ✓ |
| Audio | SFX, music, ambience, ducking | ✓ |

### 5.4 Economy and rewards (no grinding)
- **XP** comes only from learning work: completing mission steps, bonus challenges and lore notes. You cannot farm it by repeating content (each step pays out once).
- **Ranks** (Indonesian / English): 1 Perintis / Initiate (0) · 2 Magang / Apprentice (250) · 3 Pembangun / Builder (600) · 4 Insinyur / Engineer (1,200) · 5 Perajin / Artisan (2,200) · 6 Ahli / Master (3,600) · 7 Arsitek Agung / Grand Architect (5,500). R1 offers about 1,650 XP, so a full playthrough reaches **Engineer**.
- **Cosmetics** are unlocked by milestones, never sold: BIT paint (Moss, Clay, Slate, Sky), BIT accessories (Lantern, Antenna Flag), NEO visor tints (Turquoise, Amber), Architect scarf colors.
- **Restoration:** each completed mission visibly heals part of the region (Section 6.3). This is the main reward.

---

## 6. World and Narrative Design

### 6.1 Premise
Long ago the Architects wrote the **Code Core**, a lattice of instructions that kept Aetheria's islands afloat and its machines running. The Core cracked during the **Silence**. Machines forgot their instructions, beacons went dark, rivers stalled and bridges fell. The player wakes in a stasis shrine as the last Architect. Their memory of the old language is empty, and NEO's memory is fragmented. **They relearn Python together.** This is why NEO teaches as a fellow rediscoverer and not as a lecturer.

### 6.2 Aetheria layout (all regions)
The islands form a **rising spiral around the Core Citadel**, a huge cracked stone monolith with turquoise veins that floats at the center and above everything. It can be seen from every region, so players always know where the story ends. Each restored region rebuilds a **Skybridge** to the next one.

```mermaid
flowchart LR
  A["1 The Awakening (R1)"] -->|"Skybridge restored by Core Shard"| B["2 Data Valley (R2)"]
  B --> C["3 Arithmetic Mines (R2)"]
  C --> D["4 Logic Fortress (R3)"]
  D --> E["5 Automation Forest (R3)"]
  E --> F["6 Function Kingdom (R3)"]
  F --> G["7 Object Realm (R4)"]
  G --> H["8 Core Citadel (R4)"]
```

| # | Region | Theme and environmental storytelling | Landmarks | NPCs | Concepts | Unlock |
|---|---|---|---|---|---|---|
| 1 | **The Awakening** | Gentle grassy islands with Architect ruins. Dormant beacons, a dry waterfall and a collapsed bridge show that the Silence happened recently. | Stasis Shrine, Beacon Point, Supply Grove, Gatehouse, Terrace Farm & waterfall, BOLT's Workshop, Core Shard Spire | NEO, BIT, BOLT, Mira (farmer), Old Tamo (gatekeeper), Guardian (vision) | Fundamentals + first taste of variables, conditions, loops, functions | New game |
| 2 | **Data Valley** | A broad river valley with stone archive terraces. Crystals lie scattered and unsorted, cataloguing automatons hold mislabeled crates. | The Great Archive, Crystal Shelves, River Index Mill | Archivist Sela, cataloguer bots | Data types, strings, lists, tuples, sets, dicts, objects intro | Awakening Core Shard |
| 3 | **Arithmetic Mines** | Underneath a massive island: shafts carved into the stone layer, warm lamps, mine-cart rails. Lifts are stuck because their counterweights were miscalculated. | Counterweight Lift, Ore Splitter, Deep Furnace | Foreman Rukun, miner bots | Arithmetic, assignment, precedence, `math` | Data Valley Core |
| 4 | **Logic Fortress** | A walled fortress on a cliff island. Guard automatons are frozen at gates, unable to decide. Banners show rival rules. | Three-Banner Gate, Rune Hall, Inner Keep | Captain Varo, guard automatons | Comparison, logic, if/elif/else, nesting, truthiness | Mines Core |
| 5 | **Automation Forest** | A deep forest overgrowing BOLT's old sawmills, with idle water wheels and stopped conveyors. | Great Sawmill, Seed Nursery, Pressure Tower | **BOLT** (hub), lumber bots | for, while, range, break/continue, nested loops | Fortress Core |
| 6 | **Function Kingdom** | A guild town whose blueprint library burned. Citizens rebuild by hand, over and over. | Blueprint Library, Guild Halls, Castle Walls | Queen Ilsa, guild masters | def, params/args, return, scope, nested functions, modules, try/except | Forest Core |
| 7 | **Object Realm** | An ancient bronze robot foundry with robot "families" sorted by lineage. | Foundry, Hall of Lineage, Sealed Vault | Forgemaster Odo, robot families | Classes, objects, methods, `__init__`, inheritance, encapsulation, polymorphism | Kingdom Core |
| 8 | **Core Citadel** | The monolith itself, inside the Code Core lattice. | Guardian's Hall, Trial Platforms, Core Heart | **THE GUARDIAN**, NEO, BOLT | Integration capstone | Object Realm Core |

### 6.3 The Awakening — detailed design (R1)
**Footprint:** about 160 × 160 units across X and Z, with heights from −40 (island undersides) to +45 (spire top). There are seven islands. Distant regions show up as low-detail silhouettes in the haze.

```mermaid
flowchart LR
  S["A Stasis Shrine (spawn)"] -->|"land path"| B["B Beacon Point · M1"]
  B -->|"bridge path lights after M1"| G["C Supply Grove · M2"]
  G -->|"plank bridge built in M2"| H["D Gatehouse Rock · M3"]
  H -->|"double gate opens in M3"| F["E Terrace Farm · M4"]
  F -->|"water-wheel lift powered in M4"| W["F BOLT's Workshop · M5"]
  W -->|"watchtower stairs built in M5"| C["G Core Shard Spire · Final"]
```

| Island | Composition and storytelling | Interactables | Dormant → Restored |
|---|---|---|---|
| **A Stasis Shrine** | A small round island. The player wakes in a cracked stone pod. NEO lies dormant on a pedestal. Teaches movement by moving the player along the path. | Pod, NEO pedestal (reboot), lore note | Gray-olive grass → fresh grass and a few flowers |
| **B Beacon Point** | A cliff edge with an old stone beacon and a terminal facing the sea of sky. | Beacon Terminal (code), signpost | Dark beacon → warm amber lamp; signpost shows player text |
| **C Supply Grove** | A wooded island with scattered crates and blue crystal clusters. BIT lies switched off under a tree, with BOLT's note. | 3 crystals (manual collection), BIT, crates, bridge anchor | Bridge gap → plank bridge |
| **D Gatehouse Rock** | Fortified rock. A double gate with rune pillars, a crystal sensor and a weight scale. Old Tamo waits on a bench. | Rune pillars, sensor, scale, gate | Red-sealed gate → open; rune pillars lit |
| **E Terrace Farm** | Three-level terraces fed by a dry waterfall, a stalled water wheel and empty fields. Mira's house. | Farm rows, water wheel, lift | Still pond → flowing turquoise waterfall, growing crops, turning wheel |
| **F BOLT's Workshop** | Workshop with a crane, block depot and an unfinished watchtower foundation. | Depot, blueprint table, tower site | Foundation → finished watchtower with stairs |
| **G Core Shard Spire** | The highest island. A cracked shard on an altar, with energy-cell sockets. | Cells, altar, stairs zone | Cracked, dim veins → restored shard; Guardian vision; distant Skybridge appears |

**Restoration rendering:** each island zone has a `restoration` uniform (0 → 1) that blends between a dormant and a restored palette per material class, toggles prop sets (flowers, crops, water), and turns on water flow. The state comes from quest flags, so no voxel data needs to be saved.

### 6.4 Characters

| Character | Role and personality | Visual spec (Detail voxels, 0.125 u) | Voice and dialogue rules |
|---|---|---|---|
| **Architect** (player) | The player's silent avatar. A capable newcomer. | 14 voxels tall (1.75 u). Chunky proportions (head 4×4×4). Customizable: 6 skin tones, 4 hair styles, 6 hair colors, 6 scarf/outfit accent colors. Neutral work clothes in muted canvas and brown leather. | Has no lines. The player picks short replies (2–3 options) |
| **NEO** | Companion and teacher. Curious, warm, lightly dry humor. Admits gaps ("Memoriku tentang ini masih rusak — ayo kita uji"). Never condescending. | Floating drone, about 0.6 u. Off-white ceramic shell, a turquoise visor bar showing 8 eye shapes (neutral, happy, thinking, surprised, concerned, focused, proud, sleepy), brass trim, a short antenna. Bobs 4 cm over a 2.4 s cycle. | Each bubble is at most 140 characters. Every 2–4 lines ends with a question or action. Explains with one concrete in-world example first and the term second |
| **BIT** | The robot you program. Earnest and slightly clumsy. | 1×1 u footprint, 0.8 u tall. Moss-green body, brass treads, a front scanner lens, a small crane arm. Paint is customizable. | Does not speak. Beeps and tilts its lens; `robot.say()` shows speech bubbles |
| **BOLT** | Engineer and automation enthusiast. Fast-talking, practical, hates manual repetition. | Stocky adult human, 15 voxels tall. Leather apron, copper goggles, rolled sleeves, tool belt, gray-streaked beard. | Short, energetic lines with workshop metaphors ("Kenapa ulang 100 kali kalau bisa tulis loop?") |
| **Mira** | Farmer. Patient and practical. | 14 voxels. Straw hat, olive dress, basket. | Grounded farming language |
| **Old Tamo** | Gatekeeper and historian. Slow-spoken and fond of riddles. | 13 voxels. Hunched, blue-gray robe, staff. | Short lines; introduces True/False as "rune truths" |
| **THE GUARDIAN** | Ancient keeper of the Core. Formal, solemn, fair. | Huge stone and bronze colossus built from World voxels, turquoise veins (not glowing). R1 shows it only as a distant silhouette in a vision. | Speaks in formal Indonesian; 3 lines in R1 |

### 6.5 Narrative beats for The Awakening

| Beat | Event | Gameplay purpose |
|---|---|---|
| 0 Wake | Pod opens. Camera pulls back from a close shot to third-person. | Movement tutorial (contextual prompts) |
| 1 Reboot NEO | Interact with the pedestal. NEO boots with a broken voice module (text appears garbled). | First interaction |
| 2 M1 Hello Architect | The Beacon Terminal accepts commands. Each `print` restores a piece of NEO's voice. | print, comments, escapes, input |
| 3 Find BIT | BOLT's note: "BIT's power is low; find blue crystals." | Exploration and manual collection |
| 4 M2 Data Collector | BIT scans, measures and builds the bridge. | Variables, types, conversion |
| 5 M3 The Locked Gate | Old Tamo's rune truths; the gate obeys logic. | Comparison and conditions |
| 6 M4 Automated Farm | Mira's fields; BOLT on the radio mocks planting by hand. | Loops |
| 7 M5 The Blueprint | BOLT's workshop; reusable building recipes. | Functions |
| 8 Core Shard | All skills combined. The shard restarts, the Guardian's vision speaks of 7 more shards, and the Skybridge outline appears. | Integration; region end |
| 9 Epilogue | NEO: "Lembah Data menunggu…" The world map shows Data Valley as coming in a future update. | Honest R1 end; free roaming continues |

---

## 7. Core Gameplay Loop

```mermaid
flowchart LR
  E["Explore and discover a broken system"] --> T["Talk: NEO or NPC frames the problem"]
  T --> L["Learn: 30–60 s concept intro with a live example"]
  L --> C["Code in the editor at the chosen help level"]
  C --> R["Run: BIT acts in the world (replay)"]
  R -->|"wrong result or error"| D["Debug: friendly error, hint ladder, timeline"]
  D --> C
  R -->|"goal met in all scenarios"| W["World restores, XP, mastery update"]
  W --> E
```

- **Micro loop (30–120 s):** edit → run → watch → adjust. The run button gives a response within 100 ms (the status changes to "Berjalan") and the first action animates within 500 ms of pressing Run (target, with the runtime warm).
- **Mission loop (15–30 min):** 3–5 steps, each with a checkpoint save.
- **Region loop (about 2–3 h for The Awakening):** 5 missions → Core Shard → restoration and a new route.
- **Free exploration:** the player can walk, collect and examine at any time. The editor never blocks movement (on desktop the editor docks beside the world; on mobile the sheet collapses).

---

## 8. Complete Python Curriculum Mapping

### 8.1 Structure
- **Knowledge Components (KCs)** are the smallest units we track for mastery. Each has an ID, prerequisites, and 1–3 places in the game where it is practiced.
- **Tiers:** **T1 = first taste** (The Awakening introduces variables, `if`, `for` and `def` in a simple form so the vertical slice proves every core mechanic). **T2 = deep dive** in the concept's home region. Mastery is tracked for each KC, and a KC's T1 evidence counts toward T2.
- **Language:** explanations are in Bahasa Indonesia, code identifiers are English or Indonesian (players choose), and the API is English.
- **Mastery criteria** use the mastery score in Section 16 (0–100). "Mastered" means score ≥ 85 **and** ≥ 2 passes at Independent level in **different contexts**.

```mermaid
flowchart TD
  F["Fundamentals F1–F8"] --> D["Data D1–D14"]
  F --> O["Operators O1–O7"]
  D --> O
  O --> B["Conditions B1–B8"]
  B --> L["Loops L1–L8"]
  L --> N["Functions N1–N9"]
  N --> P["OOP P1–P9"]
  P --> X["Core Citadel integration X1–X3"]
```

The fields for each concept are: **Obj** objectives · **Pre** prerequisites · **Explain** practical explanation · **Game** in-game application · **Example** interactive example · **Guided** · **Indep** independent exercise · **Mastery**.

### 8.2 Region 1 — The Awakening: Fundamentals (R1, T2 for F1–F8, T1 for V/B/L/N)

**F1 What Python is / running a program** — Obj: say what a program is, run one, and read its output · Pre: none · Explain: "A program is a list of instructions run from top to bottom; Python is a language people and machines both understand" · Game: the Beacon Terminal only obeys the Architects' language · Example: NEO runs `print("NEO online")` and the terminal flickers · Guided: press Run on prepared code · Indep: change the message and run it · Mastery: runs code with no prompt in 2 missions.

**F2 `print()`** — Obj: print text and numbers, including several values separated by commas · Pre: F1 · Explain: print shows a value on the console or terminal screen · Game: each print restores a piece of NEO's voice and appears on the Beacon screen · Example: `print("Halo, Aetheria!")` · Guided: `print("___")` fill-in · Indep: print NEO's 3-line boot checklist in order · Mastery: correct output in 3 different steps without hints.

**F3 String literals (basics)** — Obj: quote text, and tell `"5"` apart from `5` · Pre: F2 · Explain: quotes mark text so Python doesn't treat it as a command or name · Game: signpost text · Example: `print("5" + "5")` vs `print(5 + 5)` · Guided: fix a missing quote (SyntaxError translated) · Indep: write a signpost message · Mastery: no quote-related SyntaxErrors across 2 consecutive steps.

**F4 Comments** — Obj: write comments and disable lines with `#` · Pre: F2 · Explain: Python skips everything after `#` on a line; it is for humans · Game: "Architect's notes". Commenting out faulty commands stops the beacon from flashing red · Example: a program with 2 faulty lines · Guided: add `#` before the marked lines · Indep: find and comment out the faulty lines on your own (unmarked) · Mastery: completes step 1.3 at Independent level.

**F5 Escape characters and newlines** — Obj: use `\n`, `\t`, `\"` and `\\` · Pre: F3 · Explain: a backslash gives the next character a special meaning · Game: multi-line wooden signpost from a single `print` · Example: `print("Jembatan\nRusak")` shows two sign lines · Guided: insert `\n` at the marked places · Indep: a 3-line sign containing a quote, written with one `print` · Mastery: passes step 1.4 at Independent level, plus a bonus banner using `\t`.

**F6 `input()`** — Obj: read user text into a variable and know it is always a `str` · Pre: F2, V1 (T1) · Explain: the program pauses and waits for an answer · Game: the Beacon asks your name and engraves it · Example: `nama = input("Siapa namamu? ")` · Guided: fill in the prompt and print a greeting · Indep: a greeting that uses the name twice · Mastery: passes all hidden input scenarios (scripted names).

**F7 Program structure and order** — Obj: predict top-to-bottom execution order and see that indentation matters · Pre: F2 · Explain: Python runs each line in order; indentation groups lines (previewed here) · Game: NEO's boot checklist must come out in the right order · Example: swap 2 lines and watch the beacon order change · Guided: reorder lines by drag on touch, or cut/paste · Indep: write the sequence from scratch · Mastery: correct order on the first run in 2 steps.

**F8 Reading errors (additional topic)** — Obj: find the error line, error type and meaning · Pre: F2 · Explain: an error is a message from Python, not a failure on your part · Game: NEO translates the "machine complaints" · Example: a deliberate `pritn("hi")` → NameError with "Mungkin maksudmu print?" · Guided: fix 2 seeded errors · Indep: fix an unmarked error · Mastery: fixes 3 different error types, each within ≤ 2 runs.

**V1 Variables (T1)**, **B1 `if` (T1)**, **L1 `for`/`range` (T1)**, **N1 `def` (T1)**: introduced in M2–M5 (Section 9) with the same 8 fields as their T2 entries below. T1 mastery is capped at 60 (Independent) until the T2 region.

### 8.3 Region 2 — Data Valley: Variables and Data Types (R2)

**D1 Variables** — Obj: assign, reassign, name well, and say what a name points to · Pre: F2 · Explain: a variable is a labeled box holding a value; `=` puts something in the box · Game: cataloguing bots remember crate counts in labeled boxes · Example: `kayu = 4` then `kayu = kayu + 1` with the variable panel animating · Guided: fill in names and values · Indep: track 3 crate counts as items arrive · Mastery: the variable panel shows the expected final values in 3 scenarios.

**D2 `int`** — Obj: use whole numbers in counting and arithmetic · Pre: D1 · Explain: whole numbers for counting things · Game: crystal counts, step counts · Example: `jumlah = 12` · Guided: count crystals with BIT · Indep: compute the shelf capacity · Mastery: correct across scenarios.

**D3 `float`** — Obj: use decimals and know that `/` returns a float · Pre: D2 · Explain: numbers with a decimal point, for measurements · Game: crate weights (2.5 kg) on the river barge · Example: `berat = 2.5 * 4` · Guided: compute the barge load · Indep: is the load ≤ capacity? (prints the value) · Mastery: no int/float confusion errors in 2 steps.

**D4 `str` (deep)** — Obj: concatenation, `len`, indexing, slicing, `upper`/`lower`/`strip`/`replace`, f-strings · Pre: F3, D1 · Explain: text is a sequence of characters you can measure and slice · Game: repairing mislabeled archive labels · Example: `label.upper()`, `label[0:3]`, `f"Rak {n}"` · Guided: fix labels with the given methods · Indep: normalize 5 messy labels · Mastery: all hidden labels are normalized.

**D5 `bool`** — Obj: `True`/`False` as values; `bool()` · Pre: D1 · Explain: a yes/no value · Game: shelf lamps on/off · Example: `lampu = True` · Guided: set lamp states · Indep: store `robot.can_move()` and display it · Mastery: correct in 2 contexts.

**D6 `type()` and type conversion** — Obj: inspect types; `int()`, `float()`, `str()`; meaning of ValueError · Pre: D2–D5 · Explain: values have kinds and you can convert between some of them · Game: scanned labels are text ("12") and must be converted to count · Example: `int("12") + 3` · Guided: fix a TypeError · Indep: sum 3 scanned labels · Mastery: passes in 3 scenarios, including non-numeric label handling (R2 uses `isdigit()`).

**D7 `None` (additional)** — Obj: understand "no value" · Pre: D1 · Game: empty crate slots return `None` · Example: `robot.scan()` on an empty cell · Guided/Indep: check for an empty slot before collecting · Mastery: handles the empty case in hidden scenarios.

**D8 Lists** — Obj: create, index, `append`, `remove`, `len`, `in`, iterate (preview) · Pre: D1 · Explain: an ordered row of boxes · Game: crystal shelves, where each slot is a list index · Example: `rak = ["biru", "merah"]`; `rak.append("hijau")` with the shelf filling up · Guided: place crystals by index · Indep: reorder a shelf to match the catalog · Mastery: final shelf state matches in all scenarios.

**D9 List methods and slicing (additional)** — Obj: `sort`, `pop`, `insert`, slicing · Pre: D8 · Game: sorting mill · Mastery: sorts 3 random shelves.

**D10 Tuples** — Obj: immutable sequences, unpacking · Pre: D8 · Explain: a fixed pair or group that cannot change · Game: carved stone coordinates `(x, y)`; `robot.position()` returns a tuple · Example: `x, y = robot.position()` · Guided: unpack and print · Indep: navigate to a coordinate given as a tuple · Mastery: hidden coordinates reached.

**D11 Sets** — Obj: unique items, membership, union and intersection · Pre: D8 · Explain: a bag with no duplicates · Game: a seed vault that must hold one of each seed type · Example: `set(["a","a","b"])` · Guided: remove duplicates · Indep: find the seeds missing from the vault · Mastery: correct set results in 3 scenarios.

**D12 Dictionaries** — Obj: key→value, get/set, `in`, `.items()`, `.get()` · Pre: D8 · Explain: a labeled drawer cabinet · Game: the Great Archive catalog; `robot.inventory()` returns a dict · Example: `katalog["biru"] = 3` · Guided: update counts · Indep: build an inventory report from scans · Mastery: catalog matches the world in all scenarios.

**D13 Objects (intro)** — Obj: "everything is an object"; attributes and methods with dot notation · Pre: D4, D8 · Explain: values carry data and abilities; `robot` is an object and `.move` is one of its abilities · Game: inspecting archive automatons · Example: `type(robot)`, `"abc".upper()` · Guided: call 3 methods on different objects · Indep: explain the dot notation in a NEO quiz-dialogue (applied, not abstract) · Mastery: correct method calls in 2 contexts. Full depth in Object Realm.

**D14 Mutability (additional)** — Obj: lists change, strings and tuples don't · Pre: D4, D8, D10 · Game: "living" vs "carved" labels · Mastery: predicts the outcome in 3 trace challenges.

### 8.4 Region 3 — Arithmetic Mines: Operators (R2)

**O1 Arithmetic `+ - * /`** — Obj: compute with variables · Pre: D2, D3 · Explain: math with names · Game: cart loads, counterweights · Example: `muatan = gerobak * 4` · Guided: fill in the operator · Indep: balance the lift · Mastery: lift balanced in 3 scenarios.
**O2 `//` and `%`** — Obj: floor division and remainder · Pre: O1 · Game: the ore splitter divides ore into crates; the remainder goes to the scrap bin · Example: `17 // 5`, `17 % 5` · Guided/Indep: fill crates exactly; alternate rails every 2nd cart with `%` · Mastery: correct crate and remainder counts in hidden scenarios.
**O3 `**`** — Obj: powers · Pre: O1 · Game: crystal power grows by squaring · Mastery: correct power values.
**O4 Assignment operators `+= -= *= /=`** — Obj: running totals · Pre: O1, D1 · Game: the mine counter totals ore as carts pass · Example: `total += 3` in the variable panel · Guided/Indep: total tracking across trips · Mastery: totals correct.
**O5 Comparison operators (T1 here, T2 in Fortress)** — Obj: `== != < > <= >=` return bool · Pre: D5 · Game: the safety gauge checks if load ≤ limit · Mastery: correct results in runes.
**O6 Operator precedence** — Obj: predict evaluation order; use parentheses · Pre: O1–O4 · Explain: multiplication before addition, like in school math; parentheses go first · Game: a blasting sequence where the wrong order blows the wrong wall (visual only) · Example: `2 + 3 * 4` vs `(2 + 3) * 4` · Guided: add parentheses · Indep: write a formula from a blueprint · Mastery: 3 formulas correct first try.
**O7 `math` module, `round`, `abs` (additional)** — Obj: import and use helpers · Pre: O1 · Game: surveyor tools · Mastery: correct use in 2 tasks.

### 8.5 Region 4 — Logic Fortress: Conditions (R3; T1 in Awakening M3)

**B1 Comparison → bool** — Obj: evaluate comparisons · Pre: D5 · Explain: a question that Python answers True/False · Game: rune pillars light green or red · Example: `print(5 > 3)` · Guided: predict, then run · Indep: write comparisons for 4 rune riddles · Mastery: 4/4 correct.
**B2 `if`** — Obj: run a block only when a condition is true; indentation · Pre: B1, F7 · Explain: "if this is true, do this block" · Game: the gate opens only for blue crystals · Example: `if warna == "blue": gate.open()` · Guided: fill in the condition · Indep: write the full `if` · Mastery: correct in all scenarios (blue and not blue).
**B3 `else`** — Obj: the alternative branch · Pre: B2 · Game: the gate shows a red light when access is denied · Mastery: all scenarios correct.
**B4 `elif`** — Obj: several exclusive branches, checked in order · Pre: B3 · Game: three crystal colors, three responses · Example: 3-branch sorting · Guided/Indep: as in M3.4 · Mastery: all 3+ scenarios, with branch order understood (a trap scenario where order matters).
**B5 `and`** / **B6 `or`** / **B7 `not`** — Obj: combine conditions; truth tables · Pre: B2 · Explain: "both", "either", "opposite" · Game: double-lock gate (crystal and weight); an alternative key (`or`); "not raining" banners · Example: `warna == "blue" and beban >= 2` · Guided: choose the operator · Indep: write the combined lock · Mastery: all 4 truth-table scenarios pass.
**B8 Nested conditionals and truthiness** — Obj: put `if` inside `if`; flatten with `and`; know that empty string, 0 and an empty list are falsy · Pre: B4–B7 · Game: Inner Keep checkpoints · Mastery: nested and flattened versions both pass hidden scenarios.

### 8.6 Region 5 — Automation Forest: Loops (R3; T1 in Awakening M4)

**L1 `for` + `range()`** — Obj: repeat N times; `range(n)`, `range(a, b)`, `range(a, b, step)`; the loop variable · Pre: F7, D2 · Explain: "do this block for each number in the range" · Game: planting a row of seeds · Example: `for i in range(5): robot.plant("wheat")` · Guided: fill in the count · Indep: plant rows of varying lengths · Mastery: all rows correct with ≤ 4 lines of code.
**L2 `for` over lists / strings** — Obj: iterate over collections · Pre: L1, D8 · Game: the lumber queue processes a list of logs · Mastery: processes hidden lists.
**L3 `while`** — Obj: repeat while a condition holds; avoid infinite loops · Pre: L1, B2 · Explain: "keep going as long as…" · Game: steam pressure rises until the gauge is safe; `while robot.can_move()` · Example: the variable panel shows the condition each iteration · Guided/Indep: rows of unknown length · Mastery: passes variable-length scenarios with no limit breaches.
**L4 `break`** — Obj: exit early · Pre: L3 · Game: the emergency valve stops the conveyor when a fault appears · Mastery: stops at the fault in all scenarios.
**L5 `continue`** — Obj: skip an iteration · Pre: L1, B2 · Game: skip bad saplings (rocks) without stopping · Mastery: all good cells planted, rocks skipped.
**L6 Nested loops** — Obj: loops inside loops; 2D grids · Pre: L1 · Explain: rows × columns · Game: orchard grids, building walls · Example: a 3×5 field · Guided: fill in the inner range · Indep: build a W×H wall from a blueprint · Mastery: correct grids across 3 sizes.
**L7 Accumulators and counters** — Obj: build totals in loops · Pre: L1, O4 · Game: sawmill output totals · Mastery: correct totals.
**L8 `enumerate` / `zip` (additional)** — Obj: index and value together · Pre: L2 · Game: numbered crates · Mastery: correct labels.

### 8.7 Region 6 — Function Kingdom: Functions (R3; T1 in Awakening M5)

**N1 `def` and calling** — Obj: define once, call many times; defining doesn't run the body · Pre: F7, L1 · Explain: a recipe you write once and use often · Game: guild "recipes" build structures · Example: `def pasang_tiang(): ...` called twice → two pillars · Guided: fill in the call · Indep: define and call to build 2 pillars · Mastery: passes 2 build contexts.
**N2 Parameters and arguments (positional)** — Obj: pass values into functions · Pre: N1 · Game: pillar height as a parameter · Example: `pasang_tiang(4)` · Mastery: varied heights correct.
**N3 Keyword and default arguments** — Obj: `f(tinggi=3)`, defaults · Pre: N2 · Game: guild order forms · Mastery: hidden calls with defaults are correct.
**N4 `return`** — Obj: functions that produce values; return vs print · Pre: N2 · Explain: the function hands back an answer · Game: the treasury calculator returns block counts; the depot gives exactly that many · Example: `return lebar * tinggi` · Guided: fill in the return · Indep: write the calculator; the validator calls it with hidden arguments · Mastery: function tests pass (returns, not prints).
**N5 Local vs global scope** — Obj: variables inside functions are local; when `global` is needed · Pre: N4 · Game: castle walls, where what happens inside the walls stays inside · Example: the variable panel shows frames · Mastery: predicts outputs in 3 scope puzzles.
**N6 Nested functions** — Obj: helper functions defined inside functions · Pre: N5 · Game: a workshop inside a workshop · Mastery: correct structure and output.
**N7 Docstrings and naming (additional)** — Obj: document intent · Pre: N1 · Game: library cards · Mastery: lint check plus a reviewer prompt.
**N8 Modules and `import`** — Obj: use `math`/`random` and in-game blueprint modules (`from blueprints import tower`) · Pre: N4 · Game: the Blueprint Library · Mastery: uses module functions correctly.
**N9 `try`/`except` (additional)** — Obj: handle errors gracefully · Pre: N4, D6 · Game: safe machines that don't crash when a scan fails · Mastery: hidden error scenarios handled.

### 8.8 Region 7 — Object Realm: OOP (R4)

**P1 Classes and objects** — Obj: define a class, create instances · Pre: N1–N4, D13 · Explain: a class is a robot blueprint; objects are the robots built from it · Game: the Foundry produces robots from your class · Example: `class Pekerja:` then `a = Pekerja()` spawns a bot · Guided/Indep: build 2 bots from 1 class · Mastery: 2+ instances working.
**P2 Attributes** — Obj: per-object data · Pre: P1 · Game: spec sheets (color, speed) change bot looks and speed · Mastery: correct attributes on hidden instances.
**P3 Methods and `self`** — Obj: behavior bound to objects · Pre: P2 · Game: `bot.kerja()` performs a task · Mastery: methods act on the correct instance.
**P4 Constructor `__init__`** — Obj: initialize state · Pre: P2 · Game: assembly-line parameters · Mastery: hidden constructor calls produce the correct state.
**P5 Inheritance and `super()`** — Obj: specialize classes · Pre: P4 · Game: robot families, e.g. a Miner inherits from Worker · Mastery: subclass behaves correctly and reuses parent behavior.
**P6 Encapsulation** — Obj: `_private` convention, properties, validation · Pre: P4 · Game: sealed cores that reject invalid energy values · Mastery: invalid values rejected in hidden tests.
**P7 Polymorphism** — Obj: same method name, different behavior; duck typing · Pre: P5 · Game: one loop tells a mixed squad to `.kerja()` · Mastery: mixed-squad scenario correct.
**P8 `__str__` (additional)** — Obj: readable objects · Pre: P3 · Game: robot status plaques · Mastery: correct strings.
**P9 Composition (additional)** — Obj: objects containing objects · Pre: P4 · Game: a squad holds a list of robots · Mastery: squad operations correct.

### 8.9 Region 8 — Core Citadel: Integration (R4)
**X1 Decomposition** (split a problem into functions/classes) · **X2 Debugging strategy** (read trace, isolate, test) · **X3 Autonomous system design** (sense → decide → act loops with objects). The Guardian's trials revisit every region with one integrated, multi-scenario challenge each, plus a final open-ended "Rebuild the Core" task judged by goal predicates rather than one fixed solution. Mastery: all trials pass at Independent level.

### 8.10 Concept → mechanic coverage check
Every KC above has a world device listed under **Game**. No KC is assessed only by a multiple-choice quiz. Dialogue questions only *supplement* code evidence (weight in Section 16).

---

## 9. Quest and Mission Specifications

### 9.1 Quest model (applies to all regions)
- **Quest:** a narrative container, with states `locked → available → active → completed`.
- **Objective types:** `talk_to(npc)`, `go_to(zone)`, `interact(id)`, `collect(item, n)`, `code_step(missionId, stepId)`, `cutscene(id)`.
- **Mission:** a quest made of `code_step` objectives that share one **Mission Manifest**: id, KCs, granted capabilities (allowlist of Python names), puzzle zone, initial puzzle state, **scenarios** (1 visible plus 0–3 hidden), steps, rewards.
- **Step definition:** lesson card(s) · starter code for **Guided / Assisted / Independent** · validator (world predicates + stdout predicates + AST requirements + function tests) · 4-rung hint ladder · error-catalog overrides · XP · checkpoint flag.
- **Validation rule:** a step passes only when **every** scenario passes. The visible scenario is animated. Hidden scenarios run headless right after it, and the results show as "Skenario 3/3 ✓". AST requirements are always shown to the learner up front (for example, "Gunakan perulangan `for`").
- **Each run starts from the step's initial puzzle state.** If the visible world is not in that state, a 300 ms reset animation plays first.

### 9.2 The Awakening missions (R1)

#### Prologue — "Bangun" (non-code, ~4 min)
Wake → movement prompts → jump a 1-block ledge → interact with NEO's pedestal → NEO reboots with garbled text → `go_to(Beacon Point)`. XP 0. The objective tracker appears.

#### M1 Hello Architect — Beacon Point · KCs F1–F8 (+V1 preview) · Capabilities: `print`, `input` · XP 150 (+50 bonus)

| Step | Goal | Guided starter | Validator | World reaction |
|---|---|---|---|---|
| 1.1 Suara Pertama | Print any message | `print("___")` | stdout has ≥ 1 non-empty line | Beacon screen shows the text; first lamp segment lights |
| 1.2 Pesan untuk NEO | Print 3 boot lines in order ("Sistem suara", "Sistem memori", "Siap") | 3 prints with blanks | Lines contain the tokens in order (case/space-insensitive) | NEO's text becomes legible, line by line |
| 1.3 Catatan Arsitek | Comment out 2 faulty lines (`beacon_flash_red()` style text prints) | Faulty lines marked with ⚠ | stdout excludes the faulty text; AST: ≥ 1 comment | Beacon stops flashing red |
| 1.4 Papan Tanda | 3-line sign containing a quote, using **one** `print` | `print("Jembatan___Rusak___")` | 3 stdout lines; contains `"`; AST: exactly 1 print call | Wooden sign shows 3 lines |
| 1.5 Siapa Namamu? | Ask for the name with `input()` and greet using it | `nama = input("___")` + greeting | Hidden scripted inputs ("Rara", "Budi Santoso"); stdout contains the input | Name engraved on the beacon; beacon fully lit; path to Supply Grove lights up; **NEO's voice restored** |
| Bonus | 3+ line ASCII banner with `\n` and `\t` in one print | — | 3+ lines; contains a tab; 1 print | Banner shows on the beacon; cosmetic: NEO amber visor |

Hint ladder example (1.4): H1 "Bagaimana Python tahu kamu ingin baris baru, bukan huruf n?" → H2 highlights the place where the break goes → H3 `print("Jembatan\nRusak\n…")` with blanks → H4 a worked solution with explanation (needs confirmation; marks the step as "assisted").

#### Interlude — "Mencari BIT" (non-code) · `collect(blue_crystal, 3)` around Supply Grove → interact with BIT → BOLT's note (voice text). Teaches manual collection and the inventory.

#### M2 Data Collector — Supply Grove · KCs V1 (T1), D2, D3, D5, D6 (T1) · Capabilities: `robot.move/turn/scan/measure/say/can_move`, `bridge.build` · XP 175 (+50)

| Step | Goal | Validator | World reaction |
|---|---|---|---|
| 2.1 Kotak Bernama | `kayu = 4`, `robot.say(kayu)`, then reassign to 6 and say again | `robot.say` sequence [4, 6]; AST: assignment to the same name twice | BIT's speech bubbles; the variable panel introduced |
| 2.2 Jalan BIT | Use `langkah = 3` with `robot.move(langkah)` and `turn` to reach the crate | BIT ends at the crate cell; AST: `move` called with a Name argument | BIT drives; bump animation on mistakes |
| 2.3 Membaca Label | `label = robot.scan()` returns `"12"` (a str); say `int(label) + 3` | Says the correct value in 3 scenarios ("12", "7", "20") | **Designed failure:** `label + 3` raises a TypeError that NEO explains as "teks tidak bisa dijumlah dengan angka" |
| 2.4 Jembatan Data | `jarak = robot.measure()`; `bridge.build(jarak)`; print the float `total_berat = jarak * 1.5`; print `robot.can_move()` before (False) and after (True) | Bridge length equals the gap in 3 scenarios (4/5/6); stdout includes a float and False then True | Planks drop one at a time; the bridge to Gatehouse Rock opens |
| Bonus | f-string report `f"Jarak: {jarak}, Berat: {total_berat}"` | stdout pattern | Cosmetic: BIT "Clay" paint |

#### M3 The Locked Gate — Gatehouse Rock · KCs B1–B7 (T1), O5 · Capabilities: `sensor.read`, `scale.read`, `gate.open/close/light`, `robot.say` · NPC: Old Tamo · XP 200 (+50)

| Step | Goal | Scenarios | Validator | World reaction |
|---|---|---|---|---|
| 3.1 Benar atau Salah | Print results of 4 comparisons from Tamo's riddles | 1 | Expected True/False sequence | Rune pillars light green/red |
| 3.2 Gerbang Pertama | `if warna == "blue": gate.open()` | blue, red, green | Open only when blue | Gate opens / stays shut |
| 3.3 Jika Tidak | Add `else: gate.light("red")` | blue, red | Correct action in each | Red lamp |
| 3.4 Tiga Kristal | blue → open; green → `light("yellow")`; else → `light("red")` | blue, green, red, white | All correct | Lamps |
| 3.5 Kunci Ganda | Open when `warna == "blue" and beban >= 2`, otherwise red | 4-case truth table | All 4 correct | **Main gate opens**; path to Terrace Farm |
| Bonus | Same result using a nested `if`, or using `not` | 4 | All correct + AST requirement | Cosmetic: Architect scarf |

**Anti-hardcoding:** a solution of just `gate.open()` fails the red scenario, and the console shows "Skenario 'merah': gerbang terbuka padahal tidak boleh."

#### M4 Automated Farm — Terrace Farm · KCs L1, L3, L6 (T1), L5 (bonus) · Capabilities: `robot.move/turn/plant/front/can_move/next_row/say` · NPCs: Mira, BOLT (radio) · XP 225 (+50)

| Step | Goal | Validator | World reaction |
|---|---|---|---|
| 4.1 Tanam Manual | Plant 3 cells by writing the commands out repeatedly | 3 planted | BOLT (radio): "Kau mau mengetik ini 30 kali?" |
| 4.2 Ulangi! | Row of 6 with `for i in range(6)` | 6 planted; AST `for`; ≤ 4 code lines | Row sprouts |
| 4.3 Hitung dengan i | `range(1, 6)`; BIT says 1…5 while planting | say sequence 1–5 | Numbered marker stones |
| 4.4 Sampai Habis | `while robot.can_move():` plant + move | Full row in scenarios of length 5/7/9 | Variable-length rows |
| 4.5 Ladang Penuh | 3 × 5 field with nested loops + `robot.next_row()` | 15 planted in scenarios 3×5, 2×6, 4×4 | **Waterfall flows, crops grow over 3 s, water wheel turns, lift powers on** |
| Bonus | Rows with rocks: `if robot.front() == "rock": continue` (skip) | All soil planted, no rock interaction errors | Cosmetic: BIT "Lantern" accessory |

#### M5 The Blueprint — BOLT's Workshop · KCs N1, N2, N4 (T1), N3 (bonus) · Capabilities: `robot.move/turn/place_block/front`, `depot.request` · NPC: BOLT · XP 250 (+50)

| Step | Goal | Validator | World reaction |
|---|---|---|---|
| 5.1 Resep Pertama | `def pasang_tiang():` places 3 blocks; call it twice at 2 marked spots | 2 pillars of height 3; AST: def + ≥ 2 calls | First, NEO demonstrates "defined but not called → nothing happens" |
| 5.2 Parameter | `pasang_tiang(tinggi)` builds heights 2, 4, 3 | Pillar heights match the blueprint | Blueprint ghost blocks fill in |
| 5.3 Nilai Kembali | `def hitung_balok(lebar, tinggi): return …`; `depot.request("stone", hitung_balok(3, 4))` | Function test: hidden `(2, 5)`, `(4, 4)` return the correct values **and** the depot request is exact | Depot crane delivers exactly that many blocks; a wrong count is refused with a reason |
| 5.4 Menara Pengawas | Use the functions to build 4 corner pillars + top beam (`pasang_baris(panjang)`) | Tower structure matches the target voxels | **Watchtower completes with stairs to the Spire** |
| Bonus | Default parameters: `def pasang_tiang(tinggi=3, blok="stone")` | Hidden calls with and without arguments | Cosmetic: BIT "Antenna Flag" |

#### Final — Inti yang Terbangun (Core Shard Spire) · KCs F2, V1, B2–B5, L1/L3, N1–N4 · All prior capabilities + `robot.collect`, `altar.activate` · XP 300

| Stage | Goal | Scenarios | Validator |
|---|---|---|---|
| A Kumpulkan Sel | Walk a corridor; `if robot.front() == "cell": robot.collect("cell")`; count with a variable | 3 layouts (cells at different positions) | 3 cells collected in each layout; the counter variable equals 3 |
| B Tangga Inti | `def buat_tangga(n)` builds n ascending steps using a loop | Gaps of 3/4/5 | Stairs reach the altar |
| C Aktivasi | `altar.activate(jumlah_sel)` + `print(f"INTI AKTIF: {jumlah_sel} sel")` | 1 | Altar accepts; stdout pattern |

**Finale:** shard reassembles → veins across The Awakening brighten (a restrained color shift, no bloom) → Guardian vision (3 lines) → Skybridge silhouette appears toward Data Valley → region summary screen → free roaming continues.

### 9.3 Side content (R1, P2)
10 **lore notes** (10 XP each): short in-world texts about Architect history that double as Python trivia ("Bahasa Python dinamai dari grup komedi, bukan ular").

### 9.4 Roadmap missions (R2+, titles and KCs from Section 8)
Data Valley: Archive of Names (D4) · Crystal Inventory (D8–D9) · Coordinates in Stone (D10) · Unique Seeds (D11) · The Catalog (D12) · Everything Is an Object (D13) · Valley Core (integrated).
Arithmetic Mines: Cart Weights (O1) · Ore Splitter (O2) · Power Crystals (O3) · Running Totals (O4) · Order of Blasting (O6) · Surveyor's Kit (O7) · Mine Core.
Logic Fortress, Automation Forest, Function Kingdom, Object Realm and Core Citadel follow the KC lists in Sections 8.5–8.9 (one mission per KC group plus a Core challenge).

---

## 10. UX/UI Screen Architecture

### 10.1 Screen state machine

```mermaid
stateDiagram-v2
  [*] --> Boot
  Boot --> Unsupported: no WebGL2
  Boot --> Title
  Title --> NewAdventure
  Title --> LoadingWorld: Continue
  Title --> Modes
  Title --> Progress
  Title --> Settings
  Modes --> NewAdventure: Adventure
  NewAdventure --> LoadingWorld
  LoadingWorld --> InGame
  state InGame {
    [*] --> Explore
    Explore --> Dialogue
    Dialogue --> Explore
    Explore --> Editor
    Editor --> Explore
    Explore --> Journal
    Explore --> Paused
    Paused --> Explore
    Editor --> MissionComplete
    MissionComplete --> Explore
  }
  Paused --> Title: Main menu (autosave first)
```

The router is an internal finite state machine in a Zustand store. On mobile, `history.pushState` is used so the Android/browser **Back** button closes the top panel or goes back one menu, and never leaves the game by accident. Leaving during gameplay first goes through the pause menu.

### 10.2 Screen specifications

| Screen | Purpose and hierarchy | Key behavior | Loading / empty / error |
|---|---|---|---|
| **Title** | The live Awakening world at a slow cinematic orbit (12°/min). Left column: 3D voxel wordmark "PYCRAFT" + tagline. Vertical menu: Lanjutkan · Petualangan Baru · Mode Permainan · Dunia & Progres · Pengaturan; ⛶ Fullscreen icon in the corner. | Keyboard/gamepad-style focus navigation (↑/↓/Enter). Continue shows slot name, rank, region and "2 jam lalu". | While the world loads: a painted sky gradient plus "Menyiapkan dunia… 45%". No save: Continue is disabled with the caption "Belum ada petualangan tersimpan". WebGL failure → Unsupported screen with browser guidance. |
| **New Adventure** | Step 1: choose a slot (3 slots shown as stone tablets with occupant info). Step 2: name (max 16 characters, local only) + appearance (live 3D preview of the Architect on the title island). Step 3: "Mulai". | Occupied slot → overwrite dialog: shows the existing save details, offers **Ekspor dulu**, and needs a 1.5 s hold to confirm. | IDB unavailable → banner "Penyimpanan tidak tersedia — progres hilang saat tab ditutup" + continue anyway. |
| **Game Modes** | 4 full-width horizontal rows (not cards): Adventure (available) + 3 marked **Segera Hadir** with a one-line description and a muted voxel vignette. | Future modes are `aria-disabled`, cannot be focused for activation and open nothing. | — |
| **World / Progress** | Archipelago map (orthographic voxel tokens). Side list: missions done per region, KC skill summary. | Tap a region → details. Locked regions show the unlock condition; unreleased regions say "Hadir di pembaruan mendatang". | Empty (no save): "Mulai petualangan untuk membuka peta". |
| **Gameplay HUD** | Top-left: objective tracker (1 title + 1 line). Top-right: save status icon + ☰. Bottom-center: interaction prompt. Bottom-right (touch): jump, interact, `</>`, camera. | Disappears in cinematics. Objective marker: small amber diamond in the world or clamped to the screen edge (toggle). | Save failure → status icon turns red with a tap-to-retry or export prompt. |
| **Quest Dialogue** | Parchment box at the bottom: name plate, text (≤ 3 lines), 1–3 choices; in-world camera frames the speaker. | Tap/Space advances; text speed setting (or instant); log of the last 20 lines. | — |
| **Learning Intro** | Max 3 short panels by NEO: Concept · In-world picture (live camera on the device) · "Coba jalankan" mini-example that runs real code. | Skippable; can be reopened from the mission panel ("Ulangi penjelasan"). | Runtime not ready → example shows its stored output with the label "contoh". |
| **Python Editor** | Slate panel: mission header (step title, requirement chips, help level), editor, toolbar (▶ Run, ■ Stop, ↺ Reset, 💡 Hint, ⋯ examples), tabs: Konsol · Variabel · Linimasa. | Layout per form factor (Section 12). | "Python sedang disiapkan… 60%" progress with Run disabled; load failure → retry + diagnostics. |
| **Execution Console** | Monospace log: stdout (ink), world-action narration (muted, e.g. "BIT maju 3 langkah"), warnings (amber), errors (friendly card + raw traceback collapsed). | Copy button; clear; input prompt line when `input()` waits. | — |
| **Execution Timeline** | Scrubber with action ticks (icons), playback controls ⏮ ◀︎ ⏯ ▶︎ ⏭, speed 0.5×/1×/2×/4×/Instan, step mode toggle. | Section 15. | Disabled until the first run. |
| **Inventory** (Journal tab) | Grid of items with counts and descriptions; BIT cargo shown separately during missions. | — | Empty: "Tasmu masih kosong — jelajahi pulau!" |
| **Character / Profile** (Journal tab) | Live 3D preview, name, rank and XP bar, cosmetics (Architect, BIT, NEO). | Change cosmetics instantly. | Locked cosmetics show their unlock condition. |
| **Skill Tree** (Journal tab) | KC graph by region; node states: locked / available / learning / mastered (icon + text, never color alone). | Tap a node → description, where it's practiced, mastery bar, "Latihan ulang" (replay step). | Future regions grayed "Belum tersedia". |
| **Settings** | Left list of sections (Audio, Grafis, Kontrol, Bahasa, Aksesibilitas, Penyimpanan), right content. Mobile: list → detail. | Changes apply immediately; "Reset ke default" per section. | — |
| **Save Management** | 3 slot tablets: last saved, playtime, region, size; actions: Lanjutkan, Ekspor, Impor, Hapus; global "Hapus semua data". | Delete: hold 1.5 s + offer export first. Import validates schema and checksum and shows a preview before writing. | Corrupt slot → "Rusak — pulihkan dari cadangan (10 menit lalu)". |
| **Pause Menu** | Dimmed world (no blur). Lanjutkan · Jurnal · Peta · Pengaturan · Simpan sekarang (shows "Tersimpan 12 detik lalu") · Bantuan kontrol · Menu utama. | Opening pauses the game and playback. | — |
| **Mission Complete** | Restoration plays first (≤ 5 s, skippable) → parchment panel: XP gained, concepts practiced with mastery change, rewards, "Kodemu" snippet, one NEO line, Lanjutkan. | No spinning or flashing reward animation; numbers count up over ≤ 600 ms (instant with reduced motion). | — |
| **Unsupported / Fatal** | Plain slate page: what failed, which browsers work, a button to export saves if IDB opened. | — | — |

### 10.3 Interaction states (all components)
Default · hover (desktop only) · focus-visible (2 px amber outline + 2 px offset, always visible with keyboard) · pressed (darkens by one token step and shifts 1 px) · disabled (40 % opacity + a reason tooltip or caption) · loading (inline progress text; no spinner without a label).

---

## 11. Visual Art Direction and Design System

> [!WARNING]
> The reference image was not available while planning. The spec below follows the written direction (floating grass islands, layered terrain, turquoise water, pale-blue sky). **T-ART-00** compares the palette and the five hero shots against the image as soon as it is provided. Palette values may move by up to ±8 % lightness; the rules do not change.

### 11.1 Art pillars
1. **Miniature diorama.** Islands read as crafted objects, with clear silhouettes, layered cross-sections and tapered undersides.
2. **Two scales, one grid.** World voxel 1.0 u (terrain, water, trees, rocks, buildings, bridges). Detail voxel 0.125 u (characters, robots, crops, lamps, small props). Detail models snap to the 0.125 grid. **No other voxel sizes, no rotated voxels** (except characters and robots animated as rigid parts).
3. **Color, not texture.** Flat-shaded vertex colors from a locked 48-entry palette. Each voxel's color varies slightly (±3 % value, from a hash of its world cell in the shader), which keeps greedy meshing possible and looks hand-painted, not noisy. **No pixel-art textures** (this is the main visual difference from Minecraft).
4. **One sun, soft shadows, controlled AO.** Directional sun (elevation 50°, from the south-east, warm `#FFF3DE`) + hemisphere sky/ground light + baked per-vertex voxel AO (4 levels, darkest level 0.62 of full brightness).
5. **Atmospheric depth.** Distance fog blends toward the horizon color, and islands below the play plane fade toward a pale blue. No volumetric god-rays.
6. **Restraint.** No bloom, lens flare, chromatic aberration, vignette, SSAO or depth-of-field in gameplay. Emissive materials are limited to the beacon lamp, NEO's visor and core veins, and stay ≤ 1.2× albedo (no HDR glow). Particles are only allowed for meaningful events (block-place dust: 6 particles, 300 ms; water splash at the waterfall base; crop sprout leaves).

### 11.2 Locked world palette (initial values)

| Group | Tokens (hex) |
|---|---|
| Sky | zenith `#8EC5E8` · mid `#B4DAF0` · horizon/fog `#D9EEF6` |
| Grass | top light `#86B84E` · top `#76A845` · side lip `#64923C` · dormant `#9AA071` |
| Foliage | deep `#2E6638` · mid `#3E7E43` · light `#5A9A4B` · blossom accent `#E9B7C4` (sparing) |
| Soil | warm `#8A5A3B` · dark `#6D4630` · tilled `#5B3A27` |
| Stone | light `#A7ABAC` · mid `#878B8D` · dark `#6B6F72` · base `#55595D` |
| Water | shallow `#4FCFC3` · turquoise `#33B9B8` · deep `#2A86A8` · foam `#E8F7F4` · dormant `#79A6A6` |
| Sand / path | `#E2CE9C` · `#CDB683` |
| Wood | plank `#B07D4F` · dark `#7A5233` · trunk `#6A4A2F` |
| Accents | lamp amber `#F2B544` · fire `#E5793A` · clay roof `#B4533C` · cloth teal `#2F7F86` · bronze `#A8773D` · core vein `#5ED8CB` |

**Saturation rule:** no palette entry above 62 % HSL saturation except water shallow and the core vein. Automated check: `palette.lint` (T-ART-01).

### 11.3 Geometry and composition rules
- Island cross-section: grass cap 1 voxel → soil 2–4 voxels → stone tapering underside (each layer shrinks inward 1–2 voxels per 2–3 voxels of depth, with irregular stalactite columns).
- Island tops: gentle terraces of 1–2 voxels; no single-voxel noise spikes (smoothing pass in the generator).
- Trees: 3 archetypes (round broadleaf, tall pine, small shrub), each with 3 size variants, World voxels, trunks 1×1 or 2×2.
- Rule of thirds for the five hero shots; every island has one main landmark that makes it readable from a distance.
- Prop density cap: ≤ 1 decorative prop per 6 m² of walkable area. Negative space is kept on purpose.

### 11.4 Hero shots (art acceptance references)
H1 Title orbit over Beacon Point · H2 Spawn third-person facing the Stasis Shrine · H3 Terrace Farm waterfall in iso view after restoration · H4 Gatehouse with the plank bridge · H5 Core Shard Spire from the watchtower. Each has a fixed camera transform saved in `content/awakening/shots.json` and is captured by a Playwright script at High quality, 1920×1080.

**Art rubric (score 1–5 each, MVP requires ≥ 4 average and no item < 3, judged by 2 reviewers):** palette coherence · silhouette and readability · lighting/AO quality · scale consistency · composition and negative space · absence of forbidden effects (pass/fail).

### 11.5 UI design system

**Two surface types only:**
- **Slate** (functional: HUD, editor, settings): `#1C2427` base at 96 % opacity, raised `#243034`, border `#33434A`, 1 px inner top highlight `#3D5058`.
- **Parchment** (narrative: dialogue, journal, mission complete): `#F3EAD8`, edge `#D9C9A8`, ink `#2A2420`.

| Token group | Values |
|---|---|
| Text on slate | primary `#E8EEF0` · secondary `#A9B8BD` · muted `#7D9197` |
| Accent | amber `#F2B544` (primary action, focus) · turquoise `#3CC4C0` (runtime/code state) |
| Semantic | success `#6DBE4B` · warning `#E9A23B` · error `#E0603F` · info `#5BA7D6` |
| Radius | 0, 2, 4 px only (voxel-honest); primary buttons use a **6 px chamfered corner** (clip-path) instead of rounding |
| Borders | 1 px default, 2 px for focus and selected |
| Elevation | no drop-shadow blur > 8 px; panels use a 2 px solid offset shadow `rgba(0,0,0,.35)` |
| Spacing (4 px base) | 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 |
| Motion | 120 ms (hover/press), 200 ms (panel), 600 ms (camera); ease-out cubic; all motion off or crossfade with reduced motion |

**Typography (self-hosted, OFL):**
- Display/headings: **Barlow Semi Condensed** 600/700. Sizes 22 / 28 / 36 / 48.
- Body/UI: **Atkinson Hyperlegible Next** 400/700 (high legibility for beginners; full Indonesian Latin coverage). 14 / 16 / 18; minimum 14 on desktop and 16 on touch (16 px inputs prevent iOS focus zoom).
- Code: **JetBrains Mono** 400/700. 14 desktop / 15 mobile; line-height 1.5.
- Text scale setting: 100 / 125 / 150 % (multiplies the root rem).
- Logo: the "PYCRAFT" wordmark is built from Detail voxels and rendered in 3D on the title screen. A flat SVG version is used for the manifest and icons.

**Code editor theme (slate):** background `#1A2225`, gutter `#1F292C`, current line `#24303A`, **executing line** turquoise 18 % fill + 3 px left bar, keywords amber `#F2B544`, strings `#9CCB6B`, numbers `#E59A6B`, comments `#7D9197` italic, builtins `#7FC8E8`, API names (`robot`, `gate`…) turquoise `#3CC4C0`, error underline `#E0603F` wavy.

**Contrast requirement:** all text ≥ 4.5:1 (body) / 3:1 (≥ 24 px or bold 19 px), checked automatically (T-UI-09).

**Iconography:** a custom 24 px icon set on a 2 px stroke grid with square line caps (geometric, voxel-friendly). Every icon-only control has a label (tooltip + `aria-label`); on touch, primary icons always show a text label.

### 11.6 Forbidden list (enforced by review checklist + lint where possible)
Purple/blue neon gradients · glassmorphism/backdrop blur on panels · bloom/glow passes · lens flares · random particles · decorative HUD frames · corner radius > 4 px · drop shadows > 8 px blur · pixel textures · Minecraft-derived assets, block textures or UI idioms (no hotbar of 9 slots, no crosshair in third-person) · emoji in UI copy · stock or AI-generated illustrations.

---

## 12. Responsive Desktop/Mobile Strategy

### 12.1 Layout classes (chosen by viewport) and input modes (chosen by last input)

| Class | Rule | Editor presentation | World |
|---|---|---|---|
| **D** Desktop/laptop | width ≥ 1024 and height ≥ 600 | Right dock, 40 % width (resizable 30–60 %), console and timeline under the editor | Fills the remaining space; camera view offset keeps BIT centered in the visible area |
| **T** Tablet | 768 ≤ width < 1024, or a large coarse-pointer screen | Landscape: right dock 45 %. Portrait: bottom sheet (snap 45 % / 85 %) | Same |
| **L** Phone landscape | height < 500 and landscape | Right side panel 48 % with editor/console/timeline tabs; collapses to a 56 px rail | Left 52 % |
| **P** Phone portrait | width < 768 and portrait | **Bottom sheet**: peek (88 px: status + ▶ + step title) · half (50 %) · full (92 %); tabs Kode / Konsol / Variabel / Linimasa | Top area; `camera.setViewOffset` re-centers the frame on BIT above the sheet |

**Input mode** (`mouse+keyboard`, `touch`, `keyboard-only`) follows the last input event, independent of the layout class. An iPad with a keyboard gets key hints; a touchscreen laptop gets touch controls after a touch. Touch controls show only in touch mode.

### 12.2 Touch controls
- **Floating joystick:** activates where the thumb lands in the left 40 % of the world area. 120 px base (96 px in P), dead-zone 12 %, sprint past 90 %.
- **Camera:** one-finger drag on the right 60 %; pinch to zoom; two-finger twist (or buttons) rotates iso view.
- **Buttons:** 56 px Jump, 64 px contextual Interact (icon + label, e.g. "Bicara"), 48 px Code, 48 px Camera, 44 px Menu. Minimum hit area 48 × 48 CSS px, 8 px apart, kept clear of the safe areas.
- **Left-handed option:** mirrors the joystick and buttons.
- **Gesture conflicts:** world surfaces use `touch-action: none`; UI panels allow `pan-y`; the editor gets native touch selection.

### 12.3 Mobile code editing
- **Accessory bar** above the on-screen keyboard: `Tab ⇥` `⇤` `( )` `" "` `:` `=` `[ ]` `+` `-` `<` `>` `#`, plus ↶ ↷. Pairs insert both characters and place the cursor between them.
- **Snippet chips** (only for unlocked concepts): `print()`, `for … in range():`, `if …:`, `def …():`, `robot.move()`. They insert with tab-stops.
- **Guided level uses fill-in-blank widgets.** Code is read-only except the blanks, which reduces typing on phones.
- **Keyboard overlap:** the `visualViewport` resize listener sets the sheet's maximum height, and the cursor line is scrolled into view.
- Autocomplete popup goes above the cursor on P, with rows ≥ 44 px tall.

### 12.4 Viewport, fullscreen, safe areas, PWA
- Root height is `100dvh` (falling back to `100svh` → JS `--app-h` from `visualViewport`). `overflow: hidden` and `overscroll-behavior: none` on `html` and `body`. Meta `viewport-fit=cover`.
- Safe areas: `env(safe-area-inset-*)` padding on HUD anchors and sheets.
- Fullscreen: a button is shown only when `document.fullscreenEnabled` (or the webkit prefix) is true. It is only called from a click or tap. `fullscreenchange` updates the icon. When fullscreen is unavailable (e.g. iPhone Safari), the button is hidden and Settings → Tampilan offers **"Tambahkan ke Layar Utama"** guidance (the PWA runs standalone with no browser chrome).
- Orientation: both orientations are fully supported, and rotation is never required. Rotating the device keeps the editor content and the playback position.
- PWA (P1): manifest (standalone, theme `#1C2427`, background `#D9EEF6`) + a service worker that precaches the app shell, fonts, content and the pinned Pyodide bundle after first load, so offline play works.

---

## 13. Technical Architecture

### 13.1 Technology decisions

| Choice | Decision | Why / problem solved | MVP need | Performance impact (estimates, verify with the bundle analyzer) | Alternatives considered |
|---|---|---|---|---|---|
| **Vite** | Adopt | Fast dev server, native ESM, worker bundling (`?worker`), code splitting, PWA plugin | Yes | Build-time only | webpack (slower), Next.js (SSR not needed for a fullscreen canvas game) |
| **TypeScript (strict)** | Adopt | One typed contract across the worker protocol, sim, content and saves | Yes | None at runtime | JS + JSDoc (weaker guarantees) |
| **React 19** | Adopt for UI | Many screens, forms, accessibility and focus handling; large ecosystem | Yes | ~45 KB gz | Svelte/Solid (smaller, but less compatible with R3F); vanilla DOM (slow to build an accessible UI) |
| **Three.js** | Adopt | Mature WebGL2 renderer, instancing, shadows, ortho/perspective cameras | Yes | ~150 KB gz tree-shaken | Babylon.js (heavier, own UI), PlayCanvas (editor-centric) |
| **React Three Fiber** | Adopt, with rules | Declarative scene composition sharing React state for menus/title; one persistent `<Canvas>` | Yes | ~40 KB gz; React reconciler cost avoided by keeping per-frame work in `useFrame` + refs | Vanilla Three + DOM overlay (viable; R3F chosen because the title and gameplay share one scene and UI-driven scene changes are frequent) |
| **Drei** | Selective imports only | `PerformanceMonitor`, `AdaptiveDpr`-like helpers, `useProgress` | Yes (small) | Tree-shaken, < 15 KB | Write our own (we will for anything that pulls in large dependencies) |
| **Rapier** | **Not in MVP** | The world is a static voxel grid, so swept AABB-vs-voxel collision is exact, deterministic, cheap and has no WASM payload | No | Saves ~1–2 MB WASM + init time | Rapier added later if dynamic rigid bodies (falling crates, physics puzzles) become a design need (R3+) |
| **Pyodide** | Adopt, self-hosted, pinned exact version | Real CPython in WASM: genuine error messages, `ast` for validation, `sys.settrace` for tracing | Yes | Several MB download on first load (≈ 6–12 MB compressed incl. stdlib — **to be measured in spike T-00-03**), ~1.5–4 s init on mid-range phones (to measure), ~60–120 MB memory | Skulpt/Brython (partial Python, not real CPython errors), MicroPython-WASM (smaller ~1 MB but less compatible stdlib/tracing — **documented fallback if Pyodide fails mobile budgets**), server execution (needs accounts/infrastructure, latency, cost) |
| **CodeMirror 6** | Adopt (lazy-loaded) | Modular, mobile-friendly, accessible, decorations for line highlight, read-only ranges for blanks, autocomplete API | Yes | ~120–180 KB gz, loaded with the editor chunk | Monaco (≈ 2 MB+, poor mobile support), textarea + Prism (no real editor features) |
| **Zustand** | Adopt | Tiny store with transient subscriptions (no re-render per frame), slices per domain | Yes | ~1 KB | Redux Toolkit (more boilerplate), Jotai (fine; Zustand fits service-style access outside React) |
| **IndexedDB via `idb`** | Adopt | Promise wrapper, ~1 KB, keeps full control of transactions and versioning | Yes | Negligible | Dexie (~25 KB, more features than needed), localStorage (5 MB cap, sync, no transactions) |
| **zod** | Adopt | Validate saves, imports, content manifests and inbound worker messages at the edges | Yes | ~12–15 KB gz (use `zod/mini` if the budget is tight) | valibot (smaller; acceptable swap) |
| **Cloudflare Pages** | Adopt | Static hosting with `_headers` for COOP/COEP/CSP, generous bandwidth, Pages Functions for the R2 AI proxy, rate limiting | Yes (deploy) | Edge CDN | Vercel (equally viable; Cloudflare chosen for the Workers rate-limiting binding and KV at low cost) |
| **vite-plugin-pwa (Workbox)** | Adopt (P1) | Offline cache incl. Pyodide | P1 | SW install on first visit | Hand-written SW |
| **Vitest / Playwright / axe-core** | Adopt | Unit, Pyodide-in-Node integration, E2E across Chromium, WebKit and Firefox + mobile emulation, accessibility checks | Yes | Dev only | Jest (slower with ESM), Cypress (weaker WebKit support) |
| **i18n** | Own typed catalogs + tiny `t()` | Two locales; content already structured; avoids ~40 KB i18next | Yes | ~1 KB | i18next |
| **Audio** | Thin Web Audio wrapper | SFX buses, music ducking, positional water | P1 | ~2 KB | Howler.js (~10 KB) |
| **WebGPU** | Not in MVP | WebGL2 has universal reach; the R3F/three WebGPU path is newer | No | — | Revisit in R3 |

### 13.2 High-level architecture

```mermaid
flowchart TB
  subgraph Main["Main thread"]
    UI["React UI overlay (screens, HUD, editor)"]
    Canvas["R3F Canvas (scene graph)"]
    Systems["Game systems (TS): input, controller, cameras, interaction, quests, progression"]
    Player["ActionPlayer + Timeline"]
    SimM["WorldSim (authoritative copy)"]
    Stores["Zustand stores"]
    Save["SaveManager (idb)"]
    Learn["LearningEngine + Validators (world/stdout)"]
    Mentor["MentorService (Curated / Remote providers)"]
    RC["RuntimeClient (protocol, watchdog)"]
  end
  subgraph W1["Python worker"]
    Py["Pyodide + pycraft module + tracer + AST checks"]
    SimW["WorldSim (worker copy)"]
  end
  subgraph W2["Mesher worker"]
    Mesh["Greedy mesher + AO baker"]
  end
  subgraph Edge["Cloudflare (R2)"]
    Proxy["/api/mentor Pages Function + rate limit"]
    LLM["AI provider"]
  end
  UI <--> Stores
  Systems <--> Stores
  Canvas --> Systems
  RC <-->|"postMessage (typed, validated)"| Py
  Py <--> SimW
  RC --> Player
  Player --> SimM
  Player --> Canvas
  Learn --> Stores
  Save <--> Stores
  Systems -->|"chunk data"| Mesh
  Mesh -->|"transferable buffers"| Canvas
  Mentor -.->|"R2"| Proxy
  Proxy -.-> LLM
```

### 13.3 Module responsibilities

| Module (`src/…`) | Responsibility | Must not |
|---|---|---|
| `app/` | Boot checks, providers, screen FSM, error boundaries | Contain game logic |
| `engine/render` | Canvas setup, quality presets, sky, lighting, fog, materials, shader chunks | Know about quests |
| `engine/voxel` | Chunk storage, island generator, prefab loader, mesher worker client, voxel raycast (DDA) | Touch React |
| `engine/controller` | Kinematic character controller, swept AABB collision, ground and fall detection | — |
| `engine/camera` | Third-person rig (collision-aware), iso rig, cinematic and dialogue shots, transitions | — |
| `engine/input` | Keyboard, mouse, touch, joystick, action mapping, input modes, focus suspension | — |
| `sim/` | **Pure deterministic puzzle simulation** (grid, entities, commands, deltas, goal predicates) — imported by both worker and main | Import Three, React or the DOM |
| `runtime/worker` | Pyodide boot, `pycraft` Python package, tracer, limits, AST checks, protocol handler | Access the DOM or secrets |
| `runtime/client` | Worker lifecycle, protocol, interrupt and input buffers, watchdog, respawn | Mutate the world directly |
| `playback/` | Event buffer, ActionPlayer, animation tweens, timeline index, rewind via inverse deltas | Run Python |
| `game/quests` | Quest graph, objective evaluation, event bus subscriptions | — |
| `game/dialogue` | Dialogue tree runner, camera shot requests | — |
| `game/progression` | XP, ranks, unlocks, cosmetics, restoration flags | — |
| `learning/` | KC registry, mastery model, help-level selector, validators (world/stdout/AST/function), attempt log | Contain UI |
| `mentor/` | `MentorProvider` interface, `CuratedProvider`, error catalog + translator, context builder, (R2) `RemoteProvider` | Ship API keys |
| `persistence/` | DB open/upgrade, repositories, migrations, autosave scheduler, backups, export/import, Web Locks | — |
| `ui/` | Design tokens, components, screens, HUD, touch controls, editor shell | Hold game state outside stores |
| `editor/` | CodeMirror setup, theme, Python language, autocomplete from the API manifest, blanks, line-highlight decorations | — |
| `content/` | Region data (island specs, prefabs, placements), missions, dialogue, locales, error catalog | Contain logic beyond declarative predicates |
| `audio/` | Buses, SFX, music, ambience | — |

### 13.4 Component hierarchy (React)

```
<App>
  <BootGate>                       capability checks, fonts, settings preload
    <PersistenceProvider>          opens DB, migrations, Web Lock
      <GameCanvas>                 single persistent R3F Canvas (title + gameplay)
        <QualityController/>  <Sky/>  <Lighting/>  <RegionWorld>{ChunkMeshes, Water, InstancedProps, DistantSilhouettes}
        <Entities>{Player, Neo, Bit, Npcs}  <PuzzleZoneOverlay/>  <InteractionHighlight/>  <CameraRig/>
      </GameCanvas>
      <UIOverlay>                  DOM layer above the canvas
        <ScreenRouter>  Title | NewAdventure | Modes | Progress | Settings | SaveManagement
          <InGame>  Hud, TouchControls, ObjectiveTracker, DialogueBox, LearningIntro,
                    EditorDock{MissionHeader, CodeEditor, Console, VariablesPanel, Timeline},
                    Journal{Quests, Inventory, SkillTree, Profile}, WorldMap, PauseMenu, MissionComplete
        <Toasts/> <SaveStatus/> <ErrorBoundary per layer/>
```

### 13.5 Data flow rules
1. **Per-frame state** (positions, animation, camera) lives in mutable system objects and refs. React never re-renders per frame.
2. **Domain state** (quests, inventory, progression, settings, editor, runtime status) lives in Zustand slices. Systems publish domain events on a typed **EventBus** (`quest.objective.completed`, `mission.step.passed`, `save.status`…).
3. **World mutations** happen in only two ways: (a) player exploration actions through the interaction system, and (b) `ActionPlayer` committing validated sim deltas. Both emit events that the save system watches for dirty-tracking.
4. **Content is data.** Missions, dialogue and islands are typed modules validated with zod at build time (`npm run content:check`).

### 13.6 Rendering pipeline
- **Chunks:** 32³ World voxels, palette-indexed `Uint8Array`. The Awakening is about 5 × 3 × 5 chunks, mostly empty, and loads all at once. The chunk abstraction exists for regions in R2+ (load the active region, show neighbors as **silhouette impostors** at quarter resolution).
- **Island generation:** deterministic from an authored island spec (outline polygon, height profile, terrace levels, river spline, seed) + an explicit voxel override list + placements of authored prefabs (JSON palette-indexed RLE). It runs once at build time (`content:bake` outputs compressed chunk files) so runtime only decompresses.
- **Meshing:** a mesher worker does greedy meshing that merges only faces with equal palette index **and** equal AO corner signature; output is transferable position/normal/color/AO buffers. Detail-voxel prefabs are meshed once per type and drawn with `InstancedMesh`.
- **Dynamic blocks:** blocks placed by BIT appear as instanced cubes during playback; when committed, the chunk is re-meshed (budget < 8 ms per chunk on mid-range mobile — to verify).
- **Materials:** one shared `MeshLambertMaterial` variant with vertex colors, extended via `onBeforeCompile` for AO, per-cell color jitter, restoration blending and fog tint. Water uses a separate simple shader (vertex-stepped surface, slow color banding, foam at edges, no reflections).
- **Shadows:** one directional shadow map fitted to a 48 × 48 u box following the camera focus. Low = none (blob shadows under characters) · Medium = 1024² · High = 2048² PCF. Static far terrain relies on baked AO.
- **Tone mapping:** Neutral tone mapping (keeps palette colors predictable), sRGB output.
- **Context loss:** `webglcontextlost` → pause + overlay; `restored` → rebuild GPU resources from the CPU-side chunk data.

---

## 14. Python Runtime and Game API Specification

### 14.1 Why "simulate in the worker, replay on the main thread"

| Option | Problem |
|---|---|
| Run Python on the main thread | Freezes rendering; infinite loops kill the tab |
| Worker + async round-trips per command (`await robot.move()`) | Python code would need `await` everywhere (not beginner Python), or JSPI (not available everywhere, notably Safari) |
| Worker + `Atomics.wait` per command, waiting for main-thread animation | Couples Python speed to animation; hidden-scenario validation would take seconds; needs isolation everywhere |
| **Worker owns a deterministic sim; Python calls are synchronous against it; recorded events are replayed** ✔ | Needs the sim duplicated in both threads → solved by one shared pure-TS `sim/` module |

Result: loops, conditions, functions and classes all work naturally because sensor calls (`robot.front()`) return immediately from the worker sim. The main thread is never blocked. Runs finish in milliseconds, so hidden scenarios are cheap. Replay supports pause, step and rewind for free, because everything is recorded.

### 14.2 Runtime flow

```mermaid
sequenceDiagram
  participant U as Player
  participant E as Editor/UI
  participant RC as RuntimeClient
  participant W as Python Worker
  participant S as WorldSim (worker)
  participant AP as ActionPlayer (main)
  participant M as WorldSim (main) + Renderer
  U->>E: Run
  E->>RC: run(code, missionStep)
  RC->>W: run{runId, code, scenario, limits}
  W->>S: reset(initialState, seed)
  loop Python executes
    W->>W: tracer emits line/vars/loop events
    W->>S: robot.move(3) (sync)
    S-->>W: result + delta (validated)
    W-->>RC: events batch (every 16 ms or 64 events)
  end
  RC->>AP: enqueue events
  AP->>M: apply delta + animate (re-validated)
  W->>W: hidden scenarios (no trace)
  W-->>RC: runEnd{status, scenarioResults, astReport, finalHash}
  RC->>E: status + friendly error / validation
  AP-->>E: playback finished → step pass/fail shown
```

### 14.3 Worker lifecycle
- **Spawn** during title-screen idle time (`requestIdleCallback`). When `navigator.connection.saveData` is on, spawn on first editor open instead. Progress messages report download and init phases.
- **Init:** load the pinned self-hosted Pyodide → install the `pycraft` package (Python source bundled as a string) → install an import guard (`sys.meta_path` finder denying `js`, `pyodide*`, `micropip`, `ctypes`, `socket`, `subprocess`, `urllib`, `http`, `threading`, `multiprocessing`), remove `js`/`pyodide` from `sys.modules` for player scope, `sys.setrecursionlimit(200)` → post `ready{pyodideVersion, isolated}`.
- **Per run:** new globals dict (`__name__="__main__"`, only allowlisted capabilities bound), sim reset to the step's initial state with `random.seed(scenario.seed)`, stdout/stderr redirected to the event stream.
- **Stop:** if cross-origin isolated, write to the Pyodide interrupt buffer → `KeyboardInterrupt` → clean `stopped` end. Otherwise (or if there is no response within 1 s) call `worker.terminate()` and respawn (status "Memulai ulang Python…").
- **Respawn** also happens after any fatal worker error. The editor contents are never lost.

### 14.4 Limits (per run, configurable per mission)

| Limit | Default | When exceeded |
|---|---|---|
| Traced line events | 20,000 | `TooManySteps` → "Programmu berjalan terlalu lama — mungkin perulangan tidak pernah berhenti (baris 4)" |
| World actions | 500 (mission override, e.g. 60) | `ActionLimit` with explanation |
| Execution wall time (excludes `input()` waits) | 5 s in-worker; main watchdog +2 s | interrupt → terminate |
| stdout total / per print | 64 KB / 4 KB | truncated with a note |
| Recursion depth | 200 | RecursionError translated |
| Code size | 20 KB | Run disabled with message |
| Hidden scenarios | ≤ 4, untraced, same limits each | — |

### 14.5 Event bridge protocol (v1)
All messages carry `{v: 1, type, runId?}`. Inbound messages on both sides are checked by discriminated-union guards (zod at low-frequency boundaries; hand-written guards for high-frequency event batches). Unknown types or versions are dropped and logged.

**Main → Worker:** `init{pyodideBase, interruptSAB?, inputSAB?}` · `loadStep{stepId, capabilities[], initialState, scenarios[], limits, astRules}` · `run{runId, code, traceLevel: "full"|"none"}` · `checkSyntax{reqId, code}` · `inputReply` (via SAB; fallback queue in `run`) · `stop{runId}` · `dispose`.

**Worker → Main:** `progress{phase, pct}` · `ready{...}` · `events{runId, batch: RunEvent[]}` · `inputRequest{runId, prompt}` · `syntaxResult{reqId, ok, line?, col?, msg?}` · `runEnd{runId, status: "ok"|"error"|"stopped"|"limit", error?: PyErrorInfo, scenarioResults[], astReport, functionTests[], finalStateHash}` · `fatal{message}`.

**RunEvent (ordered by `seq`):**

| Type | Payload | Source |
|---|---|---|
| `line` | `line`, `frameDepth`, `fn` | `sys.settrace` (only frames with filename `<player>`) |
| `vars` | changes: `[{scope, name, typeName, repr(≤80 chars)}]` | Diff of user frame locals/globals after each line (functions, modules and classes skipped) |
| `loop` | `line`, `iteration` | Tracer detects re-entry of the loop header line |
| `call` / `return` | `fn`, args reprs / return repr | Tracer (used by the R3 call-stack view; recorded from R1) |
| `stdout` | `text` | Redirected `sys.stdout` |
| `action` | `kind`, `args`, `result`, `delta`, `inverse`, `line` | `pycraft` → sim |
| `warning` | `code`, `params`, `line` | Sim (e.g. bumped into a wall) |
| `error` | `PyErrorInfo{type, msg, line, col, tracebackUser[], catalogKey?}` | Exception handler |

### 14.6 Game API (Python-facing, R1)

**General semantics:**
- Grid coordinates are `(x, y)` where x points east and y points south. Directions are `"north" | "east" | "south" | "west"`. Every interaction targets **the cell in front of BIT**.
- **Invalid arguments** (wrong type, unknown string, out of range) raise friendly exceptions: `PycraftValueError(ValueError)` and `PycraftTypeError(TypeError)`. They stop the program, like real Python.
- **Physical impossibilities** (blocked, nothing to collect) **do not raise**. They return `False` (or a smaller count), animate a bump or shrug, and log an amber warning. Beginners see what happened instead of a crash, and later learners can use the return values.
- `bool` is rejected where an `int` is expected. `float` values that are whole are accepted with a warning ("gunakan 3, bukan 3.0"); non-whole floats raise.
- Every call emits exactly one `action` event (sensors emit `action` with `kind: "sense"` and play a 120 ms scan cue, so sensing is visible but quick).
- Names not granted in the current step raise `NameError`, which the translator turns into "BIT belum punya kemampuan `plant` — kamu akan membukanya di Ladang Terasering" when the name is a known future capability.

| Object.method | Signature → return | Animation (1×) | Unlocked in |
|---|---|---|---|
| `print(*values, sep, end)` | → None | Console + (M1) Beacon screen | M1 |
| `input(prompt="")` | → str | Console prompt | M1.5 |
| `robot.move(steps=1)` | int 1–20 → int (cells actually moved) | 260 ms/cell; bump 200 ms | M2 |
| `robot.turn(direction)` | `"left"|"right"|"around"` → None | 180 ms (360 ms around) | M2 |
| `robot.say(value)` | any → None (uses `str(value)`, ≤ 60 chars shown) | Bubble 900 ms | M2 |
| `robot.scan()` | → str or None (label of the object in front) | 120 ms | M2 |
| `robot.measure()` | → int (empty cells ahead until the far side of a gap/obstacle) | 200 ms | M2 |
| `robot.can_move()` | → bool | 120 ms | M2 |
| `robot.front()` | → str: `"empty"|"soil"|"planted"|"rock"|"wall"|"edge"|"water"|"cell"|"block"|"gate"|"crate"` | 120 ms | M4 |
| `robot.position()` | → tuple (x, y) | 0 ms (no cue) | M2 (introduced R2) |
| `robot.facing()` | → str direction | 0 ms | M2 |
| `robot.plant(seed)` | `"wheat"|"carrot"` → bool | 300 ms | M4 |
| `robot.next_row()` | → bool (moves to the start of the next authored row) | 400–900 ms path | M4.5 |
| `robot.place_block(block)` | `"stone"|"wood"` → bool (stacks on top of the front cell, max height 8, uses cargo) | 220 ms | M5 |
| `robot.collect(item)` | str → bool | 260 ms | Final |
| `robot.inventory()` | → dict copy of cargo | 0 ms | M2 (introduced R2) |
| `robot.count(item)` | → int | 0 ms | M2 |
| `bridge.build(length)` | int 1–12 → bool (`False` if length ≠ gap; builds anyway up to the gap and reports) | 180 ms/plank | M2.4 |
| `sensor.read()` | → str color | 150 ms | M3 |
| `scale.read()` | → int | 150 ms | M3.5 |
| `gate.open()` / `gate.close()` | → None | 700 ms | M3 |
| `gate.light(color)` | `"red"|"yellow"|"green"` → None | 200 ms | M3.3 |
| `gate.is_open()` | → bool | 0 ms | M3 |
| `depot.request(item, amount)` | str, int → bool (exact match required by the blueprint) | 800 ms crane | M5.3 |
| `altar.activate(cells)` | int → bool | 1,200 ms | Final |

**Reserved for later regions (R2+), already in the manifest format:** `robot.pick_up/drop`, `shelf.*` (lists), `catalog` (dict), `lift.*` (arithmetic), `conveyor.*` (loops), `blueprints` module (functions), `Robot` base class for subclassing (OOP: `class Miner(Robot)` uses the same command layer via `super()`).

**OOP compatibility:** `robot` is an instance of a Python class `Robot` defined in `pycraft`. Its methods call a single private bridge function. In the Object Realm, player subclasses inherit those methods, so the API naturally grows into inheritance and polymorphism with no new mechanism.

### 14.7 Command validation (two layers)
1. **Worker sim:** validates arguments and preconditions, applies the change, returns `delta` + `inverse` + `result`.
2. **Main sim (authoritative):** replays each `action` (`kind`, `args`) on its own state and compares the resulting delta and hash. A mismatch → run marked `fault`, world reset to the initial state, telemetry entry logged locally. This guards against worker tampering, bugs and version skew.

### 14.8 Determinism
Same code + same step + same scenario seed ⇒ the same event stream (excluding timing). Sources of nondeterminism are removed or seeded: `random` is seeded per scenario; `time` and `datetime` are available but **sim behavior never depends on them**; dict ordering is deterministic in CPython. Golden tests (T-RT-08) store event streams for reference solutions.

### 14.9 `input()` behavior
- **Cross-origin isolated (normal path):** `input()` posts `inputRequest`, then the worker waits on `Atomics.wait` on the input SAB. When the ActionPlayer reaches that point in playback, the console shows the prompt. The player types, the UTF-8 answer is written to the SAB, and the worker continues. Wall-time limits pause while waiting.
- **Not isolated (fallback):** before running, an AST scan counts `input()` calls (if there is a loop, it is treated as unknown) and asks for answers in a small "Jawaban untuk input()" list. Running out of answers raises `EOFError`, translated to "Programmu meminta input lebih banyak dari jawaban yang kamu siapkan".
- **Hidden scenarios** always use scripted inputs from the manifest.

### 14.10 Runtime reset semantics
"Reset code" restores the starter code for the current help level (with confirmation; the previous draft goes to undo history). "Reset area" restores the puzzle's initial state (always automatic before each run). A hard runtime reset (worker respawn) is available in Settings → Bantuan → "Mulai ulang Python".

---

## 15. Execution Visualization Design

### 15.1 Two distinct things, one timeline

| | **Execution trace** | **Action replay** |
|---|---|---|
| What | What Python did: lines executed, variable changes, loop iterations, calls, stdout | What happened in the world: robot and device actions with state changes |
| Source | `sys.settrace` + stdout capture in the worker | `pycraft` → sim deltas |
| Recorded | Visible scenario only (hidden scenarios run untraced) | Visible scenario |
| Rewindable | Yes (state at any `seq` is rebuilt from events) | Yes (inverse deltas applied in reverse) |

**Honesty statement (shown in the Help panel):** pausing and stepping work on the **recording** of the program. Python has usually finished running by then; the only real pause in Python is `input()`. Stepping back does **not** run Python backwards. It shows the recorded state at that point. Editing code invalidates the recording ("Kode berubah — jalankan ulang untuk merekam lagi").

### 15.2 Playback model
- One merged stream ordered by `seq`. Playback time comes from the event durations in the API table, multiplied by speed (0.5×, 1×, 2×, 4×, Instan). Non-action events have 0 ms duration in continuous play. In **step mode**, each `line` event is one step, and its attached action (if any) animates.
- **Index:** every 200 events, a checkpoint stores the variable snapshot and sim hash, so seeking costs at most 200 events of replay.
- **Controls:** ⏯ play/pause · ▶︎ step forward (line) · ◀︎ step back (line) · ⏭ next action · ⏮ previous action · scrub bar · speed. Keyboard: Space (when focus is on the timeline), ←/→, Shift+←/→.

### 15.3 What the learner sees

| Feature | Behavior | Priority |
|---|---|---|
| Current line highlight | Turquoise fill + left bar on the line of the current `seq`; editor scrolls to keep it visible | P0 |
| Execution status chip | Idle · Menyiapkan Python · Berjalan · Menunggu input · Dijeda · Selesai ✓ · Error ✕ · Dihentikan · Batas tercapai | P0 |
| Robot action narration | Console line per action ("BIT maju 3 langkah (2 berhasil — terhalang batu)") | P0 |
| Error location | Red gutter marker + friendly card linked to the line; playback stops at the error event | P0 |
| Variable panel | Table: name · type badge (int/str/…) · value; a changed row gets a 600 ms amber tint (no tint with reduced motion); scope groups in functions | P1 |
| Loop counter | Gutter chip on the loop header: "ke-3" during playback; final "×5" after the loop | P1 |
| Timeline ticks | Icons per action kind; error tick in red; current position marker | P1 |
| Scenario results | "Skenario: ✓ biru · ✕ merah — gerbang terbuka padahal tidak boleh" with a "Lihat skenario ini" button that re-runs with that scenario as the visible one | P0 |
| Call stack | Frame list from `call`/`return` events | R3 |

### 15.4 Pedagogical defaults
Guided level: 1× speed with step mode suggested on the first run of each step. Independent and above: 2× by default. "Instan" is always available. Speed is remembered per profile.
