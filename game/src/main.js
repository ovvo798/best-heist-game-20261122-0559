// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, caught and escaped.
//
// ?seed=N fixes the night's random source. ?shot=title|heist|loot|getaway|caught
// (with &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_GEM, EVENT_OPAL, EVENT_SPOTTED, resetWorld, stepIdleWorld, stepWorld } from './world.js';
import { ACTION_COIN, ACTION_CONFIRM, ACTION_DISGUISE, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CAUGHT, SCREEN_ESCAPED, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // Tool actions read this frame, held for the next world step to consume.
  let pendingActions = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.startPad();
    resetWorld(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Grab the Sunset Opal and reach the green getaway door.');
  }

  function endGame(escaped) {
    screen = escaped ? SCREEN_ESCAPED : SCREEN_CAUGHT;
    if (world.score > best) {
      best = world.score;
      saveBest(best);
    }
    if (escaped) {
      audio.escaped();
      announce(`Clean getaway. Score ${world.score}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught. Score ${world.score}. Best ${best}.`);
    }
    audio.setAlarm(false);
  }

  function handleActions() {
    const actions = input.takeActions();
    pendingActions |= actions;
    const coinTarget = input.takeCoinTarget();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.setAlarm(false);
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // A click is a coin toss while playing; on a menu screen it starts.
    if (coinTarget && screen === SCREEN_PLAY) {
      world.pendingCoin = coinTarget;
    } else if (coinTarget && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_ESCAPED)) {
      startGame();
    }
  }

  function aheadPoint(thief) {
    return { x: thief.x + Math.cos(thief.angle) * 150, y: thief.y + Math.sin(thief.angle) * 150 };
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The gallery idles behind the title: guards patrol, cameras sweep,
      // and nobody can spot the thief before the night begins.
      stepIdleWorld(world, STEP);
      return;
    }
    const actions = pendingActions;
    pendingActions = 0;
    const coinTarget = world.pendingCoin ?? (actions & ACTION_COIN ? aheadPoint(world.thief) : null);
    world.pendingCoin = null;
    const toolActions = {
      smoke: Boolean(actions & ACTION_SMOKE),
      coin: Boolean(actions & ACTION_COIN) || Boolean(coinTarget),
      coinX: coinTarget ? coinTarget.x : undefined,
      coinY: coinTarget ? coinTarget.y : undefined,
      disguise: Boolean(actions & ACTION_DISGUISE),
    };
    if (actions & ACTION_SMOKE) audio.smoke();
    if (toolActions.coin) audio.coinToss();
    const events = stepWorld(world, STEP, input.direction(), input.running(), toolActions);
    if (events & EVENT_OPAL) {
      audio.opal();
      announce('The Sunset Opal is yours. Reach the green getaway door.');
    } else if (events & EVENT_GEM) {
      audio.gem();
    } else if (events & EVENT_SPOTTED) {
      announce('Spotted. Break line of sight.');
    }
    audio.setAlarm(world.alarm >= 55 && screen === SCREEN_PLAY);
    if (events & EVENT_ESCAPED) endGame(true);
    else if (events & EVENT_CAUGHT) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.setAlarm(false);
      announce('Paused.');
    }
  });

  announce('The Velvet Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
