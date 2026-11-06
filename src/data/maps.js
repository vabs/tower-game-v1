// Map templates. Grid chars: '.' buildable, '#' blocked, 'S' spawn, 'G' goal.
// Path tiles are derived from `paths` (waypoints in tile coords, axis-aligned
// segments) and are unbuildable even though the grid shows '.' under them.
//
// single_1 route: S(0,2) -> (11,2) -> (11,5) -> (4,5) -> (4,8) -> G(14,8)  (34 tiles)

export const maps = {
  single_1: {
    id: 'single_1',
    type: 'single',
    grid: [
      '..#.........#.......',
      '....#...............',
      'S...................',
      '.......##...........',
      '...#................',
      '....................',
      '..........#.........',
      '.#..................',
      '..............G.....',
      '..#........#........',
      '....................',
    ],
    paths: [
      [
        { x: 0, y: 2 },
        { x: 11, y: 2 },
        { x: 11, y: 5 },
        { x: 4, y: 5 },
        { x: 4, y: 8 },
        { x: 14, y: 8 },
      ],
    ],
  },
};

// M1 has a single template; M3 will pick templates[mapType][level % 3].
export function mapIdForLevel(/* levelId */) {
  return 'single_1';
}
