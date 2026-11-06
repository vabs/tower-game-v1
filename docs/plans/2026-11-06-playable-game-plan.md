# Playable Game Plan

Date: 2026-11-06
Supersedes: Tasks 14–17 of `2026-01-22-tower-defence-implementation-plan.md`
Design source of truth: `2026-01-22-tower-defence-design.md`, `2026-01-22-design-assets.md`

## Why this plan exists

The January plan built data tables, small helpers and screen stubs, but its gameplay
task ("towers fire, waves progress") was a single vague step. The result in `main`
is a placeholder loop: text dots moving in a straight line, one hardcoded turret,
no placement, no waves, no win/lose, sprites never loaded.

This plan replaces that step with small vertical slices. **Every milestone ends with
something you can open in the browser and play**, and every simulation rule has a
Vitest test.

**Tooling:** Vite for dev server + build, Vitest for tests. `npm run build` produces a
single self-contained `dist/index.html` (JS, CSS and sprites inlined) that plays by
double-clicking — no server needed to play.

## What we keep from `main`

| Keep as-is | Keep but fix | Replace |
|---|---|---|
| `src/data/towers.js`, `enemies.js`, `levels.js` | `core/time.js` (needs an accumulator, see M0) | `game/game.js` (placeholder loop) |
| `core/grid.js`, `core/path.js` | `systems/targeting.js` ("first" must mean furthest along path) | `render/renderer.js` (text only) |
| `systems/economy.js`, `waves.js`, `collision.js` | `ui/hud.js` (duplicates the HUD already in `index.html`) | `game/screens/*` (return data, render nothing) |
| Sprite PNGs from `assets/sprites/png/` | `entities/enemy.js` (fold into sim) | `ui/placement.js` (empty stub) |
| `tools/generate_pixel_assets.py` | all `tests/*.test.js` (port `node:test` → Vitest) | `assets/manifest.json` (Vite globs sprites instead) |

Asset cleanup (M0): top-level `assets/png/`, `assets/{towers,enemies,tiles,ui}/` are tracked
duplicates of the untracked `assets/sprites/`. Root `generate_svg_assets.py` is an older
generator superseded by `tools/generate_pixel_assets.py`. Consolidate to one copy (see 0.2).

---

## Decisions (defaults chosen; change any before starting)

The design doc leaves these open. Each default is the simplest thing that works.

1. **Grid & scale.** 20×11 tiles at 48px (24px sprites drawn at 2×, nearest-neighbour).
   Canvas becomes 960×528. Ranges/splash in the data are in tiles.
2. **Speed units.** Enemy `speed: 1.0` = 1.5 tiles/second.
3. **Sim/render split.** All game rules live in `src/sim/` with no DOM or canvas access,
   so whole levels can be run headless in tests. Rendering and UI only read sim state
   and send commands.
4. **Fixed timestep.** Sim always steps at 1/60s via an accumulator; render runs per frame.
   Game speed toggle (1×/2×) runs more sim steps per frame.
5. **Determinism.** Seeded RNG (crits, spawn jitter) passed into the world, so tests are repeatable.
6. **Maps.** Hand-authored templates, not one map per level: 3 templates each for
   `single`, `branching`, `open`, `split`, `hybrid` = 15 maps. Level N picks
   `templates[mapType][N % 3]`. A map = grid string + one or more waypoint paths.
   - `branching`: enemies pick a branch at random (seeded) at the fork.
   - `split`: two spawns, enemies alternate.
   - `open`: wider buildable area, route shown as beacons (waypoint tiles), same movement code.
7. **Air units** fly a straight line spawn → goal, ignoring the ground path.
8. **Who can hit air.** Only the Anti-Air family. AA towers hit ground for 60% damage (per design).
9. **Wave flow.** Build phase before each wave with a **Start Wave** button.
   After the first wave, the next wave auto-starts after a 10s countdown (can be called early).
10. **Upgrade pricing.** The `cost` on level N is the price to reach level N.
    "In combat" = a wave is active → +15% (existing `upgradeCost`). Build phase = base price.
