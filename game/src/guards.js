// Guards and cameras: who can see the thief, and what they do about it.
// A watcher sees the thief only inside its cone, inside its range, with a
// clear line of sight — walls and crates break the line, glass does not.
// Smoke clouds break it too, and a disguise shrinks a guard's range to
// arm's length. Guards patrol, investigate a thrown coin, and chase a thief
// they can see; cameras only watch, and feed the alarm meter.

import { ALARM, CAMERA, GUARD, TOOLS } from './config.js';

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle <= -Math.PI) angle += Math.PI * 2;
  return angle;
}

/** True when segment (ax,ay)-(bx,by) crosses rectangle r. */
function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  // Slab test on x, then on y; a miss on either axis means no crossing.
  if (dx === 0) {
    if (ax < r.x || ax > r.x + r.w) return false;
  } else {
    let t1 = (r.x - ax) / dx;
    let t2 = (r.x + r.w - ax) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (ay < r.y || ay > r.y + r.h) return false;
  } else {
    let t1 = (r.y - ay) / dy;
    let t2 = (r.y + r.h - ay) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when no sight blocker stands between the watcher and the thief. */
export function hasLineOfSight(x1, y1, x2, y2, blockers) {
  for (let i = 0; i < blockers.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, blockers[i])) return false;
  }
  return true;
}

/** True when the thief stands inside a smoke cloud. */
export function insideSmoke(x, y, smokes) {
  for (let i = 0; i < smokes.length; i += 1) {
    const dx = x - smokes[i].x;
    const dy = y - smokes[i].y;
    if (dx * dx + dy * dy < smokes[i].radius * smokes[i].radius) return true;
  }
  return false;
}

/**
 * True when a watcher at (wx, wy) facing `angle` can see the thief:
 * in range, inside the cone, with a clear line, and not hidden by smoke.
 * A disguised thief is only seen up close.
 */
export function canSee(watcher, thief, blockers, smokes, disguised) {
  const dx = thief.x - watcher.x;
  const dy = thief.y - watcher.y;
  const distance = Math.hypot(dx, dy);
  const range = disguised && watcher.kind === 'guard' ? TOOLS.disguiseSightRange : watcher.range;
  if (distance > range) return false;
  const toThief = Math.atan2(dy, dx);
  if (Math.abs(wrapAngle(toThief - watcher.angle)) > watcher.halfAngle) return false;
  if (insideSmoke(thief.x, thief.y, smokes)) return false;
  return hasLineOfSight(watcher.x, watcher.y, thief.x, thief.y, blockers);
}

/** Build a guard from a patrol: starts at its first waypoint, facing along it. */
export function createGuard(patrol, index) {
  const start = patrol.waypoints[0];
  const next = patrol.waypoints[1];
  return {
    kind: 'guard',
    x: start.x,
    y: start.y,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypointIndex: 1,
    pauseLeft: 0,
    state: 'patrol',
    investigateX: 0,
    investigateY: 0,
    investigateLeft: 0,
    chaseX: 0,
    chaseY: 0,
    patrol,
    range: GUARD.sightRange,
    halfAngle: GUARD.sightHalfAngle,
    id: index,
  };
}

/** Build a camera from its mounting: it sweeps around its home angle. */
export function createCamera(spec, index) {
  return {
    kind: 'camera',
    x: spec.x,
    y: spec.y,
    homeAngle: spec.homeAngle,
    angle: spec.homeAngle,
    sweepPhase: index * 1.7,
    range: spec.range,
    halfAngle: CAMERA.sightHalfAngle,
    id: index,
  };
}

/** Move a point toward a target at `speed`, never overshooting it. */
function stepToward(entity, tx, ty, speed, dt) {
  const dx = tx - entity.x;
  const dy = ty - entity.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001) return true;
  const move = Math.min(distance, speed * dt);
  entity.x += (dx / distance) * move;
  entity.y += (dy / distance) * move;
  entity.angle = Math.atan2(dy, dx);
  return distance <= speed * dt;
}

/**
 * Advance one guard a step. Returns 'caught' when the guard touches the
 * thief, 'spotted' while the guard sees the thief, else 'quiet'.
 * `noise` is the thief's position when running loud, or null when quiet.
 */
export function stepGuard(guard, dt, thief, blockers, smokes, disguised, noise) {
  const seen = canSee(guard, thief, blockers, smokes, disguised);
  if (seen) {
    guard.state = 'chase';
    guard.chaseX = thief.x;
    guard.chaseY = thief.y;
  } else if (guard.state === 'chase') {
    // Lost sight: keep hunting the last seen spot briefly, then give up.
    guard.state = 'investigate';
    guard.investigateX = guard.chaseX;
    guard.investigateY = guard.chaseY;
    guard.investigateLeft = GUARD.investigateTime * 0.6;
  }

  if (guard.state === 'chase') {
    stepToward(guard, guard.chaseX, guard.chaseY, GUARD.chaseSpeed, dt);
    if (Math.hypot(thief.x - guard.x, thief.y - guard.y) < GUARD.radius + 13) return 'caught';
  } else if (guard.state === 'investigate') {
    const arrived = stepToward(guard, guard.investigateX, guard.investigateY, GUARD.investigateSpeed, dt);
    guard.investigateLeft -= dt;
    if (arrived || guard.investigateLeft <= 0) {
      guard.state = 'patrol';
      guard.pauseLeft = GUARD.waypointPause;
    }
  } else {
    // Patrol: walk to the next waypoint, pause there and scan around.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.scanTime = (guard.scanTime ?? 0) + dt;
      guard.angle += Math.sin(guard.scanTime * 1.4 + guard.id) * 0.02;
    } else {
      const target = guard.patrol.waypoints[guard.waypointIndex];
      const arrived = stepToward(guard, target.x, target.y, GUARD.patrolSpeed, dt);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.patrol.waypoints.length;
        guard.pauseLeft = GUARD.waypointPause;
      }
    }
    // A loud run nearby pulls a patrolling guard over to listen.
    if (noise) {
      const distance = Math.hypot(noise.x - guard.x, noise.y - guard.y);
      if (distance < 260) {
        guard.state = 'investigate';
        guard.investigateX = noise.x;
        guard.investigateY = noise.y;
        guard.investigateLeft = GUARD.investigateTime * 0.5;
      }
    }
  }
  return seen ? 'spotted' : 'quiet';
}

/** Send a guard to investigate a thrown coin's landing spot. */
export function sendGuardToCoin(guard, x, y) {
  if (guard.state === 'chase') return;
  guard.state = 'investigate';
  guard.investigateX = x;
  guard.investigateY = y;
  guard.investigateLeft = GUARD.investigateTime;
}

/** Advance one camera a step: sweep its cone back and forth. */
export function stepCamera(camera, dt, time) {
  camera.angle =
    camera.homeAngle + Math.sin(time * CAMERA.sweepSpeed + camera.sweepPhase) * CAMERA.sweepArc;
}

/** True when any watcher sees the thief this step. */
export function anyWatcherSees(watchers, thief, blockers, smokes, disguised) {
  for (let i = 0; i < watchers.length; i += 1) {
    if (canSee(watchers[i], thief, blockers, smokes, disguised)) return true;
  }
  return false;
}

export { ALARM };
