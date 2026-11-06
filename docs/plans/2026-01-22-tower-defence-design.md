# Tower Defence Design (Modern Military, Pixel-Art)

Date: 2026-01-22

## 1) Goals and Constraints
- HTML/JS/CSS game (desktop only).
- 50 levels, short and fast (2–4 minutes each).
- 30 tower types, each with linear upgrades L1→L5.
- Max 5 upgrades on a tower; each upgrade changes tower style.
- 20 enemy types; simple traits (HP + speed + flying only).
- Hybrid maps: mix of single lane, branching, and open-field waypoint maps.
- Waves: minimum 3 per level, scaling up by chapter; occasional cash-only “Supply Drop” waves (extra wave, not counted in totals).
- Economy: single currency (coins), earned from kills + end-wave stipend.
- Boss waves at levels 10/20/30/40/50.
- Tower upgrades available in-combat or between levels; in-combat costs +15%.

## 2) Core Loop
1) Choose level → place towers on grid buildable tiles.
2) Survive 3+ combat waves (scales by level); kill enemies for coins.
3) Optional in-combat upgrades (cost +15%).
4) End wave grants stipend; Supply Drop wave (extra) grants flat coins.
5) End level → research unlocks new towers (no stat boosts).

## 3) Theme + UX
- Modern military pixel-art. Clear silhouettes, turret evolution per upgrade.
- HUD: coins, HP (100), wave number, tower panel, upgrade buttons.
- Targeting priority toggle per tower (first/closest/strongest).

## 4) Economy + HP
- Base HP: 100. Enemy leaks reduce HP by 1–5 depending on type (tuned in balance pass).
- Coins from kills + end-wave stipend scaled by level.
- End-wave stipend: 10 + floor(level/2) coins per wave.
- Wave count scaling: L1–10 (3–5), L11–20 (5–7), L21–30 (6–8), L31–40 (7–9), L41–50 (8–10).
- Supply Drop wave every 6 levels (6/12/18/24/30/36/42/48), coins: 150 + 10×level (extra wave).

## 5) Progression Structure (50 Levels)
- Chapters: five blocks of 10 levels.
- Bosses at 10/20/30/40/50.
- Unlock cadence: T1–T6 unlocked via between-level research (some T6 earlier per user preference).

### Levels 1–10
1) L1: single lane, 3 waves; Grunt/Runner; unlock AR Turret, Marksman, AA MG.
2) L2: branching, 4 waves; add Scout/Trooper; unlock SMG Nest.
3) L3: open field, 4 waves; add Bruiser; unlock Grenade Launcher.
4) L4: single lane, 5 waves; mixed Runner/Scout packs; unlock Mortar + Target Painter.
5) L5: branching, 5 waves; add Skirmisher; unlock Cryo Sprayer.
6) L6: open field, 4 waves; Supply Drop extra after wave 3; unlock Sniper Nest + Flak Cannon.
7) L7: single lane, 5 waves; add Breaker; unlock Incendiary Turret.
8) L8: branching, 5 waves; introduce Heavy; unlock LMG Bunker + EMP Node.
9) L9: open field, 5 waves; mixed Grunt/Runner/Heavy; unlock Rocket Pod.
10) L10: hybrid, 5 waves with Heavy Boss final; unlock Gatling Turret.

### Levels 11–20
11) L11: branching, 5 waves; introduce Drone (air); unlock SAM Site.
12) L12: open field, 5 waves; Supply Drop extra after wave 3; unlock Ammo Feeder.
13) L13: single lane, 6 waves; introduce Jet (air); unlock Gauss Rifle.
14) L14: split lanes, 6 waves; heavier ground; unlock Shock Coil.
15) L15: open field, 6 waves; introduce Bomber (air); unlock Howitzer.
16) L16: branching, 6 waves; mixed air/ground; unlock Command Uplink.
17) L17: single lane, 7 waves; introduce Vanguard; unlock Gas Projector.
18) L18: open field, 6 waves; Supply Drop extra after wave 4; unlock Laser AA.
19) L19: branching, 7 waves; introduce Gunship (air); unlock Armor Breaker.
20) L20: hybrid, 7 waves with Sky Tank Boss final; unlock Rail Autocannon.

