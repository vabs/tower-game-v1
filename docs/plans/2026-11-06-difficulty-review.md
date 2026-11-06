# Difficulty Review: Bot vs Human Proxy (Codex gpt-6.1-sol, read-only)

Date: 2026-11-06. Reviewed snapshot 87918e3 (after M5). Human-proxy bot: tools/human-bot profile in tools/balance-bot.js (added in G2).

**Your concern is justified: keep per-level compensation, but stop using this bot’s HP as the sole difficulty target.** Review used a frozen snapshot of `87918e3`; I made no repo edits. [Reproduction notes], [results].

**1. The curve is jagged—but smoothing raw multipliers makes it worse.**

Actual `LEVEL_TUNE` examples:

- L7–11: **2.40, 2.40, 1.76, 1.06, 1.17**
- L19–22: **1.38, 0.35, 1.70, 1.29**
- L31–33: **1.41, 0.39, 0.66**

Boss-only multipliers at L10/20/30/40/50 are **0.94/0.45/1.29/0.61/0.69**; bosses also receive `LEVEL_TUNE`.

These compensate for different routes, enemy compositions, and income. A three-point arithmetic moving average raised L20’s tune **0.35→1.14** and L32’s **0.39→0.82**. Both fell from **20/20 greedy wins to 0/20**.

Nevertheless, outcomes are visibly uneven: L10→11 increases ordinary enemy HP only **13%**, yet greedy HP-left drops **100%→31.6%**, alongside the map change and air introduction.

**Recommendation:** retain map-specific corrections. Fit a gently increasing *challenge target* within each chapter, then refit each level against multiple policies. Use a three-level median of measured outcomes to flag outliers, rather than averaging multipliers. Separate boss checkpoints; investigate ordinary adjacent levels differing by **>15 percentage points** in proxy win rate.

**2. Human-like simulation**

Ran **20 seeds × 50 levels per policy**. Proxy purchases/upgrades only during build, uses “first” targeting throughout, and selects placements worth approximately **65–75%** of the greedy placement’s marginal value. It retains greedy tower selection, upgrade choices, and future-wave knowledge—so this remains an optimistic player proxy.

| Chapter | Greedy HP left | Proxy win rate | Proxy HP left |
|---|---:|---:|---:|
| 1–10 | 73.9% | 96% | 62.7% |
| 11–20 | 50.4% | 87% | 39.2% |
| 21–30 | 51.6% | 78.5% | 48.6% |
| 31–40 | 61.1% | 89.5% | 60.2% |
| 41–50 | 57.8% | 97% | 48.2% |

Greedy wins **100%** throughout. HP means count losses as zero; win rates describe independent level runs, not complete-chapter clears.

The averages conceal bottlenecks: proxy wins **0/20 at L19 and L31**, **3/20 at L22**, and **1/20 at L25**.

There is no defensible universal “humans are X% weaker” conversion. This proxy loses **10.4%** overall versus zero greedy losses. Surprisingly, ideal placement with build-only purchasing raises greedy HP-left **59.0%→70.3%**: rapid spending is not uniformly beneficial.

**3. Concrete starting targets**

Target strong-bot HP-left by chapter at **95%, 85%, 80%, 80%, 75%**. These are starting targets, not guarantees. Require the proxy to win **≥90% on every ordinary level**, with its tenth-percentile HP-left **≥20%**. Fix L19/L22/L25/L31 before trusting chapter averages.

Recruit’s **HP ×0.75, coins ×1.25** is suitable for accessibility: approximately **40% less HP per coin**. Emulating increased starting coins and payouts produced **100% proxy wins in every chapter**.

Veteran’s **HP ×1.2 plus leak +1** is too steep: proxy chapter wins become **45.5/32.5/33.5/40.5/22.5%**; even greedy wins only **30–44%**. Grunt leak damage doubles. Start at **HP ×1.10, normal coins, normal leaks**, then reassess after Regular tuning.

**4. Replay improvements**

