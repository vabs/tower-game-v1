# Balance & Gameplay Review (Codex gpt-6.1-sol, read-only)

Date: 2026-11-06. Reviewed commit dd47e47 (pre-M5). Measurement script was /tmp/tower-defence-review.mjs (not kept).

92,294
Reviewed `feature/playable-game` read-only. Measurements and baseline bot: [Node script](/tmp/tower-defence-review.mjs).

**1. Balance model.** These are rounded, scaled HP totals and potential income assuming every enemy dies. Income arrives progressively; final payouts cannot fund earlier defense.

| Level | Enemy HP | Start | Kills | Stipends | Supply | Total coins |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2,000 | 200 | 160 | 30 | 0 | 390 |
| 5 | 5,462 | 300 | 346 | 60 | 0 | 706 |
| 10 | 11,573 | 425 | 485 | 75 | 0 | 985 |
| 20 | 34,914 | 675 | 1,048 | 140 | 0 | 1,863 |
| 30 | 64,130 | 925 | 1,600 | 200 | 450 | 3,175 |
| 40 | 111,923 | 1,175 | 2,186 | 270 | 0 | 3,631 |
| 50 | 201,413 | 1,425 | 3,333 | 350 | 0 | 5,108 |

Immediate early calls add at most **10/20/20/30/40/40/45 coins**, respectively. Optional Logistics Hubs add **15 coins per combat wave at tier 1**, before purchase costs.

Good tier-1, single-target DPS/coin:

- **L1:** AR **0.200**; Marksman **0.172**, including expected crits.
- **L5:** SMG **0.229**, but only three-tile range; Grenade **0.200 × enemies splashed**.
- **L10:** those remain competitive; Rocket adds **0.192 × enemies splashed**.
- **L20/30/40/50:** the same inexpensive ground towers remain efficiency leaders. Flak provides **0.205 against air**; SAM **0.190**, with better coverage.

Upgrades strongly discourage investment: AR tier 5 delivers **50.4 DPS for 1,050 cumulative coins: 0.048 DPS/coin**. Its first upgrade buys only six additional DPS for 130 coins.

**Verdict: plausible early, severe later bottlenecks.** HP/total-coin rises from **5.1 to 39.4**. The simple coverage/DPS bot cleared L1/L5 with 25 HP, then lost every later sample; that is diagnostic, not proof of impossibility.

L20 has stronger evidence: its flying boss has **8,218 HP**. All possible pre-boss income, including early bonuses, totals **1,713 coins**. Granting free maximum range/rate auras and ideal positioning, the best fixed AA defense’s optimistic bound is approximately **6,517 damage**. Ordinary mixed defenses face a substantial funding wall.

**2. Concrete bugs and rule mismatches.**

- **Unsafe “first” targeting:** [targeting.js:2](src/systems/targeting.js:2) compares raw distance travelled. Across unequal routes—or air versus ground—it can prioritize an enemy 1,000 pixels from escape over one only 50 pixels away. Use estimated time to exit.
- **Vulnerability bypass:** [effects.js:99](src/sim/effects.js:99), also line 116, applies burn/gas through `applyDamage`, bypassing `shotDamage`. Reproduced: +26% vulnerability still produces 10 damage from a 10-DPS burn.
- **Same-tower gas stacking:** [effects.js:44](src/sim/effects.js:44) refreshes only within half-radius. Fields 40 pixels apart, each radius 72, overlap and double damage: reproduced **12 DPS instead of 6**.
- **Gas ignores rate-aura DPS:** [effects.js:45](src/sim/effects.js:45) uses unmodified data rate. Against a stationary target, faster firing merely refreshes the field.
- **Shock Coil specification mismatch:** [effects.js:71](src/sim/effects.js:71) adds `chains` hops after the initial hit: “2 targets” becomes three. Tests intentionally encode hops; reconcile the design.

No profitable upgrade/sell loop found: AR placement→upgrade→build-phase sale loses **63 coins**. One hundred repeated early-call attempts paid only **five coins**. Seeded execution showed no obvious nondeterminism.

**3. Top eight improvements, ranked by fun-per-effort.**

1. **Remove boss funding walls:** initially try **6× ground / 4× air boss HP**; validate across 20 seeds.
2. **Make upgrades competitive:** target 75–100% of new-tower marginal efficiency; try AR’s first upgrade at **35 coins**, versus 130.
3. **Add “air first” targeting:** default AA to air, then earliest escape; retain manual overrides.
4. **Preview the next two waves:** show counts, flight paths, boss HP and estimated duration before spending.
5. **Meet the duration promise:** L50 already requires **280 seconds just spawning**, or **370 with countdowns**, excluding cleanup. Try seven combat waves maximum, six-second breaks and shorter schedules.
6. **Author three wave identities:** swarm, heavy convoy, air raid; dedicate roughly **70% of each wave’s HP budget** to its identity.
7. **Reduce tower-menu overload:** group six families, surface six favorites, and show upgrade **added DPS / price**, including air modifiers.
8. **Make combinations visible:** display slow percentage, vulnerability percentage and aura recipients; summarize bonus damage attributable to support.

**4. Recommended greedy bot.** Sample every route at **0.5-tile intervals**, including straight air routes. Evaluate legal placements and upgrades by **marginal useful damage per coin** against the next two waves; reserve boss capacity from the opening build. Include travel time, split traffic, projectile misses, overkill and realistic splash occupancy.

Prioritize the weakest route/channel until predicted damage exceeds incoming HP by **20%**. Buy control/support only for measurable added coverage. Prefer new towers until an upgrade wins marginally; reassess every two combat seconds. Buy Hubs only when remaining payouts plus resale exceed cost. Report wins, leaks, boss HP remaining, duration and tower spending across **20 fixed seeds**.