### Levels 21–30
21) L21: single lane, 6 waves; introduce Tank; unlock Coilgun.
22) L22: branching, 6 waves; mixed Tank/Heavy + air; unlock Interceptor Drone.
23) L23: open field, 7 waves; introduce Crawler (swarm); unlock Cluster Cannon.
24) L24: open field, 6 waves; Supply Drop extra after wave 3; unlock Logistics Hub.
25) L25: split lanes, 7 waves; introduce Bulldozer; unlock Longshot Beacon.
26) L26: branching, 7 waves; introduce Raider; upgrades focus.
27) L27: open field, 7 waves; mixed Crawler + Bomber; upgrades focus.
28) L28: single lane, 8 waves; introduce Marauder; upgrades focus.
29) L29: branching, 8 waves; Tank + Gunship; upgrades focus.
30) L30: hybrid, 8 waves with Tank Boss final; Supply Drop extra after wave 3; upgrades focus.

### Levels 31–40
31) L31: branching, 7 waves; introduce Sky Tank (air heavy); upgrades focus.
32) L32: open field, 7 waves; introduce Stealth Copter; upgrades focus.
33) L33: single lane, 8 waves; Crawler/Runner rushes; upgrades focus.
34) L34: hybrid, 8 waves; alternating air/ground; upgrades focus.
35) L35: open field, 8 waves; Bulldozer + Bomber; upgrades focus.
36) L36: branching, 7 waves; Supply Drop extra after wave 3; upgrades focus.
37) L37: single lane, 8 waves; Tank + Raider packs; upgrades focus.
38) L38: open field, 8 waves; Gunship + Sky Tank; upgrades focus.
39) L39: hybrid, 9 waves; dense mixed comps; upgrades focus.
40) L40: hybrid, 9 waves with Sky Tank Boss final; upgrades focus.

### Levels 41–50
41) L41: branching, 8 waves; heavy mixed air/ground; upgrades focus.
42) L42: open field, 8 waves; Supply Drop extra after wave 3; upgrades focus.
43) L43: single lane, 9 waves; swarms + Tanks; upgrades focus.
44) L44: hybrid, 9 waves; air rush + ground brutes; upgrades focus.
45) L45: open field, 9 waves; heavy ground w/ air; upgrades focus.
46) L46: branching, 9 waves; fast Raider/Crawler packs; upgrades focus.
47) L47: hybrid, 10 waves; mixed late-game density; upgrades focus.
48) L48: open field, 9 waves; Supply Drop extra after wave 3; upgrades focus.
49) L49: single lane, 10 waves; layered heavies + air squads; upgrades focus.
50) L50: hybrid finale, 10 waves with mixed Boss final (Bulldozer Boss then Sky Tank Boss).

## 6) Enemy Roster (20 Types)
Traits: HP + speed; flying units use AA targeting; no elemental resistances.
Scaling: base HP × (1 + 0.06 × level), speed × (1 + 0.01 × floor(level/10)).

| # | Enemy | Type | HP | Speed | Coins |
|---|-------|------|----|-------|-------|
| 1 | Grunt | Ground | 80 | 1.0 | 6 |
| 2 | Runner | Ground | 50 | 1.6 | 5 |
| 3 | Bruiser | Ground | 140 | 0.8 | 9 |
| 4 | Heavy | Ground | 220 | 0.6 | 12 |
| 5 | Scout | Ground | 65 | 1.3 | 6 |
| 6 | Skirmisher | Ground | 95 | 1.1 | 7 |
| 7 | Trooper | Ground | 110 | 1.0 | 8 |
| 8 | Breaker | Ground | 180 | 0.9 | 10 |
| 9 | Tank | Ground | 300 | 0.5 | 16 |
|10 | Bulldozer | Ground | 420 | 0.45 | 20 |
|11 | Crawler | Ground | 70 | 1.4 | 6 |
|12 | Raider | Ground | 120 | 1.2 | 8 |
|13 | Vanguard | Ground | 260 | 0.7 | 14 |
|14 | Marauder | Ground | 160 | 1.0 | 9 |
|15 | Drone | Air | 60 | 1.4 | 6 |
|16 | Jet | Air | 90 | 1.7 | 8 |
|17 | Bomber | Air | 150 | 1.0 | 10 |
|18 | Gunship | Air | 220 | 0.9 | 12 |
|19 | Sky Tank | Air | 320 | 0.7 | 16 |
|20 | Stealth Copter | Air | 130 | 1.5 | 9 |

