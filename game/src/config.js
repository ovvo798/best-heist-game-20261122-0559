// Every tuning number and colour for The Velvet Vault, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  walkSpeed: 175,
  runSpeed: 285,
  /** Pixels within which a running thief is heard by a guard. */
  noiseRadius: 250,
};

export const GUARD = {
  radius: 14,
  patrolSpeed: 78,
  chaseSpeed: 195,
  investigateSpeed: 130,
  /** How far a guard can see, in pixels. */
  sightRange: 235,
  /** Half of the vision cone's angle, in radians. */
  sightHalfAngle: 0.56,
  /** Seconds a guard waits at each patrol waypoint, looking around. */
  waypointPause: 1.6,
  /** Seconds a guard keeps investigating a thrown coin before giving up. */
  investigateTime: 4.5,
};

export const CAMERA = {
  sightRange: 265,
  sightHalfAngle: 0.42,
  /** Radians per second the camera sweeps back and forth. */
  sweepSpeed: 0.55,
  /** How far, in radians, the camera swings from its home angle. */
  sweepArc: 0.85,
};

export const ALARM = {
  /** Points per second the meter rises while any watcher sees the thief. */
  risePerSecond: 42,
  /** Points per second it falls while nobody sees the thief. */
  decayPerSecond: 14,
  /** At this level the siren starts and the meter flashes. */
  warningLevel: 55,
  max: 100,
};

export const TOOLS = {
  smokeCharges: 2,
  smokeSeconds: 4.5,
  smokeRadius: 95,
  coinCharges: 3,
  disguiseCharges: 1,
  disguiseSeconds: 6,
  /** While disguised, a guard only spots the thief this close. */
  disguiseSightRange: 75,
};

export const SCORE = {
  gem: 100,
  opal: 500,
  winTimeBonusPerSecond: 10,
};

export const PALETTE = {
  floor: '#1a1712',
  floorTile: '#211d16',
  carpet: '#5a1f24',
  carpetEdge: '#8a6d2f',
  wall: '#2e3a44',
  wallTop: '#42525f',
  crate: '#6b4a26',
  crateTop: '#8a5f31',
  glass: '#3d6f8e',
  glassEdge: '#7fc4e8',
  guard: '#2f4d7a',
  guardCone: 'rgba(255, 214, 90, 0.20)',
  guardConeEdge: 'rgba(255, 214, 90, 0.55)',
  cameraCone: 'rgba(255, 92, 92, 0.16)',
  cameraConeEdge: 'rgba(255, 92, 92, 0.5)',
  thief: '#3d3a4d',
  thiefCloak: '#7a5fd0',
  opal: '#ffd94a',
  opalGlow: 'rgba(255, 217, 74, 0.35)',
  exit: '#3fae6a',
  smoke: 'rgba(200, 200, 210, 0.55)',
  hud: '#101010',
  text: '#f2ead8',
  muted: '#a89f88',
  alarmLow: '#3fae6a',
  alarmMid: '#e8a13a',
  alarmHigh: '#e5484d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'velvet-vault.best';
