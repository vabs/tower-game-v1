// Vite-only: not importable from src/sim, src/data or src/core (decision 20).
const urls = import.meta.glob('../assets/sprites/**/*.png', { eager: true, query: '?url', import: 'default' });

/** "../assets/sprites/towers/ar_turret_l1.png" -> "towers/ar_turret_l1" */
function keyOf(path) {
  return path.replace('../assets/sprites/', '').replace(/\.png$/, '');
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load sprite ${url.slice(0, 60)}`));
    img.src = url;
  });
}

/** Resolves once every sprite is decoded. @returns {Promise<Record<string, HTMLImageElement>>} */
export async function loadSprites() {
  const entries = await Promise.all(
    Object.entries(urls).map(async ([path, url]) => [keyOf(path), await loadImage(url)])
  );
  return Object.fromEntries(entries);
}