Boss HP = 12× a same-tier heavy unit.

## 7) Tower Families and Roles
Families: Assault (DPS), Precision (single target), Explosive (AOE), Control/Status, Support, Anti-Air.
Each tower has linear upgrades L1→L5; each upgrade changes visual style.

## 8) Tower Stats (L1→L5)
All values are per tower level and in tiles/seconds. In-combat upgrade costs +15%.

### Assault (General DPS)
**AR Turret**
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 8 | 2.0 | 4.0 | 80 |
| 2 | 10 | 2.2 | 4.2 | 130 |
| 3 | 12 | 2.4 | 4.5 | 190 |
| 4 | 15 | 2.6 | 5.0 | 270 |
| 5 | 18 | 2.8 | 5.5 | 380 |

**SMG Nest**
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 4 | 4.0 | 3.0 | 70 |
| 2 | 5 | 4.3 | 3.2 | 120 |
| 3 | 6 | 4.6 | 3.5 | 180 |
| 4 | 8 | 5.0 | 3.8 | 260 |
| 5 | 10 | 5.5 | 4.0 | 370 |

**LMG Bunker**
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 10 | 1.8 | 4.5 | 120 |
| 2 | 12 | 1.9 | 4.7 | 180 |
| 3 | 14 | 2.0 | 5.0 | 260 |
| 4 | 18 | 2.2 | 5.3 | 360 |
| 5 | 22 | 2.4 | 5.5 | 520 |

**Gatling Turret** (1s spool-up)
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 6 | 3.0 | 4.5 | 150 |
| 2 | 7 | 3.5 | 4.7 | 230 |
| 3 | 8 | 4.0 | 5.0 | 330 |
| 4 | 10 | 4.8 | 5.2 | 470 |
| 5 | 12 | 5.5 | 5.5 | 660 |

**Rail Autocannon** (pierce)
| Lvl | Dmg | Rate | Range | Cost | Pierce |
|-----|-----|------|-------|------|--------|
| 1 | 28 | 1.0 | 6.0 | 220 | 2 |
| 2 | 32 | 1.1 | 6.2 | 330 | 2 |
| 3 | 38 | 1.2 | 6.5 | 480 | 3 |
| 4 | 48 | 1.3 | 6.7 | 680 | 3 |
| 5 | 60 | 1.4 | 7.0 | 950 | 4 |

### Precision (Single-Target)
**Marksman Tower** (crit 2x)
| Lvl | Dmg | Rate | Range | Cost | Crit |
|-----|-----|------|-------|------|------|
| 1 | 18 | 1.0 | 5.5 | 110 | 5% |
| 2 | 22 | 1.1 | 5.8 | 170 | 6% |
| 3 | 26 | 1.2 | 6.2 | 250 | 7% |
| 4 | 32 | 1.3 | 6.6 | 360 | 8% |
| 5 | 38 | 1.4 | 7.0 | 500 | 9% |

**Sniper Nest** (crit 2x)
| Lvl | Dmg | Rate | Range | Cost | Crit |
|-----|-----|------|-------|------|------|
| 1 | 40 | 0.6 | 7.0 | 180 | 10% |
| 2 | 48 | 0.65 | 7.3 | 260 | 11% |
| 3 | 58 | 0.7 | 7.6 | 380 | 12% |
| 4 | 70 | 0.75 | 8.0 | 540 | 13% |
| 5 | 85 | 0.8 | 8.5 | 760 | 14% |

**Gauss Rifle**
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 55 | 0.55 | 6.5 | 220 |
| 2 | 66 | 0.58 | 6.8 | 320 |
| 3 | 80 | 0.62 | 7.2 | 470 |
| 4 | 96 | 0.66 | 7.6 | 660 |
| 5 | 115 | 0.7 | 8.0 | 920 |

