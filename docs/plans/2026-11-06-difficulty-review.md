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