1. **Six-tower loadouts**, locked per mission; require AA when aircraft appear.
2. **Tier-three specialization** for six core towers: choose range or damage, with permanent tradeoffs.
3. **Optional contracts:** clear with ≤8 towers, ≤2 families, or no tier-four upgrades; award cosmetic badges.
4. **Seeded remixes after clearing:** allocate 70% of wave budget to swarm/heavy/air identities while preserving total budgets.
5. **Boss phases:** at 50% HP summon six budgeted escorts; at 25%, gain 20% speed. Deduct escorts from the existing wave budget.

---

## Follow-up: human-proxy tuning, boss phases, contracts (2026-11-06, second gameplay pass)

### What changed

- **Human proxy is now part of the repo.** `tools/balance-bot.js` takes `difficulty`, `buildOnly`, `placement` and `firstOnly` options (`HUMAN_PROFILE = { buildOnly: true, placement: 0.7, firstOnly: true }`). The placement degradation draws from its own rng (`createRng(seed * 1009 + level * 7919)`), so the sim rng is untouched and every run is deterministic per seed. The reviewer's hp/coin/leak multipliers are gone: `difficulty` is the real `createWorld` option (the bot's demand model also applies the difficulty HP multiplier). `tools/balance.js` got `--profile greedy|human`, `--difficulty` and `--seed0` (seed offset, to validate on unseen seeds); the human output per level is win rate, p10 HP-left and mean HP-left. `tools/sweep.mjs` runs bot jobs in worker threads (identical results, about 10x faster), which makes fitting against 15 runs per level practical.
- **Boss phases (sim).** They change boss difficulty, so tuning was done after them (see below).
- **Tuning is data only**: `LEVEL_TUNE` / `BOSS_TUNE` in `src/data/waves.js`. Wave budgets, escort shares and wave shapes are unchanged.

### Tuning method (`tools/autotune.mjs`, rewritten)

Each iteration measures every level with 5 greedy seeds and 10 human seeds (seeds 1-10), then moves the level's multiplier by `f = 1 + 0.6 * d` (clamped 0.7-1.4 per step):

- greedy target: chapter targets 95/85/80/80/75% HP-left, with a ramp of +5 to -5 points across each chapter so difficulty rises inside a chapter (capped at 100%);
- human floor: p10 HP-left must be at least 30% (the requirement is 20%, the rest is margin for seed noise), win rate at least 90%; boss levels use the human mean HP-left minus 0.40 and an 80% win floor;
- a level that misses the human floor or is more than 8 points under the greedy target is made easier by the worse deficit; otherwise it moves by `0.6 * greedy deficit + 0.4 * (human mean HP-left - median of the human means of the ordinary levels around it in the same chapter)`. That is the 3-level median check: a level that is much easier or harder for humans than its neighbours is pulled toward them by changing only its own multiplier. No table is averaged (the review showed that breaks L20/L32);
- per level the iterate that met every target with the best greedy/neighbour fit is kept. Boss levels split the correction between `LEVEL_TUNE` and `BOSS_TUNE`.

About 50 iterations in total over four runs (autotune takes `--iters`, `--levels`, `--gseeds`, `--hseeds`, `--write`). Validation used seeds nobody fitted on (`--seed0 101`, 20 human seeds, 8 greedy seeds): every ordinary level keeps >= 90% wins and p10 >= 20%, boss levels >= 90%.

### Result, Regular difficulty

Greedy bot (5 seeds, mean HP-left of won runs; wins are 100% everywhere):

| Chapter | Target | Before | After |
|---|---:|---:|---:|
| 1-10 | 95 | 76 | 97 |
| 11-20 | 85 | 49 (L20 boss lost 2/5 after phases) | 86 |
| 21-30 | 80 | 52 | 81 |
| 31-40 | 80 | 61 | 83 |
| 41-50 | 75 | 58 | 78 |

Human proxy (10 seeds, Regular):