---

## M5 follow-up: fixes, bot and tuning (2026-11-06)

### Bugs from the review (each reproduced with a failing test first, all fixed)

1. "first"/"last" targeting now compares remaining distance to the exit (route length minus distance), so unequal routes and air vs ground work.
2. Burn and gas damage go through `shotDamage`, so Target Painter / Armor Breaker apply.
3. A tower owns at most one live gas field; firing again moves and refreshes it (no overlap stacking).
4. Gas field DPS uses the tower's effective (aura-boosted) fire rate.
5. Shock Coil `chains` is the total number of targets (2/2/3/3/4 targets by level), tests updated.

New: targeting mode `air` (air first, then closest to exit), default for the Anti-Air family, only offered for AA towers.

### Balance bot

`tools/balance-bot.js` (CLI `tools/balance.js`, `npm run balance [-- --levels 1-50 --seeds 5]`) follows section 4 of this review. Every ground path and air line is sampled every half tile. Demand is the live enemies, the unspawned part of the running wave, the next two combat waves, a boss wave up to three waves ahead, and later waves at 30% weight. Each sample gets an HP flux and an exposure time; a tower adds `dps * exposure` (splash, pierce, chains, crits, AA air bonus, slow/stun/vulnerability multipliers, aura boosts). The bot buys the placement or upgrade with the best marginal useful capacity per coin (capacity beyond 1.5x the incoming HP only counts 8%), weighting the weakest channel (path or air line) first so no route is left open. It reassesses at every build phase and every 2 sim-seconds during a wave, and calls each wave immediately. It is deterministic per seed (only the world RNG varies), runs all 50 levels x 5 seeds in about 18 s, and reports win rate, HP left, boss HP remaining on losses, duration (also with the between-wave countdowns a human would wait out), unspent coins and tower count.

### Tuning (mostly data)

- Upgrade costs: `cost(k) = L1cost * (power(k) - power(k-1)) / power(1) / 0.85`, rounded to 5, where power is damage x rate (plus burn DoT) scaled by sqrt(range), splash, pierce, chain, crit, slow, stun and air-bonus factors (support towers use their aura or debuff strength). Every upgrade buys 85% of the power per coin of a new L1 of the same tower; `tests/upgrades.test.js` enforces the 75-100% band for all 30 towers. L1 costs and the +15% in-combat surcharge are unchanged. Example: AR Turret upgrades 130/190/270/380 became 40/45/75/90.
- Bosses: 6x HP for ground and 4x for air (was 12x), plus a per-level `BOSS_TUNE` on boss levels.
- Enemy HP per level: `(1 + 0.03 * (level - 1)) * LEVEL_TUNE[level - 1]` (was `1 + 0.06 * (level - 1)`). `LEVEL_TUNE` / `BOSS_TUNE` in `src/data/waves.js` are fitted by `node tools/autotune.mjs` so the bot ends most levels near 50% HP (chapter 1 near 70%, capped so it stays gentle). Values run 0.35 to 2.4.
- Wave budget `(320 + 14 * level) * (1 + 0.25 * waveIndex)` (was `(400 + 30 * level) * (1 + 0.3 * waveIndex)`); air units get 30% of a mixed wave's HP (50% on every third wave), and no wave is pure air once ground enemies exist.
- Combat waves: 4-6 in chapter 1, 6-7 from L11, never more than 7 (was up to 10). Countdown 10 s to 7 s. Level 1 has a fourth wave and slightly smaller late waves (7+4 and 8+4 grunts/runners).
- Game speed 1x/2x/3x and auto-pause on blur do not change balance, only pace.

### Before / after (bot, per chapter)

Before = the review's data with the five bug fixes applied (3 seeds, naive bot logic of this tool); after = final data (5 seeds). "hpLeft" is the average of won runs. Times are sim seconds at 1x; the last column adds the between-wave countdowns a human waits out.

| Chapter | Win rate before | Win rate after | HP left before | HP left after | Avg time before | Avg time after | After, with countdowns |
|---|---:|---:|---:|---:|---:|---:|---:|
| L1-10 | 90% | 100% | 100% | 76% | 97 s | 143 s | 175 s |
| L11-20 | 23% | 100% | 27% | 50% | 113 s | 125 s | 167 s |
| L21-30 | 20% | 100% | 62% | 52% | 109 s | 158 s | 201 s |
| L31-40 | 0% | 100% | n/a | 61% | 88 s | 133 s | 176 s |
| L41-50 | 0% | 100% | n/a | 58% | 67 s | 126 s | 169 s |

Before-times are short because most runs were losses. After: 47 of 50 levels take 2-4 minutes with countdowns (L1 106 s, L25/L26 about 4.2 min), L50 is 199 s. L50 bot HP left is 100% and L10, L20, L32, L34 are above 85%; the bot is an upper bound for a human, so these are expected to feel harder for people.

Level 1 check: 3 AR Turrets (the M1 test layout) win with 19/25 HP, 2 ARs win with 9 HP, no towers lose (38 leaks).

### Known limits

- The bot is far from perfect: it never sells, ignores Logistics Hubs and does not use targeting modes, so human play can be both better and worse. Per-level HP left is noisy (a defence either holds a route or leaks several enemies), so individual levels sit between about 12% and 100% bot HP left, not on exactly 50%.
- `LEVEL_TUNE` is a fitted table, not a closed form, and should be refitted (`node tools/autotune.mjs --write`) after any change to towers, enemies, maps or the bot.
- Still open from the list above: wave preview, wave identities, tower menu grouping, combination readouts.
