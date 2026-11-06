# Tower Defence

A browser tower-defence game: 50 levels, 30 towers with 5 upgrade levels each, 20 enemy types (ground and air), bosses, medals and a local save. Modern-military pixel-art theme, Canvas playfield with DOM panels. No server, no network: the production build is one HTML file.

**Play online:** https://vabs.github.io/tower-game-v1/ (deployed from `main` by `.github/workflows/pages.yml`).

## Run it

```bash
npm install
npm run dev          # Vite dev server, open the printed URL
npm test             # vitest: simulation, data and UI-logic tests
npm run smoke        # Playwright + local Chrome drive the real page (screenshots in smoke-out/)
npm run build        # single-file build -> dist/index.html (double-click it, no server needed)
npm run balance      # balance bot over all 50 levels (see below)
```

`npm run smoke` needs Google Chrome installed (it uses `playwright-core` with the `chrome` channel).

### URL shortcuts

- `?level=N` jumps straight into level N (1-50), bypassing the menus and the unlock lock.
- `?sandbox=1` opens a sandbox with all 30 towers and plenty of coins, for trying things out.

In dev builds the running state is exposed as `window.__td` (`world`, `app`, `sm`, `screens`).

## Controls

| Input | Action |
|---|---|
| Click a tower button, then click a tile | Place a tower (hover a button for stats) |
| Shift + click | Keep the tower armed and place several |
| Click a placed tower | Select it (upgrade, sell, targeting) |
| Right click | Cancel placement |
| Space | Start the next wave, or call it early |
| A | Auto-wave on/off: each wave starts as soon as the previous one is cleared (the first wave still waits for you); also the **Auto** button in the top bar |
| U | Upgrade the selected tower |
| S or Delete | Sell the selected tower (press twice within 1.5 s during a wave) |
| T | Cycle targeting of the selected tower |
| Tab (Shift+Tab) | Select next (previous) tower |
| 1 / 2 / 3 | Game speed 1x / 2x / 3x (the top-bar button cycles too) |
| M | Mute / unmute all audio |
| Esc | Cancel placement, otherwise pause / resume |
| N | Sandbox only: spawn a test wave |

The same list is on the pause screen. The game pauses by itself when the window loses focus or the tab is hidden during a level. Early-calling the next wave during the countdown pays a small bonus.

## Audio

Music and sound effects are synthesized at runtime with the Web Audio API: no audio files, so the single-file build stays small and works from `file://` and GitHub Pages. Browsers block audio until a user gesture, so sound starts on your first click or key press.

- **M** (or the speaker button in the top bar) mutes everything. Music and effects volume sliders are on the Pause screen, and the Start screen has an Audio row. Settings are saved (`settings` in the save file) and survive New Campaign.
- Music follows the game: menu theme on the menus, a calm track while you build and during the countdown, a driving track during waves, a tense one for boss waves, with a 1 s crossfade. Victory and defeat have short stings, and each wave start has one (boss waves get an alarm). Pausing ducks the music; hiding the tab suspends audio. Music tempo never changes with game speed.
- Effects: per-family tower fire sounds, explosions, kills and coin chimes, leak alarm, place / upgrade / sell, invalid-action buzz, supply drop, boss phases, UI clicks. Voice limiting (per-sound cap, retrigger interval, global cap) keeps big waves from turning into noise.
- Music is data: tracks live in `src/audio/tracks.js` (schema documented at the top of that file) and can be edited without touching engine code. `npm test` validates every track.
- In dev builds `window.__td.audio.debug()` reports context state, master gain, current track and effect counters.

## Difficulty

Pick Recruit, Regular or Veteran on the Start screen (also in Level Select); it is saved. Recruit: enemy HP x0.75 and +25% starting coins. Regular: the tuned baseline. Veteran: enemy HP x1.40 (the Veteran multiplier was fitted so the human-proxy bot wins roughly 50-75% of levels in most chapters). Medals are per level; Level Select tags a medal earned on Recruit (R) or Veteran (V). Autotune always fits Regular; `npm run balance -- --difficulty veteran` measures the others.

## Boss phases and contracts

Bosses call 4-6 escorts (about 10% of the boss's HP, same movement type) below 50% HP and enrage (+20% speed, red pulse) below 25%; the boss HP bar has notches at both thresholds. Every level also has one optional contract (shown in the Mission card and on Level Complete, a check mark on Level Select, totals on Start / Game End, stored in the save as `contracts`): at most N towers, at most 2 tower families, no upgrades beyond L3, no selling, or (levels without air) no Anti-Air. They are cosmetic: medals and unlocks do not depend on them.

## Balance bot

`npm run balance [-- --levels 1-50 --seeds 5]` plays every requested level with a deterministic greedy bot (`tools/balance-bot.js`) and prints win rate, average HP left, boss HP remaining on losses, level duration in sim seconds and unspent coins, plus a per-chapter summary. It only uses the public sim commands (place, upgrade, start wave), so it measures the real rules.

- `--profile human` plays the "human proxy" instead (buys only between waves, picks placements worth about 70% of the best, every tower on "first" targeting) and prints win rate, p10 and mean HP-left per level; `--difficulty recruit|regular|veteran` and `--seed0 N` (first seed) work with both profiles. Humans should win at least 90% of ordinary levels and 75% of boss levels on Regular.
- `node tools/upgrade-costs.mjs --write` regenerates the upgrade costs of all 30 towers from one formula (each upgrade buys 85% of the power per coin of a fresh L1).
- `node tools/autotune.mjs --write` re-fits `LEVEL_TUNE` / `BOSS_TUNE` in `src/data/waves.js` against both profiles (greedy HP-left near 95/85/80/80/75% per chapter, human proxy winning with margin, a 3-level median check against outliers).
- `docs/plans/2026-11-06-balance-review.md` has the review that started this, and the before/after table.