11. **Selling** (not in design, added): refund 70% of total spent in build phase, 50% during a wave.
12. **Base HP = 25** (changed from design's 100 in M1: at 100, Level 1 was unlosable with no towers).
    **Leak damage.** Enemy HP < 100 → 1, < 200 → 2, < 300 → 3, < 400 → 4, else 5. Bosses → 25 (deviation:
    design says 1–5, but a boss leaking for 5 makes boss waves trivial).
13. **Bosses.** Derived, not new data: `heavy_boss` = Heavy × 12 HP, 1.5× sprite size, 0.8× speed.
    `final_boss` = Bulldozer boss then Sky Tank boss in the last wave.
14. **Armor Breaker.** Enemies have no armor stat, so "−6% armor" is treated as +6% damage taken,
    stacking additively with Target Painter.
15. **Starting coins.** `200 + 25 × (level − 1)`, kept in one function so balance pass can tune it.
16. **Medals.** Gold = 0 HP lost, Silver = ≤ 5 HP lost, Bronze = cleared.
17. **Save.** `localStorage` key `td-save-v1`: highest unlocked level, best medal per level.
    Level N+1 unlocks when N is cleared. Towers unlock per `levels.js` `unlocks` (cumulative).
18. **Build: Vite + `vite-plugin-singlefile`.** Dev: `npm run dev` (HMR). Release: `npm run build`
    → one `dist/index.html` with everything inlined; works from `file://`. `base: './'`.
    Dev dependencies only: `vite`, `vite-plugin-singlefile`, `vitest`. Pin exact versions at install.
19. **Sprites via `import.meta.glob`.** `src/assets/sprites/**/*.png` imported eagerly as URLs;
    Vite inlines them as data URIs in the build (~36 KB raw). No runtime `fetch`, no manifest.
20. **Purity rule.** `src/sim/`, `src/data/`, `src/core/` must not use Vite-only features
    (`import.meta.glob`, asset imports) or the DOM, so they run under plain Node too
    (balance bot) and tests stay fast.
21. **Language: JavaScript** with JSDoc types on sim/data shapes. (TypeScript is a cheap switch
    with Vite if wanted later; not in this plan.)

---

## Target architecture

```
index.html                Vite entry (root)
vite.config.js            singlefile plugin, base './', vitest config
package.json              scripts: dev, build, preview, test, balance
art/                      SVG sources (not shipped)
tools/
  generate_pixel_assets.py   writes PNGs to src/assets/sprites/, SVGs to art/
  balance.js              headless balance bot (plain node)
dist/                     build output, gitignored
src/
  main.js                 boot: load sprites, create app, start loop
  styles/main.css         (moved from root styles.css)
  assets/sprites/         towers/ enemies/ tiles/ ui/ *.png
  core/                   grid, path, time (accumulator), rng, save
  sim/                    PURE — no DOM
    world.js              createWorld(levelId, {seed, unlocked}) → world; step(world, dt)
    commands.js           placeTower, upgradeTower, sellTower, setTargeting, startWave
    map.js                load template → tiles, paths, buildable mask
    spawner.js            wave schedule → enemy spawns over time
    enemies.js            movement along path / air line, status effects, leaks
    towers.js             cooldowns, targeting, firing, auras
    projectiles.js        travel, hit, splash, pierce, chain
    effects.js            slow, burn, stun, vulnerability, gas fields
    events.js             world.events[] (kill, leak, waveEnd, levelEnd) for UI/analytics
  data/
    towers.js enemies.js levels.js   (existing)
    maps.js               15 templates
    waves.js              buildWaves(levelId) → [{ enemies:[{id,count,interval}], supply? }]
    bosses.js             derived boss definitions
  render/
    sprites.js            import.meta.glob PNGs → Image map keyed "towers/ar_turret_l1"; draw at 2×
    renderer.js           tiles, towers, enemies, projectiles, VFX, range ring, ghost
  ui/
    hud.js                bind top bar + side panels to world state
    input.js              canvas mouse → tile, placement, selection
    screens.js            DOM overlays: start, level select, pause, level end, game over, game end
    analytics.js          (existing summaries, fed from world.stats)
tests/
  sim/*.test.js           rule tests
  levels.test.js          headless: every level builds, waves valid, bot can clear L1
```

---

## Milestones

Each task lists **Files**, **Do**, **Tests**, **Done when**. Commit after each task.
Work on branch `feature/playable-game`.

### M0 — Foundations (no visible change yet, but nothing broken)

**0.1 Vite + Vitest setup**
- Files: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `tests/**`
- Do: add dev deps `vite`, `vite-plugin-singlefile`, `vitest`; scripts
  `dev`, `build`, `preview`, `test` (`vitest run`), `test:watch`. Move `styles.css` →
  `src/styles/main.css` imported from `main.js`. Port the 14 existing tests from
  `node:test` to Vitest (`import { test, expect } from 'vitest'`; `node:assert` can stay).
  Add `dist/` to `.gitignore`.
- Done when: `npm test` green; `npm run dev` shows today's page; `npm run build` makes
  `dist/index.html` that runs when double-clicked (check in Chrome).

**0.2 Asset consolidation**
- Files: `assets/` → `src/assets/sprites/` (PNGs) + `art/` (SVGs), `tools/generate_pixel_assets.py`
- Do: keep one copy (from `assets/sprites/`, the newer untracked set); move PNGs to
  `src/assets/sprites/{towers,enemies,tiles,ui}/`, SVGs to `art/`; point the generator's
  output dirs there; delete `assets/manifest.json`, the duplicate top-level asset folders,
  and root `generate_svg_assets.py`. Commit `tools/`.
- Done when: re-running the generator produces no git diff; build still works.

**0.3 Cleanup**
- Files: `src/main.js`, `src/ui/hud.js`, `index.html`
- Do: remove `initHud(app)` duplicate HUD; canvas to 960×528.
- Done when: page loads with one HUD, no console errors.

**0.4 Fixed-step accumulator**
- Files: `src/core/time.js`, `tests/time.test.js`
- Do: `createClock(step)` with `advance(dt) → steps`, carrying remainder; clamp dt to 0.25s
  (tab switch). Keep `stepFixed` export for the old test or update the test.
- Tests: 10 calls of dt=1/120 → 5 steps total; dt=1 clamps.

**0.5 Seeded RNG**
- Files: `src/core/rng.js`, `tests/rng.test.js`
- Do: mulberry32 `createRng(seed)` → `next()`, `int(n)`, `chance(p)`.
- Tests: same seed → same sequence.

**0.6 Targeting fix**
- Files: `src/systems/targeting.js`, `tests/targeting.test.js`
- Do: modes `first` (max path distance), `last`, `closest`, `strongest` (max current HP);
  filter by `canHitAir`; enemies carry `distance`.
- Tests: one per mode + air filtering.

### M1 — Playable slice: Level 1, three towers, win/lose

Goal: open the page, play Level 1 start to finish with AR Turret, Marksman, AA MG.

**1.1 Map model**
- Files: `src/data/maps.js`, `src/sim/map.js`, `tests/sim/map.test.js`
- Do: template format (grid of chars `.` buildable, `#` blocked, `S` spawn, `G` goal +
  `paths: [[{x,y}...]]` in tiles). `loadMap` returns `{w,h,tiles,paths(px),buildable(x,y)}`;
  path tiles derived from waypoint segments and marked unbuildable. Author `single_1` only.
- Tests: path tiles not buildable; spawn/goal at path ends; out-of-bounds not buildable.

**1.2 World + enemies on paths**
- Files: `src/sim/world.js`, `src/sim/enemies.js`, `tests/sim/enemies.test.js`
- Do: `createWorld`, `step`. Enemy = `{id, hp, maxHp, speed, distance, pathIndex, x, y, air, status}`.
  Move by `distance += speed × 1.5 × tile × dt`, position via `positionAt`.
  At path end: remove, `hp -= leakDamage`, emit `leak`. Air: straight line.
- Tests: enemy reaches goal in expected time; leak reduces HP by tiered amount.

**1.3 Wave spawner (Level 1 only)**
- Files: `src/data/waves.js`, `src/sim/spawner.js`, `tests/sim/spawner.test.js`
- Do: `buildWaves(1)` hardcoded for now: 3 waves of Grunt/Runner. Spawner emits enemies
  at intervals; wave ends when all spawned and none alive → stipend (`stipendForLevel`),
  phase back to `build`. All waves done and HP > 0 → `won`. HP ≤ 0 → `lost`.
- Tests: wave counts; stipend paid once per wave; win and lose transitions.

**1.4 Towers, projectiles, kills**
- Files: `src/sim/towers.js`, `src/sim/projectiles.js`, `src/sim/commands.js`, tests
- Do: `placeTower(world, id, tx, ty)` checks buildable, unoccupied, unlocked, affordable.
  Tower cooldown `1/rate`; acquires target via 0.6; spawns projectile (speed per family);
  on hit deals damage; kill → coins + `kill` event. Basic damage only (crit/air bonus in M2).
- Tests: placement rules; tower kills a grunt in range; coins awarded once.
- **Headless test:** L1 with 3 AR Turrets placed at fixed tiles → `won`.

**1.5 Sprite renderer**
- Files: `src/render/sprites.js`, `src/render/renderer.js`
- Do: `import.meta.glob('../assets/sprites/**/*.png', { eager: true, query: '?url', import: 'default' })`,
  decode all into `Image`s before first frame; `imageSmoothingEnabled=false`;
  draw tiles, towers (level sprite), enemies (+ HP bar), projectiles as tracer dots.
- Done when: L1 map and moving enemies visible with sprites.

**1.6 Input + HUD wiring**
- Files: `src/ui/input.js`, `src/ui/hud.js`, `src/main.js`, `index.html`, `styles.css`
- Do: tower list built from unlocked towers (name, cost, icon); click to arm → ghost + range
  ring on hover, green/red by validity; click to place; Esc cancels. Click placed tower →
  right panel stats. Top bar reads world each frame. **Start Wave** button. Win/lose banner
  with Retry.
- Done when (manual): play L1 to a win and to a loss.

### M2 — Tower depth: all 30 towers behave per design

**2.1 Upgrade, sell, targeting toggle**
- Files: `sim/commands.js`, `ui/hud.js`, tests
- Do: Upgrade button shows price (+15% label in combat), disabled at L5 or unaffordable;
  sprite switches per level. Sell per decision 11. Targeting dropdown per tower.
- Tests: pricing in/out of combat; L5 cap; refund math.

**2.2 Damage modifiers**: crit (2×, seeded), AA air bonus + 60% vs ground, air targeting
restriction, pierce (Rail Autocannon: projectile continues through N enemies).

**2.3 Splash family**: grenade, mortar (arcing, lands at target's position at fire time),
howitzer, rocket pod, cluster cannon, flak. Damage all enemies within `splash` tiles.

**2.4 Status effects** (`sim/effects.js`): slow (strongest applies, no stacking), burn DoT,
stun (EMP), chain (Shock Coil: hop to N nearest within 2 tiles, each slowed),
gas field (ground zone that slows/damages while inside).

**2.5 Support**: Target Painter + Armor Breaker (damage-taken multiplier), Ammo Feeder
(fire-rate aura to towers in `auraRange`), Command Uplink (range aura), Logistics Hub
(no attack; `+endWaveCoins` at wave end). Auras recomputed when towers placed/sold/upgraded.

**2.6 Special cases**: Gatling 1s spool-up (rate ramps while it has a target), Interceptor Drone
(treat as AA tower with orbiting visual; no separate unit).

- Tests: one focused test per mechanic (e.g. splash hits 3 grouped enemies, not a 4th at 2 tiles;
  slow halves distance covered; stun stops movement for duration; aura raises neighbour rate).
- Done when: debug "sandbox" URL `?sandbox=1` gives all towers + 9999 coins on a test map and every
  tower visibly does its thing.

### M3 — Content: 50 levels

**3.1 Map templates**: author the remaining 14 templates (branching with seeded fork choice,
split with two spawns, open, hybrid). Test: every template loads, all paths connect S→G,
at least 30 buildable tiles.

**3.2 Wave generator**: `buildWaves(level)` from the design doc:
- Enemy roster = cumulative "introduce" list per level (encode as `introducedAt` table).
- Wave count from `levels.js`; per-wave budget grows with level and wave index;
  HP × (1 + 0.06 × level), speed × (1 + 0.01 × floor(level/10)).
- Boss on final wave of 10/20/30/40/50 (`data/bosses.js`).
- Supply Drop wave inserted after `supplyDropAfterWave`: no enemies, pays `150 + 10 × level`.
- Tests: every level returns `combatWaves` combat waves (+1 supply where set); only introduced
  enemies appear; boss levels end with a boss; deterministic for a given level.

**3.3 Air rendering + AA cues**: shadow under air units, sky chevron on AA tower buttons.

**3.4 Headless level smoke test**: `tests/levels.test.js` builds a world for all 50 levels and
steps 30 sim-seconds with no towers — no exceptions, enemies leak. (Balance comes in M5.)

### M4 — Screens, progression, save

**4.1 Screen manager** (`ui/screens.js` + existing `game/state.js`): DOM overlays for Start,
Level Select (50-grid, locks, medal badges), Pause (Esc / button; analytics panels),
Level Complete (medal, time, leaks, spare coins, "next level unlocks: X"), Game Over
(Retry / Level Select), Game End after L50.

**4.2 Save/progress** (`core/save.js`): load/save per decision 17; Continue on Start screen;
corrupt or missing save → fresh save. Tests with a fake storage object.

**4.3 Analytics feed**: sim tracks per-tower damage/kills/spent and per-enemy-type seen count
in `world.stats`; pause/end screens use existing `summarizeTowerStats/EnemyStats`.

- Done when: full loop Start → Level Select → play → medal → next level unlocked → reload page → progress kept.

### M5 — Polish & balance

**5.1 VFX** per asset doc: tracers, splash ring, slow/burn/EMP tints, hit flash. Keep brief.
**5.2 Game speed** 1×/2× toggle, pause on window blur.
**5.3 Balance bot**: `tools/balance.js` (plain node, `npm run balance`; relies on purity rule 20) — greedy bot places/upgrades best DPS-per-coin
unlocked tower near the path each build phase; runs all 50 levels, prints HP left per level.
Tune `startingCoins`, wave budgets, leak damage until the bot clears ~70% of levels
(a human should do better). Add L1–L10 "bot wins" as a regression test.
**5.5 Browser smoke test**: `npm run smoke` (tools/smoke.mjs, playwright-core + local Chrome) drives the
real page: place, select, start wave, finish level, no console errors. Extend it each milestone.

**5.4 Docs**: update `docs/context.md` and add `README.md` (`npm install`, `npm run dev`,
`npm test`, `npm run build` → double-click `dist/index.html`; sandbox URL; regenerating sprites).

---

## Order & size

| Milestone | Tasks | Playable result |
|---|---|---|
| M0 | 6 | Same as today, on Vite; `dist/index.html` plays from disk |
| M1 | 6 | **Level 1 fully playable** |
| M2 | 6 | All towers, upgrades, sell |
| M3 | 4 | All 50 levels playable from a URL param `?level=N` |
| M4 | 3 | Full campaign with menus and saves |
| M5 | 4 | Feels good, roughly balanced |

M1 is the priority: it proves the sim/render split and every later task plugs into it.

## Out of scope

Mobile/touch, sound, enemy walk-cycle animation, endless mode, map editor.
