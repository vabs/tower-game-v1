export function initHud(root = document.body) {
  const hud = document.createElement('section');
  hud.id = 'hud';

  hud.innerHTML = `
    <div class="hud-top">
      <div class="hud-stat">Level <span id="hud-level">1</span></div>
      <div class="hud-stat">Wave <span id="hud-wave">1</span></div>
      <div class="hud-stat">HP <span id="hud-hp">100</span></div>
      <div class="hud-stat">Coins <span id="hud-coins">100</span></div>
    </div>
    <div class="hud-left">
      <h3>Towers</h3>
      <div class="hud-tower-list" id="hud-tower-list">
        <button>AR Turret</button>
        <button>Marksman</button>
        <button>AA MG</button>
      </div>
    </div>
    <div class="hud-right">
      <h3>Selected</h3>
      <div class="hud-panel">
        <div>Name: <span id="hud-selected">None</span></div>
        <div>Range: <span id="hud-range">-</span></div>
        <div>DPS: <span id="hud-dps">-</span></div>
        <button id="hud-upgrade">Upgrade</button>
      </div>
    </div>
  `;

  root.appendChild(hud);
  return hud;
}