**Coilgun**
| Lvl | Dmg | Rate | Range | Cost |
|-----|-----|------|-------|------|
| 1 | 90 | 0.4 | 7.0 | 320 |
| 2 | 110 | 0.42 | 7.3 | 460 |
| 3 | 135 | 0.44 | 7.6 | 660 |
| 4 | 165 | 0.46 | 8.0 | 920 |
| 5 | 200 | 0.48 | 8.4 | 1280 |

**Longshot Beacon** (crit 2x)
| Lvl | Dmg | Rate | Range | Cost | Crit |
|-----|-----|------|-------|------|------|
| 1 | 75 | 0.5 | 8.5 | 300 | 8% |
| 2 | 90 | 0.52 | 8.8 | 440 | 9% |
| 3 | 110 | 0.55 | 9.2 | 640 | 10% |
| 4 | 135 | 0.58 | 9.6 | 900 | 11% |
| 5 | 165 | 0.6 | 10.0 | 1260 | 12% |

### Explosive (AOE)
**Grenade Launcher** (splash)
| Lvl | Dmg | Rate | Range | Splash | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 20 | 1.2 | 4.5 | 1.0 | 120 |
| 2 | 24 | 1.25 | 4.7 | 1.1 | 180 |
| 3 | 30 | 1.3 | 5.0 | 1.2 | 260 |
| 4 | 38 | 1.35 | 5.2 | 1.3 | 370 |
| 5 | 46 | 1.4 | 5.5 | 1.4 | 520 |

**Mortar** (indirect arc)
| Lvl | Dmg | Rate | Range | Splash | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 45 | 0.6 | 6.0 | 1.6 | 200 |
| 2 | 55 | 0.62 | 6.2 | 1.7 | 300 |
| 3 | 68 | 0.65 | 6.5 | 1.9 | 440 |
| 4 | 85 | 0.68 | 6.8 | 2.1 | 620 |
| 5 | 105 | 0.7 | 7.0 | 2.3 | 880 |

**Howitzer** (heavy AOE)
| Lvl | Dmg | Rate | Range | Splash | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 80 | 0.45 | 6.2 | 2.0 | 320 |
| 2 | 96 | 0.48 | 6.5 | 2.2 | 470 |
| 3 | 118 | 0.5 | 6.8 | 2.4 | 680 |
| 4 | 145 | 0.52 | 7.1 | 2.6 | 960 |
| 5 | 180 | 0.55 | 7.4 | 2.8 | 1340 |

**Rocket Pod** (micro-splash)
| Lvl | Dmg | Rate | Range | Splash | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 12 | 2.4 | 5.2 | 0.8 | 150 |
| 2 | 14 | 2.6 | 5.4 | 0.85 | 220 |
| 3 | 16 | 2.8 | 5.6 | 0.9 | 320 |
| 4 | 19 | 3.0 | 5.8 | 1.0 | 460 |
| 5 | 23 | 3.2 | 6.0 | 1.1 | 650 |

**Cluster Cannon** (endgame AOE)
| Lvl | Dmg | Rate | Range | Splash | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 60 | 0.6 | 6.5 | 1.8 | 280 |
| 2 | 72 | 0.62 | 6.8 | 2.0 | 400 |
| 3 | 88 | 0.65 | 7.1 | 2.2 | 580 |
| 4 | 108 | 0.68 | 7.4 | 2.4 | 820 |
| 5 | 132 | 0.7 | 7.7 | 2.6 | 1160 |

### Control / Status
**Cryo Sprayer** (slow)
| Lvl | Dmg | Rate | Range | Slow | Cost |
|-----|-----|------|-------|------|------|
| 1 | 4 | 3.0 | 3.5 | 20% / 1.5s | 100 |
| 2 | 5 | 3.2 | 3.7 | 24% / 1.6s | 150 |
| 3 | 6 | 3.4 | 4.0 | 28% / 1.7s | 220 |
| 4 | 8 | 3.6 | 4.2 | 32% / 1.8s | 320 |
| 5 | 10 | 3.8 | 4.5 | 36% / 2.0s | 450 |

**Incendiary Turret** (burn DoT)
| Lvl | Dmg | Rate | Range | Burn | Cost |
|-----|-----|------|-------|------|------|
| 1 | 6 | 1.6 | 4.5 | 4/s for 2.0s | 130 |
| 2 | 7 | 1.7 | 4.7 | 5/s for 2.2s | 190 |
| 3 | 9 | 1.8 | 5.0 | 6/s for 2.4s | 270 |
| 4 | 11 | 1.9 | 5.3 | 8/s for 2.6s | 380 |
| 5 | 14 | 2.0 | 5.5 | 10/s for 3.0s | 540 |

