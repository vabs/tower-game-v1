# Project Context

Date: 2026-01-22

## Overview
This repository contains a modern-military, pixel-art tower defense game built with HTML/CSS/JavaScript. The game targets desktop browsers and uses a Canvas-based playfield with DOM-based UI panels.

## Key Design Goals
- 50 levels with hybrid map layouts (single lane, branching, open-field).
- 30 tower types, each with 5 linear upgrade levels and unique visuals.
- 20 enemy types (ground and air), simple traits (HP/speed/flying).
- Economy: single currency; end-wave stipend scales by level.
- Supply Drop waves every 6 levels as extra (non-combat) waves.

## Architecture Summary
- **Data**: `src/data/` holds tower, enemy, and level definitions.
- **Systems**: `src/systems/` covers economy, waves, targeting, collision, status.
- **Entities**: `src/entities/` includes tower, enemy, projectile basics.
- **UI**: `src/ui/` contains HUD, placement, analytics panels.
- **Game Loop**: `src/game/game.js` + `src/render/renderer.js`.

## Assets
- Pixel-art SVG and PNG sprites live in `assets/`.
- Manifest at `assets/manifest.json` maps all generated assets.

## How to Run
1) Serve locally: `python -m http.server 8000`
2) Open: `http://localhost:8000`

## How to Test
- `npm test`

## Current Status
- Core scaffolding, data tables, and basic simulation loop are in place.
- HUD panels are placed in side panels + top bar (not overlaying the canvas).
- Analytics panels are wired for pause/game-over/game-end.

## Next Steps
- Replace placeholder gameplay loop with full wave/tower/enemy logic.
- Wire placement interactions and tower selection/upgrade flow.
- Enhance rendering with real sprites and tile maps.

