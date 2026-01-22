export function renderLevelSelect() {
  return {
    title: 'Select Level',
    levels: Array.from({ length: 50 }, (_, i) => i + 1),
  };
}
