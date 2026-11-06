# Tower Defence Implementation Plan


**Goal:** Build the HTML/JS/CSS tower defense game per the approved design docs, including 50 levels, 30 towers, 20 enemies, full UI screens, and analytics panels.

**Architecture:** Vanilla JS ES modules with a Canvas renderer for gameplay and DOM UI panels for menus, HUD, and analytics. Core systems are split into data (towers/enemies/levels), simulation (entities/systems), and UI/screens (state machine + panels). Node’s built-in test runner is used for logic tests.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Canvas 2D, Node.js test runner (`node --test`).

---

### Task 1: Project scaffold + test harness

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `styles.css`
- Create: `src/main.js`
- Create: `src/core/version.js`
- Create: `tests/version.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERSION } from '../src/core/version.js';

test('version is defined', () => {
  assert.match(VERSION, /^0\\.1\\.0/);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/version.test.js`
Expected: FAIL with “Cannot find module …/src/core/version.js”

**Step 3: Write minimal implementation**

```js
export const VERSION = '0.1.0';
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/version.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json index.html styles.css src/main.js src/core/version.js tests/version.test.js
git commit -m "chore: scaffold project and test harness"
```

---

### Task 2: Grid utilities

**Files:**
- Create: `src/core/grid.js`
- Create: `tests/grid.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toTile, toWorld } from '../src/core/grid.js';

test('grid conversions are reversible', () => {
  const tile = { x: 3, y: 5 };
  const world = toWorld(tile, 16);
  const back = toTile(world, 16);
  assert.deepEqual(back, tile);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/grid.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function toWorld(tile, size) {
  return { x: tile.x * size + size / 2, y: tile.y * size + size / 2 };
}

export function toTile(world, size) {
  return { x: Math.floor(world.x / size), y: Math.floor(world.y / size) };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/grid.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/grid.js tests/grid.test.js
git commit -m "feat: add grid conversion utilities"
```

---

### Task 3: Path representation + movement

**Files:**
- Create: `src/core/path.js`
- Create: `tests/path.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathLength, positionAt } from '../src/core/path.js';

test('path length and position', () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  assert.equal(pathLength(pts), 20);
  assert.deepEqual(positionAt(pts, 5), { x: 5, y: 0 });
  assert.deepEqual(positionAt(pts, 15), { x: 10, y: 5 });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/path.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function pathLength(points) {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    len += Math.hypot(dx, dy);
  }
  return len;
}

export function positionAt(points, dist) {
  let remaining = dist;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= seg;
  }
  return points[points.length - 1];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/path.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/path.js tests/path.test.js
git commit -m "feat: add path length and position helpers"
```

---

### Task 4: Enemy entity + status effects

**Files:**
- Create: `src/entities/enemy.js`
- Create: `src/systems/status.js`
- Create: `tests/enemy.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Enemy } from '../src/entities/enemy.js';
import { applySlow } from '../src/systems/status.js';

test('slow reduces speed temporarily', () => {
  const e = new Enemy({ hp: 100, speed: 1, path: [{ x: 0, y: 0 }, { x: 10, y: 0 }] });
  applySlow(e, 0.5, 1.0);
  e.update(1.0);
  assert.ok(e.speedMultiplier < 1);
  e.update(1.0);
  assert.equal(e.speedMultiplier, 1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/enemy.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export class Enemy {
  constructor({ hp, speed, path }) {
    this.hp = hp;
    this.baseSpeed = speed;
    this.speedMultiplier = 1;
    this.path = path;
    this.alive = true;
    this.distance = 0;
    this.status = { slowUntil: 0, slowFactor: 1 };
  }

  update(dt) {
    const now = (this._time = (this._time || 0) + dt);
    if (now >= this.status.slowUntil) {
      this.speedMultiplier = 1;
    } else {
      this.speedMultiplier = this.status.slowFactor;
    }
    this.distance += this.baseSpeed * this.speedMultiplier * dt;
  }
}

export function applySlow(enemy, factor, duration) {
  enemy.status.slowFactor = factor;
  enemy.status.slowUntil = (enemy._time || 0) + duration;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/enemy.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/entities/enemy.js src/systems/status.js tests/enemy.test.js
git commit -m "feat: add enemy entity and slow status"
```

---

### Task 5: Tower targeting + cooldown logic

**Files:**
- Create: `src/entities/tower.js`
- Create: `src/systems/targeting.js`
- Create: `tests/targeting.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectTarget } from '../src/systems/targeting.js';

test('selects closest enemy in range', () => {
  const tower = { x: 0, y: 0, range: 5 };
  const enemies = [{ id: 1, x: 3, y: 0 }, { id: 2, x: 4, y: 0 }];
  const t = selectTarget(tower, enemies, 'closest');
  assert.equal(t.id, 1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/targeting.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function selectTarget(tower, enemies, mode = 'first') {
  const inRange = enemies.filter(e => {
    const dx = e.x - tower.x;
    const dy = e.y - tower.y;
    return Math.hypot(dx, dy) <= tower.range;
  });
  if (inRange.length === 0) return null;
  if (mode === 'closest') {
    return inRange.sort((a, b) => {
      const da = Math.hypot(a.x - tower.x, a.y - tower.y);
      const db = Math.hypot(b.x - tower.x, b.y - tower.y);
      return da - db;
    })[0];
  }
  return inRange[0];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/targeting.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/entities/tower.js src/systems/targeting.js tests/targeting.test.js
git commit -m "feat: add tower targeting"
```