**EMP Node** (stun)
| Lvl | Dmg | Rate | Range | Stun | Cost |
|-----|-----|------|-------|------|------|
| 1 | 10 | 1.0 | 4.0 | 0.3s | 160 |
| 2 | 12 | 1.1 | 4.2 | 0.35s | 230 |
| 3 | 15 | 1.2 | 4.5 | 0.4s | 330 |
| 4 | 19 | 1.3 | 4.7 | 0.45s | 480 |
| 5 | 24 | 1.4 | 5.0 | 0.5s | 680 |

**Shock Coil** (chain slow)
| Lvl | Dmg | Rate | Range | Chains | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 8 | 1.4 | 4.5 | 2 targets, slow 15%/1.2s | 170 |
| 2 | 10 | 1.5 | 4.7 | 2 targets, slow 18%/1.3s | 250 |
| 3 | 12 | 1.6 | 5.0 | 3 targets, slow 20%/1.4s | 360 |
| 4 | 15 | 1.7 | 5.2 | 3 targets, slow 24%/1.5s | 520 |
| 5 | 19 | 1.8 | 5.5 | 4 targets, slow 28%/1.6s | 740 |

**Gas Projector** (slow field)
| Lvl | Dmg | Rate | Range | Field | Cost |
|-----|-----|------|-------|-------|------|
| 1 | 3 | 2.0 | 4.0 | 12% slow, 1.5 tiles / 2.0s | 180 |
| 2 | 4 | 2.1 | 4.2 | 14% slow, 1.5 tiles / 2.2s | 260 |
| 3 | 5 | 2.2 | 4.5 | 16% slow, 1.5 tiles / 2.4s | 380 |
| 4 | 6 | 2.3 | 4.7 | 18% slow, 1.5 tiles / 2.6s | 540 |
| 5 | 8 | 2.4 | 5.0 | 20% slow, 1.5 tiles / 3.0s | 780 |

### Support
**Target Painter** (vulnerability)
| Lvl | Dmg | Rate | Range | Debuff | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 4 | 1.6 | 4.5 | +8% dmg / 2.0s | 150 |
| 2 | 5 | 1.7 | 4.7 | +9% / 2.2s | 220 |
| 3 | 6 | 1.8 | 5.0 | +10% / 2.4s | 320 |
| 4 | 8 | 1.9 | 5.3 | +12% / 2.6s | 460 |
| 5 | 10 | 2.0 | 5.5 | +14% / 3.0s | 660 |

**Ammo Feeder** (fire-rate aura)
| Lvl | Dmg | Rate | Range | Aura | Cost |
|-----|-----|------|-------|------|------|
| 1 | 2 | 1.2 | 3.5 | 2.0 tiles, +8% | 180 |
| 2 | 2 | 1.3 | 3.7 | 2.2 tiles, +10% | 260 |
| 3 | 3 | 1.4 | 4.0 | 2.4 tiles, +12% | 380 |
| 4 | 4 | 1.5 | 4.2 | 2.6 tiles, +14% | 540 |
| 5 | 5 | 1.6 | 4.5 | 2.8 tiles, +16% | 780 |

**Command Uplink** (range aura)
| Lvl | Dmg | Rate | Range | Aura | Cost |
|-----|-----|------|-------|------|------|
| 1 | 2 | 1.0 | 4.0 | +6% range | 200 |
| 2 | 2 | 1.1 | 4.2 | +7% | 290 |
| 3 | 3 | 1.2 | 4.5 | +8% | 420 |
| 4 | 4 | 1.3 | 4.7 | +10% | 600 |
| 5 | 5 | 1.4 | 5.0 | +12% | 860 |

