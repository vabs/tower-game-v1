# Design Assets Inspirations (Descriptive, No Named References)

Date: 2026-01-22

## 1) Visual Direction
- Theme: modern military, top-down pixel-art.
- Goal: immediate readability under heavy action.
- Style: chunky silhouettes, minimal texture noise, consistent 1px outlines.
- Palette: olive drab, gunmetal, desert tan, muted blues for energy; hazard yellow/red accents.

## 2) Tower Design (30 Towers, L1–L5 Visual Evolution)
- All towers must be readable at small sizes via bold silhouettes and distinct bases.
- Each upgrade adds a visible module:
  - L1: compact base, single barrel.
  - L2: armor plating + thicker barrel.
  - L3: secondary attachment (ammo belt, cooling vent, optics, side weapon).
  - L4: distinctive silhouette element (radar dish, missile rack, reinforced legs).
  - L5: maxed-out look with multiple barrels, power cores, or command antenna.
- Family motifs:
  - Assault: boxy concrete/sandbag bases, thick barrels.
  - Precision: slimmer profiles, long barrels, scope optics.
  - Explosive: heavy barrels, recoil braces, ammo crates.
  - Control/Status: coils, vents, canisters, glowing effect parts.
  - Support: beacons, antenna masts, satellite dishes.
  - Anti-Air: upward-angled barrels + small radar dish (primary AA indicator).

## 3) Projectile + Impact VFX
- Ballistic: bright tracer dots with short trails.
- Explosive: small arcing trails, compact flash on impact, small radius ring.
- Status:
  - Slow: icy blue burst.
  - Burn: orange-red flicker + small ember particles.
  - EMP: pale violet crackle.
- Keep effects tight and brief to maintain battlefield clarity.

## 4) Map Design
- Clear separation between path, buildable, and blocked tiles.
- Path tiles: cracked asphalt or dirt tracks; slightly brighter/darker than surroundings.
- Buildable tiles: concrete pads, metal grates, sandbag edges.
- Blocked tiles: crates, fences, small bunkers, rubble.
- Open-field waypoint maps: subtle beacon posts or dashed route overlays.
- Use sparse props at edges (fuel drums, comms towers, wrecks) to avoid clutter.
- Optional grid overlay toggle for precise placement.

## 5) Enemy Design (Military-Themed)
- Ground enemies: infantry squads and light-to-heavy vehicles only.
- Air enemies: drones, helicopters, jets (no sci-fi/alien silhouettes).
- Silhouette hierarchy:
  - Fast units: narrow/streamlined.
  - Heavy units: wide, armored, blocky.
  - Bosses: larger scale, extra armor blocks, hazard accents.
- Color cues: standard units in olive/gray; heavies darker; fast units with a thin bright stripe.
- Simple animation: 2–4 frame walk cycles, 2–3 frame rotor/jet flicker.

## 6) UI/UX Design (Engaging + Progression Widgets)
- HUD: Level / Wave / HP / Coins in a compact top bar.
- Tower panel: left sidebar icons + costs; right panel shows selected tower stats/upgrades.
- Progress Tracker: small campaign strip with current level and next 3–4 tiles.
- Tech Unlock Tracker: next tower unlock icon + level indicator.
- Mission Brief: small objective card (e.g., no leaks) with medal rewards.
- End-of-level Medal/Grade screen (Bronze/Silver/Gold): time, leaks, spare coins.
- Loadout Summary: top 3 towers used last level; suggested tower family for next level.
- AA clarity: upward-angled barrels + radar dish in-world; tiny sky chevron in UI label.
- Pause/Finish analytics panels:
  - Tower Performance: list of towers built with total damage, kills, and damage-per-coin.
  - Enemy Intel: grid of enemy types encountered with HP, speed, and seen count.
- Core screens:
  - Start Menu: title, Start/Continue, Options, Credits; animated background vignette.
  - Level Select: 1–50 grid with medal badges and locked indicators.
  - Pause Menu: resume, restart, options, quit; show analytics panels.
  - Game Over: brief failure summary (leaks, time), retry/level select buttons.
  - Game End: campaign completion screen with total medals, best towers, and stats recap.

## 7) Readability Rules
- Avoid large explosions that obscure units.
- Strong contrast between enemies and background tiles.
- 1px shadows under props; minimal ambient shading.
- Keep UI frames thin and avoid overdraw on the playfield.