---

### Task 6: Projectile movement + collision

**Files:**
- Create: `src/entities/projectile.js`
- Create: `src/systems/collision.js`
- Create: `tests/projectile.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hitTest } from '../src/systems/collision.js';

test('projectile hits enemy within radius', () => {
  const proj = { x: 0, y: 0, radius: 0.5 };
  const enemy = { x: 0.3, y: 0.2 };
  assert.equal(hitTest(proj, enemy), true);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/projectile.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function hitTest(proj, enemy) {
  const dx = enemy.x - proj.x;
  const dy = enemy.y - proj.y;
  return Math.hypot(dx, dy) <= proj.radius;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/projectile.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/entities/projectile.js src/systems/collision.js tests/projectile.test.js
git commit -m "feat: add projectile collision helper"
```

---

### Task 7: Wave manager + Supply Drop logic

**Files:**
- Create: `src/systems/waves.js`
- Create: `tests/waves.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSupplyDropLevel, totalWavesWithSupply } from '../src/systems/waves.js';

test('supply drop levels add an extra wave', () => {
  assert.equal(isSupplyDropLevel(12), true);
  assert.equal(totalWavesWithSupply(12, 6), 7);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/waves.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function isSupplyDropLevel(level) {
  return level % 6 === 0;
}

export function totalWavesWithSupply(level, combatWaves) {
  return combatWaves + (isSupplyDropLevel(level) ? 1 : 0);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/waves.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/systems/waves.js tests/waves.test.js
git commit -m "feat: add wave helpers and supply drop logic"
```

---

### Task 8: Economy + upgrade costs

**Files:**
- Create: `src/systems/economy.js`
- Create: `tests/economy.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stipendForLevel, upgradeCost } from '../src/systems/economy.js';

test('stipend scales with level', () => {
  assert.equal(stipendForLevel(1), 10);
  assert.equal(stipendForLevel(10), 15);
});

test('in-combat upgrades cost +15%', () => {
  assert.equal(upgradeCost(100, true), 115);
  assert.equal(upgradeCost(100, false), 100);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/economy.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function stipendForLevel(level) {
  return 10 + Math.floor(level / 2);
}

export function upgradeCost(base, inCombat) {
  return inCombat ? Math.ceil(base * 1.15) : base;
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/economy.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/systems/economy.js tests/economy.test.js
git commit -m "feat: add economy stipend and upgrade cost"
```

---

### Task 9: Data definitions + integrity checks

**Files:**
- Create: `src/data/towers.js`
- Create: `src/data/enemies.js`
- Create: `src/data/levels.js`
- Create: `tests/data.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { towers } from '../src/data/towers.js';
import { enemies } from '../src/data/enemies.js';
import { levels } from '../src/data/levels.js';

test('data counts match spec', () => {
  assert.equal(towers.length, 30);
  assert.equal(enemies.length, 20);
  assert.equal(levels.length, 50);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/data.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export const towers = [/* full tower data from design doc */];
export const enemies = [/* full enemy data from design doc */];
export const levels = [/* full level data from design doc */];
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/data.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/towers.js src/data/enemies.js src/data/levels.js tests/data.test.js
git commit -m "feat: add core game data tables"
```

---

### Task 10: Game state machine + screens

**Files:**
- Create: `src/game/state.js`
- Create: `src/game/screens/start.js`
- Create: `src/game/screens/level-select.js`
- Create: `src/game/screens/pause.js`
- Create: `src/game/screens/game-over.js`
- Create: `src/game/screens/game-end.js`
- Create: `tests/state.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStateMachine } from '../src/game/state.js';

test('state transitions are allowed', () => {
  const sm = createStateMachine();
  sm.transition('playing');
  assert.equal(sm.current, 'playing');
  sm.transition('paused');
  assert.equal(sm.current, 'paused');
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/state.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function createStateMachine() {
  const allowed = new Set(['start', 'level-select', 'playing', 'paused', 'game-over', 'game-end']);
  return {
    current: 'start',
    transition(next) {
      if (!allowed.has(next)) throw new Error('Invalid state');
      this.current = next;
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/state.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/game/state.js src/game/screens/*.js tests/state.test.js
git commit -m "feat: add game state machine and screen stubs"
```

---

### Task 11: Renderer + main loop

**Files:**
- Create: `src/core/time.js`
- Create: `src/render/renderer.js`
- Create: `src/game/game.js`
- Modify: `src/main.js`
- Create: `tests/time.test.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stepFixed } from '../src/core/time.js';

test('fixed step yields expected ticks', () => {
  const ticks = stepFixed(0.1, 0.05);
  assert.equal(ticks, 2);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/time.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function stepFixed(delta, step) {
  return Math.floor(delta / step);
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/time.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/time.js src/render/renderer.js src/game/game.js src/main.js tests/time.test.js
git commit -m "feat: add fixed timestep and renderer stub"
```

