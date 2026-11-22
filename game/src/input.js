// Keyboard and mouse: WASD or arrows to move, Shift to run (loud),
// Q for a smoke pellet, F for the disguise, E or a mouse click to toss a
// coin where the nearest guard will go and look. Space or a click starts
// the game and restarts it after a win or a catch.

export const ACTION_CONFIRM = 1 << 0;
export const ACTION_PAUSE = 1 << 1;
export const ACTION_SMOKE = 1 << 2;
export const ACTION_COIN = 1 << 3;
export const ACTION_DISGUISE = 1 << 4;

/**
 * Attach listeners to the canvas and return the live input state.
 * `onCoinTarget` receives the field coordinates of a mouse click.
 */
export function createInput(canvas, onCoinTarget) {
  const keys = new Set();
  let actions = 0;
  let coinTarget = null;

  function fieldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function keyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'enter') actions |= ACTION_CONFIRM;
    if (key === 'p' || key === 'escape') actions |= ACTION_PAUSE;
    if (key === 'q') actions |= ACTION_SMOKE;
    if (key === 'e') actions |= ACTION_COIN;
    if (key === 'f') actions |= ACTION_DISGUISE;
  }

  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function pointerDown(event) {
    const point = fieldPoint(event);
    if (event.button === 0) {
      coinTarget = point;
      actions |= ACTION_COIN;
    }
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);

  return {
    /** The movement direction this frame, from -1..1 on each axis. */
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return { x, y };
    },
    /** True while Shift is held. */
    running() {
      return keys.has('shift');
    },
    /** One-shot actions since the last call; cleared on read. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The field point of the last click, or null; cleared on read. */
    takeCoinTarget() {
      const target = coinTarget;
      coinTarget = null;
      return target;
    },
    /** A click anywhere also confirms (start / restart). */
    confirmOnClick: true,
  };
}
