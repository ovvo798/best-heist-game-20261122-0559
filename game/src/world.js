// The night itself: the thief, the alarm meter, the tools, the loot and the
// win/lose rules. One step moves the thief, the guards and the cameras,
// raises or lowers the alarm, and reports what happened this step as events.

import { ALARM, SCORE, STEP, THIEF, TOOLS } from './config.js';
import {
  CAMERAS,
  CASES,
  CRATES,
  ENTRY,
  EXIT,
  GEMS,
  PATROLS,
  PEDESTAL,
  WALLS,
  movementBlockers,
  sightBlockers,
} from './level.js';
import {
  anyWatcherSees,
  createCamera,
  createGuard,
  sendGuardToCoin,
  stepCamera,
  stepGuard,
} from './guards.js';

export const EVENT_NONE = 0;
export const EVENT_GEM = 1 << 0;
export const EVENT_OPAL = 1 << 1;
export const EVENT_CAUGHT = 1 << 2;
export const EVENT_ESCAPED = 1 << 3;
export const EVENT_SPOTTED = 1 << 4;
export const EVENT_TOOL = 1 << 5;

/** A fresh night: thief at the door, guards on patrol, alarm at zero. */
export function createWorld(random) {
  return {
    random,
    time: 0,
    thief: { x: ENTRY.x, y: ENTRY.y, angle: -Math.PI / 2, running: false },
    guards: PATROLS.map((patrol, index) => createGuard(patrol, index)),
    cameras: CAMERAS.map((spec, index) => createCamera(spec, index)),
    alarm: 0,
    spotted: false,
    score: 0,
    gemsTaken: 0,
    opalTaken: false,
    escaped: false,
    caught: false,
    smokeCharges: TOOLS.smokeCharges,
    coinCharges: TOOLS.coinCharges,
    disguiseCharges: TOOLS.disguiseCharges,
    disguiseLeft: 0,
    smokes: [],
    gems: GEMS.map((gem) => ({ ...gem })),
    flash: 0,
  };
}

/** Reset a world to a fresh night, keeping the same random source. */
export function resetWorld(world) {
  const fresh = createWorld(world.random);
  Object.keys(fresh).forEach((key) => {
    world[key] = fresh[key];
  });
}

/** Push a circle out of every rectangle it overlaps. */
function resolveCollisions(entity, radius, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    const r = blockers[i];
    const nearestX = Math.max(r.x, Math.min(entity.x, r.x + r.w));
    const nearestY = Math.max(r.y, Math.min(entity.y, r.y + r.h));
    const dx = entity.x - nearestX;
    const dy = entity.y - nearestY;
    const distance = Math.hypot(dx, dy);
    if (distance < radius) {
      if (distance < 0.001) {
        entity.y = r.y - radius;
      } else {
        entity.x = nearestX + (dx / distance) * radius;
        entity.y = nearestY + (dy / distance) * radius;
      }
    }
  }
}

/** The pedestal's opal is taken when the thief reaches its front. */
function opalReached(thief) {
  return (
    thief.x > PEDESTAL.x - 20 &&
    thief.x < PEDESTAL.x + PEDESTAL.w + 20 &&
    thief.y > PEDESTAL.y - 20 &&
    thief.y < PEDESTAL.y + PEDESTAL.h + 20
  );
}

/** The getaway door opens only once the opal is in hand. */
function exitReached(thief) {
  return thief.x > EXIT.x && thief.x < EXIT.x + EXIT.w && thief.y > EXIT.y && thief.y < EXIT.y + EXIT.h;
}

/**
 * Advance the gallery while nobody is playing (the title screen): guards
 * patrol and cameras sweep, but the thief is nowhere to be seen, so the
 * alarm never rises and nobody is ever caught.
 */
export function stepIdleWorld(world, dt) {
  world.time += dt;
  const farAway = { x: -9999, y: -9999 };
  const blockers = sightBlockers();
  for (const camera of world.cameras) stepCamera(camera, dt, world.time);
  for (const guard of world.guards) {
    stepGuard(guard, dt, farAway, blockers, world.smokes, false, null);
  }
}

/**
 * One fixed step. `move` is {x, y} of -1..1, `running` is Shift, and
 * `actions` carries tool requests. Returns the events that fired.
 */