| Chapter | Win% before | Win% after | p10 HP% before | p10 HP% after | Mean HP% before | Mean HP% after |
|---|---:|---:|---:|---:|---:|---:|
| 1-10 | 97 | 100 | 50 | 86 | 63 | 93 |
| 11-20 | 88 | 100 | 31 | 77 | 38 | 83 |
| 21-30 | 74 | 99 | 38 | 69 | 47 | 78 |
| 31-40 | 89 | 100 | 49 | 86 | 59 | 93 |
| 41-50 | 96 | 100 | 33 | 61 | 49 | 74 |

On unseen seeds 101-120: 100/100/99/100/100% wins, p10 89/76/68/85/57.

Per level (human = 10 seeds, greedy = 5 seeds; "before" is the previous tune, measured with the same bots):

| L | Human win% before | Human win% after | p10 HP% before | p10 HP% after | Human mean HP% after | Greedy HP% before | Greedy HP% after |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 100 | 100 | 92 | 92 | 97 | 100 | 100 |
| 2 | 90 | 100 | 4 | 84 | 96 | 67 | 98 |
| 3 | 100 | 100 | 48 | 92 | 98 | 68 | 100 |
| 4 | 100 | 100 | 12 | 92 | 98 | 56 | 100 |
| 5 | 80 | 100 | 0 | 84 | 94 | 64 | 99 |
| 6 | 100 | 100 | 84 | 100 | 100 | 76 | 96 |
| 7 | 100 | 100 | 72 | 72 | 84 | 76 | 92 |
| 8 | 100 | 100 | 4 | 48 | 67 | 74 | 98 |
| 9 | 100 | 100 | 84 | 100 | 100 | 76 | 88 |
| 10 (boss) | 100 | 100 | 100 | 100 | 100 | 100 | 100 |
| 11 | 100 | 100 | 12 | 80 | 85 | 32 | 90 |
| 12 | 100 | 100 | 68 | 68 | 71 | 68 | 92 |
| 13 | 100 | 100 | 4 | 64 | 69 | 36 | 92 |
| 14 | 100 | 100 | 32 | 72 | 79 | 53 | 82 |
| 15 | 100 | 100 | 28 | 88 | 86 | 32 | 84 |
| 16 | 100 | 100 | 24 | 92 | 96 | 48 | 91 |
| 17 | 100 | 100 | 52 | 76 | 79 | 52 | 84 |
| 18 | 80 | 100 | 0 | 56 | 64 | 48 | 60 |
| 19 | 0 | 100 | 0 | 76 | 89 | 32 | 88 |
| 20 (boss) | 100 | 100 | 92 | 100 | 99 | 88 | 92 |
| 21 | 100 | 100 | 56 | 68 | 74 | 56 | 84 |
| 22 | 10 | 100 | 0 | 40 | 52 | 34 | 87 |
| 23 | 100 | 100 | 28 | 72 | 90 | 52 | 84 |
| 24 | 100 | 100 | 36 | 68 | 82 | 56 | 80 |
| 25 | 0 | 100 | 0 | 84 | 87 | 36 | 84 |
| 26 | 100 | 100 | 92 | 52 | 69 | 92 | 90 |
| 27 | 100 | 100 | 36 | 80 | 85 | 28 | 68 |
| 28 | 100 | 100 | 80 | 80 | 80 | 80 | 80 |
| 29 | 100 | 100 | 56 | 84 | 88 | 42 | 74 |
| 30 (boss) | 30 | 90 | 0 | 64 | 74 | 44 | 76 |
| 31 | 0 | 100 | 0 | 68 | 89 | 49 | 84 |
| 32 | 100 | 100 | 100 | 92 | 97 | 100 | 92 |
| 33 | 100 | 100 | 32 | 88 | 92 | 52 | 84 |
| 34 | 100 | 100 | 80 | 92 | 98 | 88 | 80 |
| 35 | 100 | 100 | 24 | 84 | 90 | 24 | 88 |
| 36 | 90 | 100 | 16 | 84 | 94 | 54 | 64 |
| 37 | 100 | 100 | 28 | 100 | 100 | 32 | 100 |
| 38 | 100 | 100 | 60 | 76 | 82 | 56 | 76 |
| 39 | 100 | 100 | 52 | 76 | 85 | 68 | 76 |
| 40 (boss) | 100 | 100 | 96 | 96 | 99 | 88 | 88 |
| 41 | 100 | 100 | 36 | 68 | 77 | 58 | 79 |
| 42 | 100 | 100 | 12 | 72 | 78 | 56 | 80 |
| 43 | 100 | 100 | 24 | 44 | 74 | 52 | 76 |
| 44 | 100 | 100 | 40 | 52 | 76 | 48 | 80 |
| 45 | 90 | 100 | 12 | 40 | 60 | 48 | 76 |
| 46 | 100 | 100 | 36 | 52 | 60 | 52 | 76 |
| 47 | 100 | 100 | 64 | 72 | 82 | 68 | 76 |
| 48 | 70 | 100 | 0 | 48 | 61 | 84 | 68 |
| 49 | 100 | 100 | 12 | 60 | 70 | 16 | 76 |
| 50 (boss) | 100 | 100 | 92 | 100 | 100 | 100 | 92 |