**Armor Breaker** (armor debuff)
| Lvl | Dmg | Rate | Range | Debuff | Cost |
|-----|-----|------|-------|--------|------|
| 1 | 6 | 1.2 | 4.5 | -6% armor / 2.0s | 220 |
| 2 | 7 | 1.3 | 4.7 | -7% / 2.2s | 320 |
| 3 | 8 | 1.4 | 5.0 | -8% / 2.4s | 460 |
| 4 | 10 | 1.5 | 5.2 | -10% / 2.6s | 660 |
| 5 | 12 | 1.6 | 5.5 | -12% / 3.0s | 940 |

**Logistics Hub** (economy)
| Lvl | Effect | Cost |
|-----|--------|------|
| 1 | +15 coins end-wave | 260 |
| 2 | +20 coins end-wave | 360 |
| 3 | +25 coins end-wave | 520 |
| 4 | +30 coins end-wave | 740 |
| 5 | +40 coins end-wave | 1050 |

### Anti-Air
(AA towers can hit ground for 60% damage.)

**AA MG**
| Lvl | Dmg | Rate | Range | Air Bonus | Cost |
|-----|-----|------|-------|-----------|------|
| 1 | 6 | 2.6 | 4.5 | +30% | 110 |
| 2 | 7 | 2.8 | 4.7 | +32% | 170 |
| 3 | 8 | 3.0 | 5.0 | +34% | 250 |
| 4 | 10 | 3.2 | 5.3 | +36% | 360 |
| 5 | 12 | 3.4 | 5.5 | +38% | 510 |

**Flak Cannon** (splash)
| Lvl | Dmg | Rate | Range | Air Bonus | Splash | Cost |
|-----|-----|------|-------|-----------|--------|------|
| 1 | 18 | 1.3 | 5.0 | +40% | 0.8 | 160 |
| 2 | 22 | 1.35 | 5.2 | +42% | 0.9 | 240 |
| 3 | 26 | 1.4 | 5.5 | +44% | 1.0 | 350 |
| 4 | 32 | 1.45 | 5.8 | +46% | 1.1 | 500 |
| 5 | 40 | 1.5 | 6.0 | +48% | 1.2 | 710 |

**SAM Site**
| Lvl | Dmg | Rate | Range | Air Bonus | Cost |
|-----|-----|------|-------|-----------|------|
| 1 | 45 | 0.6 | 6.5 | +55% | 220 |
| 2 | 55 | 0.62 | 6.8 | +58% | 320 |
| 3 | 68 | 0.64 | 7.2 | +61% | 470 |
| 4 | 84 | 0.66 | 7.6 | +64% | 670 |
| 5 | 105 | 0.68 | 8.0 | +67% | 940 |

**Laser AA**
| Lvl | Dmg | Rate | Range | Air Bonus | Cost |
|-----|-----|------|-------|-----------|------|
| 1 | 10 | 2.2 | 6.0 | +35% | 240 |
| 2 | 12 | 2.3 | 6.2 | +38% | 340 |
| 3 | 14 | 2.4 | 6.5 | +41% | 490 |
| 4 | 17 | 2.5 | 6.8 | +44% | 700 |
| 5 | 21 | 2.6 | 7.0 | +47% | 980 |

**Interceptor Drone**
| Lvl | Dmg | Rate | Range | Air Bonus | Cost |
|-----|-----|------|-------|-----------|------|
| 1 | 8 | 2.0 | 5.5 | +30% | 260 |
| 2 | 10 | 2.1 | 5.7 | +32% | 380 |
| 3 | 12 | 2.2 | 6.0 | +34% | 540 |
| 4 | 15 | 2.3 | 6.3 | +36% | 780 |
| 5 | 18 | 2.4 | 6.5 | +38% | 1100 |

## 9) Systems Architecture (High-Level)
- GameLoop: fixed timestep update + render.
- Grid/Map: tile map + buildable zones + path nodes.
- WaveManager: schedule enemy batches and special Supply Drop waves.
- EnemySystem: movement, HP, status, rewards.
- TowerSystem: placement, targeting, upgrades, cooldowns.
- ProjectileSystem: hits, splash, pierce.
- Economy: coins, end-wave stipend, supply drop bonus.
- UI/HUD: tower panel, upgrade controls, wave info, HP/coins.

## 10) Error Handling
- Invalid level config falls back to safe test map.
- Unknown tower/enemy IDs in waves are skipped with console warning.
- Out-of-bounds placements blocked with UI feedback.