export function stepWorld(world, dt, move, running, actions) {
  if (world.caught || world.escaped) return EVENT_NONE;
  world.time += dt;
  let events = EVENT_NONE;
  const thief = world.thief;

  // Tools cost something: smoke and coins are spent, the disguise runs out.
  if (actions.smoke && world.smokeCharges > 0) {
    world.smokeCharges -= 1;
    world.smokes.push({ x: thief.x, y: thief.y, radius: TOOLS.smokeRadius, left: TOOLS.smokeSeconds });
    events |= EVENT_TOOL;
  }
  if (actions.coin && world.coinCharges > 0 && actions.coinX !== undefined) {
    world.coinCharges -= 1;
    let nearest = null;
    let nearestDistance = Infinity;
    for (const guard of world.guards) {
      const distance = Math.hypot(guard.x - actions.coinX, guard.y - actions.coinY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = guard;
      }
    }
    if (nearest) sendGuardToCoin(nearest, actions.coinX, actions.coinY);
    events |= EVENT_TOOL;
  }
  if (actions.disguise && world.disguiseCharges > 0 && world.disguiseLeft <= 0) {
    world.disguiseCharges -= 1;
    world.disguiseLeft = TOOLS.disguiseSeconds;
    events |= EVENT_TOOL;
  }
  if (world.disguiseLeft > 0) world.disguiseLeft -= dt;

  // Move the thief, faster and louder while running.
  const length = Math.hypot(move.x, move.y);
  const speed = running ? THIEF.runSpeed : THIEF.walkSpeed;
  if (length > 0.001) {
    thief.x += (move.x / length) * speed * dt;
    thief.y += (move.y / length) * speed * dt;
    thief.angle = Math.atan2(move.y, move.x);
  }
  thief.running = running && length > 0.001;
  thief.x = Math.max(26 + THIEF.radius, Math.min(1280 - 26 - THIEF.radius, thief.x));
  thief.y = Math.max(26 + THIEF.radius, Math.min(720 - 26 - THIEF.radius, thief.y));
  resolveCollisions(thief, THIEF.radius, movementBlockers());

  // Smoke fades; a running thief is heard by nearby guards.
  world.smokes = world.smokes.filter((smoke) => {
    smoke.left -= dt;
    return smoke.left > 0;
  });
  const noise = thief.running ? { x: thief.x, y: thief.y } : null;

  const blockers = sightBlockers();
  const disguised = world.disguiseLeft > 0;

  // Cameras sweep; guards patrol, investigate and chase.
  for (const camera of world.cameras) stepCamera(camera, dt, world.time);
  for (const guard of world.guards) {
    const result = stepGuard(guard, dt, thief, blockers, world.smokes, disguised, noise);
    if (result === 'caught') {
      world.caught = true;
      world.flash = 1;
      return EVENT_CAUGHT;
    }
  }

  // The alarm rises while any watcher sees the thief, and decays in cover.
  const watchers = [...world.guards, ...world.cameras];
  const seen = anyWatcherSees(watchers, thief, blockers, world.smokes, disguised);
  const wasSpotted = world.spotted;
  world.spotted = seen;
  if (seen) {
    if (!wasSpotted) events |= EVENT_SPOTTED;
    world.alarm = Math.min(ALARM.max, world.alarm + ALARM.risePerSecond * dt);
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM.decayPerSecond * dt);
  }
  if (world.alarm >= ALARM.max) {
    world.caught = true;
    world.flash = 1;
    return EVENT_CAUGHT;
  }

  // Side loot: gems on the cases, snatched on the way past.
  for (const gem of world.gems) {
    if (!gem.taken && Math.hypot(thief.x - gem.x, thief.y - gem.y) < 34) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.score += SCORE.gem;
      events |= EVENT_GEM;
    }
  }

  // The opal, then the door: the getaway only pays off with the loot.
  if (!world.opalTaken && opalReached(thief)) {
    world.opalTaken = true;
    world.score += SCORE.opal;
    events |= EVENT_OPAL;
  }
  if (world.opalTaken && exitReached(thief)) {
    world.escaped = true;
    world.score += Math.max(0, Math.round((240 - world.time) * SCORE.winTimeBonusPerSecond));
    return events | EVENT_ESCAPED;
  }

  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 2);
  return events;
}

export { CASES, CRATES, EXIT, PEDESTAL, STEP, WALLS };