Requirement check (human proxy, Regular, 10 seeds): every ordinary level wins >= 90% (all 100%) with p10 HP-left >= 40% (lowest: L8 48, L22 40, L45 40, L43 44); boss levels win 100% (L10, L20, L40, L50) and 90% (L30). No adjacent ordinary levels differ by more than 15 points in win rate (all are 100%, L30 aside, which is a boss). The 3-level median check on human mean HP-left (flag when more than 20 points from the median of its same-chapter neighbours) leaves **L22** (mean 52 against 74/90 around it; wins 100%, p10 40) and L47. L22 is a structural gap: the greedy bot clears it with 100% HP (its AA and mid-wave purchases are not what a build-only "first" player does on that branching map), so making it easier for the proxy would make it trivial for the strong bot. It stays flagged. Other human-hard levels (L8, L26, L45, L48 at 60-67% mean HP-left) are inside the target band.

### Recruit and Veteran

| Chapter | Recruit human win% / mean HP% | Veteran x1.10 (old tune) human win% | Veteran x1.40 human win% | p10 / mean HP% |
|---|---:|---:|---:|---:|
| 1-10 | 100 / 100 | 75 | **71** | 18 / 34 |
| 11-20 | 100 / 95 | 83 | 100 | 44 / 52 |
| 21-30 | 100 / 94 | 70 | **72** | 37 / 43 |
| 31-40 | 100 / 100 | 86 | 98 | 43 / 56 |
| 41-50 | 100 / 97 | 74 | **56** | 8 / 20 |

Recruit is at about 100% in every chapter as intended. Veteran at x1.10 was far too gentle after the retune (the Regular curve now has slack), so it is **x1.40** (README, tests and `core/difficulty.js` updated). A single global multiplier cannot fit every chapter: chapters 2 and 4 stay near 100% wins (their human proxy has the most slack, because their multipliers are the lowest) while chapters 1, 3 and 5 sit in the 50-75% band. x1.60 gives 46/93/65/77/42, which has more chapters outside the band, so x1.40 was kept. A per-chapter Veteran multiplier would be the next step if chapters 2 and 4 should bite too.

### Boss phases (rules)

- Below 50% HP, once: the boss calls 4-6 escorts of its own movement type (ground boss, ground escorts; air boss, air escorts) from the level roster, spawned on the boss's path at its current distance (staggered 0.4 tile behind it). The roster type whose natural count for the budget is closest to 5 is used, and each escort gets budget / count HP so the group totals exactly 10% of the boss's max HP. Escorts count as normal enemies (kill coins, leaks, wave completion).
- Below 25% HP, once: enrage, +20% speed (multiplies on top of slows). Events: `bossPhase` with `phase: 'escorts' | 'enrage'`; the HUD shows "Escorts inbound!" and "Boss enraged!" banners, the renderer draws notches at 50% and 25% on the boss HP bar and a pulsing red tint while enraged.
- The escorts were not deducted from the wave budget: they are part of the boss's tuned difficulty and the tuning above was run after them. The greedy bot's demand model does not know about escorts; the tuning absorbs it.
