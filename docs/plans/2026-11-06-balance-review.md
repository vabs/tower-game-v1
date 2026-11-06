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
