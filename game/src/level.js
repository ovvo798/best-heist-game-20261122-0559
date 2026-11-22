// The Velvet Vault's single gallery: one room the thief crosses, drawn as
// rectangles. Walls and crates are solid: they stop movement and block sight.
// Glass display cases stop movement but you can be seen through them, so
// they are cover for your feet, never for your silhouette.

import { FIELD } from './config.js';

/** The room's outer walls, as rectangles. */
export const WALLS = [
  { x: 0, y: 0, w: FIELD.width, h: 26 }, // north wall
  { x: 0, y: FIELD.height - 26, w: FIELD.width, h: 26 }, // south wall
  { x: 0, y: 0, w: 26, h: FIELD.height }, // west wall
  { x: FIELD.width - 26, y: 0, w: 26, h: FIELD.height }, // east wall
  // Two interior partitions leave three routes across the room: left lane,
  // centre lane past the fountain plinth, and right lane past the cases.
  { x: 330, y: 26, w: 26, h: 250 },
  { x: 330, y: 420, w: 26, h: 274 },
  { x: 880, y: 26, w: 26, h: 250 },
  { x: 880, y: 420, w: 26, h: 274 },
  // The vault alcove around the opal pedestal, open at the bottom only.
  { x: 1020, y: 26, w: 234, h: 26 },
  { x: 1020, y: 26, w: 26, h: 150 },
];

/** Crates and plinths: solid cover you can crouch behind. */
export const CRATES = [
  { x: 120, y: 150, w: 90, h: 70 },
  { x: 120, y: 480, w: 90, h: 70 },
  { x: 420, y: 330, w: 110, h: 60 },
  { x: 640, y: 120, w: 80, h: 80 },
  { x: 640, y: 520, w: 80, h: 80 },
  { x: 950, y: 330, w: 100, h: 60 },
  { x: 420, y: 560, w: 130, h: 55 },
];

/** Glass display cases: they block your feet, not a guard's eyes. */
export const CASES = [
  { x: 420, y: 120, w: 130, h: 55 },
  { x: 640, y: 300, w: 130, h: 55 },
  { x: 950, y: 120, w: 130, h: 55 },
  { x: 950, y: 520, w: 130, h: 55 },
];

/** The opal pedestal: the loot target, inside the vault alcove. */
export const PEDESTAL = { x: 1100, y: 90, w: 70, h: 70 };

/** The getaway door, bottom-left: reach it with the opal to win. */
export const EXIT = { x: 40, y: 640, w: 110, h: 54 };

/** Where the thief slips in at the start of the night. */
export const ENTRY = { x: 90, y: 610 };

/** Optional side loot: small gems on the cases, each worth score. */
export const GEMS = [
  { x: 485, y: 110, taken: false },
  { x: 705, y: 290, taken: false },
  { x: 1015, y: 110, taken: false },
];

/** Guard patrols: each guard walks its waypoints, pausing to look around. */
export const PATROLS = [
  {
    waypoints: [
      { x: 420, y: 240 },
      { x: 700, y: 240 },
      { x: 700, y: 470 },
      { x: 420, y: 470 },
    ],
  },
  {
    waypoints: [
      { x: 950, y: 250 },
      { x: 1180, y: 250 },
      { x: 1180, y: 600 },
      { x: 950, y: 600 },
    ],
  },
  {
    waypoints: [
      { x: 130, y: 330 },
      { x: 280, y: 330 },
      { x: 280, y: 620 },
      { x: 130, y: 620 },
    ],
  },
];

/** Wall cameras: fixed eyes that sweep their cone back and forth. */
export const CAMERAS = [
  { x: 640, y: 40, homeAngle: Math.PI / 2, range: 265 },
  { x: 1180, y: 380, homeAngle: Math.PI, range: 265 },
];

/** Every rectangle that stops movement: walls, crates and cases. */
export function movementBlockers() {
  return [...WALLS, ...CRATES, ...CASES];
}

/** Every rectangle that stops a line of sight: walls and crates only. */
export function sightBlockers() {
  return [...WALLS, ...CRATES];
}
