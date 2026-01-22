export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    clear() {
      ctx.fillStyle = '#1d2322';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    text(label, x, y, color = '#c2b280') {
      ctx.fillStyle = color;
      ctx.font = '14px monospace';
      ctx.fillText(label, x, y);
    },
  };
}