---

### Task 12: HUD + in-game UI panels

**Files:**
- Create: `src/ui/hud.js`
- Create: `src/ui/placement.js`
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Write the failing test**

No automated test for UI layout (visual). Use manual check.

**Step 2: Manual verification**

Run: `python -m http.server 8000`
Expected: Local server starts, `index.html` loads, HUD panels visible, clickable tower slots.

**Step 3: Write minimal implementation**

- HUD renders Level/Wave/HP/Coins, tower list, and upgrade panel placeholders.
- Placement overlay shows buildable tiles on hover.

**Step 4: Manual verification**

Refresh page, confirm elements render and align on 1280×720.

**Step 5: Commit**

```bash
git add src/ui/hud.js src/ui/placement.js index.html styles.css
git commit -m "feat: add HUD and placement UI"
```

---

### Task 13: Analytics panels (Pause/Finish)

**Files:**
- Create: `src/ui/analytics.js`
- Modify: `src/game/screens/pause.js`
- Modify: `src/game/screens/game-over.js`
- Modify: `src/game/screens/game-end.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeTowerStats } from '../src/ui/analytics.js';

test('summarizes tower damage and kills', () => {
  const stats = summarizeTowerStats([{ id: 'ar', damage: 120, kills: 3, cost: 80 }]);
  assert.equal(stats[0].dpc, 1.5);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/analytics.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function summarizeTowerStats(list) {
  return list.map(t => ({
    ...t,
    dpc: t.cost > 0 ? Math.round((t.damage / t.cost) * 100) / 100 : 0,
  }));
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/analytics.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/ui/analytics.js src/game/screens/pause.js src/game/screens/game-over.js src/game/screens/game-end.js tests/analytics.test.js
git commit -m "feat: add analytics panels for pause and end screens"
```

---

### Task 14: Integrate gameplay loop (enemies, towers, waves)

**Files:**
- Modify: `src/game/game.js`
- Modify: `src/entities/enemy.js`
- Modify: `src/entities/tower.js`
- Modify: `src/entities/projectile.js`
- Modify: `src/systems/waves.js`

**Step 1: Write the failing test**

No single unit test; do a short sim loop.

**Step 2: Manual verification**

Run: `python -m http.server 8000`
Expected: Enemies spawn per wave, towers fire, coins increase, waves progress.

**Step 3: Write minimal implementation**

- Spawn enemies from `levels.js` wave config.
- Towers fire projectiles, apply damage and status.
- End wave triggers stipend and unlocks next wave.

**Step 4: Manual verification**

Confirm waves complete and Supply Drop wave grants coins without enemies.

**Step 5: Commit**

```bash
git add src/game/game.js src/entities/enemy.js src/entities/tower.js src/entities/projectile.js src/systems/waves.js
git commit -m "feat: integrate core gameplay loop"
```

---

### Task 15: Level progression + unlocks

**Files:**
- Modify: `src/game/game.js`
- Modify: `src/data/levels.js`
- Modify: `src/ui/hud.js`

**Step 1: Write the failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getUnlocksForLevel } from '../src/data/levels.js';

test('unlocks are defined', () => {
  const unlocks = getUnlocksForLevel(6);
  assert.ok(unlocks.length > 0);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/unlocks.test.js`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation**

```js
export function getUnlocksForLevel(level) {
  return (levels[level - 1] && levels[level - 1].unlocks) || [];
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/unlocks.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add src/data/levels.js src/ui/hud.js tests/unlocks.test.js
git commit -m "feat: add level unlocks and UI integration"
```

---

### Task 16: Polish + visual pass

**Files:**
- Modify: `styles.css`
- Modify: `src/render/renderer.js`
- Create: `assets/sprites/` (placeholders)

**Step 1: Manual verification**

Run: `python -m http.server 8000`
Expected: Clear silhouettes, readable map contrast, UI panels aligned.

**Step 2: Write minimal implementation**

- Apply palette from design assets doc.
- Add placeholder pixel sprites for towers/enemies/tiles.
- Add simple hit flashes and small explosion sprites.

**Step 3: Manual verification**

Check visibility at full wave density and pause screen analytics.

**Step 4: Commit**

```bash
git add styles.css src/render/renderer.js assets/sprites
git commit -m "feat: add initial pixel-art styling and placeholders"
```

---

### Task 17: Final validation

**Files:**
- Modify as needed

**Step 1: Run full test suite**

Run: `node --test`
Expected: All tests pass

**Step 2: Manual full run**

Run: `python -m http.server 8000`
Expected: Play L1–L3 without crashes, menus functional, pause analytics visible.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: finalize MVP build"
```

---

## Notes
- If git is not initialized, run `git init` before Task 1 to enable commits.
- ES modules require a local HTTP server for browser testing.
- Full data entry for towers/enemies/levels should be copied from the design doc verbatim.

