// The screenshot scenes behind ?shot=title|heist|loot|getaway.
// Each one stages a real world from the game's own rules — a fresh night,
// then the thief and the watchers placed where a real run would put them —
// and returns the screen to draw over it. The same seed always gives the
// same frame.

import { ALARM, STEP } from './config.js';
import { resetWorld, stepWorld } from './world.js';
import { SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Walk the thief along `path` for `seconds`, one fixed step at a time. */
function walkPath(world, path, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let step = 0; step < steps; step += 1) {
    const leg = Math.min(path.length - 1, Math.floor((step / steps) * path.length));
    const target = path[leg];
    const dx = target.x - world.thief.x;
    const dy = target.y - world.thief.y;
    const length = Math.hypot(dx, dy) || 1;
    stepWorld(world, STEP, { x: dx / length, y: dy / length }, false, {});
    if (world.caught || world.escaped) break;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it
 * and the best score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  resetWorld(world);
  if (name === 'heist') {
    // Mid-heist: the thief is halfway up the centre lane, a guard's cone
    // sweeping close, the alarm already half full.
    walkPath(world, [{ x: 560, y: 600 }, { x: 560, y: 420 }], 6);
    world.caught = false;
    world.flash = 0;
    world.thief.x = 560;
    world.thief.y = 430;
    world.alarm = 52;
    world.score = 100;
    world.gems[0].taken = true;
    world.gemsTaken = 1;
    world.guards[0].x = 640;
    world.guards[0].y = 330;
    world.guards[0].angle = Math.PI * 0.75;
    world.guards[0].state = 'patrol';
    return { screen: SCREEN_PLAY, best: 500 };
  }
  if (name === 'loot') {
    // The grab: the thief at the pedestal, opal in hand, a camera's cone
    // swinging in and the alarm screaming.
    world.thief.x = 1120;
    world.thief.y = 210;
    world.thief.angle = -Math.PI / 2;
    world.opalTaken = true;
    world.score = 600;
    world.gemsTaken = 2;
    world.gems[0].taken = true;
    world.gems[1].taken = true;
    world.alarm = 78;
    world.spotted = true;
    world.cameras[1].angle = Math.PI * 1.15;
    world.guards[1].x = 1050;
    world.guards[1].y = 300;
    world.guards[1].angle = -Math.PI / 2;
    world.guards[1].state = 'chase';
    return { screen: SCREEN_PLAY, best: 500 };
  }
  if (name === 'getaway') {
    // The payoff: opal taken, thief at the green door, clean escape.
    world.thief.x = 95;
    world.thief.y = 667;
    world.opalTaken = true;
    world.score = 940;
    world.gemsTaken = 3;
    world.gems.forEach((gem) => {
      gem.taken = true;
    });
    world.time = 118;
    world.escaped = true;
    return { screen: SCREEN_ESCAPED, best: 940 };
  }
  if (name === 'caught') {
    world.alarm = ALARM.max;
    world.caught = true;
    world.flash = 0;
    world.score = 200;
    world.gemsTaken = 1;
    world.gems[0].taken = true;
    return { screen: SCREEN_CAUGHT, best: 500 };
  }
  // Title: let the guards patrol a few seconds so the cones are mid-sweep.
  walkPath(world, [{ x: 90, y: 610 }], 5);
  world.caught = false;
  world.flash = 0;
  return { screen: SCREEN_TITLE, best: 500 };
}
