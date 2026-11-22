// Everything the eye sees: the gallery, the cones, the thief, and the HUD.
// Safe cover is brown wood, danger is a yellow or red cone, loot glows gold,
// and the alarm meter across the top tells the whole night at a glance.

import { ALARM, FIELD, PALETTE, FONT, TOOLS } from './config.js';
import { CASES, CRATES, EXIT, PEDESTAL, WALLS } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_ESCAPED = 'escaped';

/** Create a renderer bound to the canvas; it scales the 1280x720 field to fit. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale);
    canvas.height = Math.round(FIELD.height * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
  }

  function drawCone(x, y, angle, range, halfAngle, fill, edge) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawRect(r, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.floorTile;
    for (let y = 26; y < FIELD.height - 26; y += 64) {
      for (let x = 26 + ((y / 64) % 2) * 32; x < FIELD.width - 26; x += 64) {
        ctx.fillRect(x, y, 60, 60);
      }
    }
    // The red carpet runner: the thief's highway down the centre lane.
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(480, 26, 320, FIELD.height - 52);
    ctx.fillStyle = PALETTE.carpetEdge;
    ctx.fillRect(480, 26, 6, FIELD.height - 52);
    ctx.fillRect(794, 26, 6, FIELD.height - 52);
  }

  function drawRoom(world) {
    for (const wall of WALLS) {
      drawRect(wall, PALETTE.wall, PALETTE.wallTop);
    }
    for (const crate of CRATES) {
      drawRect(crate, PALETTE.crate, PALETTE.crateTop);
      ctx.strokeStyle = PALETTE.crateTop;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crate.x, crate.y + crate.h / 2);
      ctx.lineTo(crate.x + crate.w, crate.y + crate.h / 2);
      ctx.stroke();
    }
    for (const glassCase of CASES) {
      drawRect(glassCase, 'rgba(61, 111, 142, 0.35)', PALETTE.glassEdge);
      ctx.beginPath();
      ctx.moveTo(glassCase.x, glassCase.y);
      ctx.lineTo(glassCase.x + glassCase.w, glassCase.y + glassCase.h);
      ctx.strokeStyle = 'rgba(127, 196, 232, 0.5)';
      ctx.stroke();
    }

    // The opal pedestal and the opal itself, glowing gold.
    drawRect(PEDESTAL, '#3a2f1d', PALETTE.opal);
    if (!world.opalTaken) {
      const glow = ctx.createRadialGradient(
        PEDESTAL.x + PEDESTAL.w / 2, PEDESTAL.y + PEDESTAL.h / 2, 4,
        PEDESTAL.x + PEDESTAL.w / 2, PEDESTAL.y + PEDESTAL.h / 2, 70,
      );
      glow.addColorStop(0, PALETTE.opalGlow);
      glow.addColorStop(1, 'rgba(255, 217, 74, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(PEDESTAL.x - 50, PEDESTAL.y - 50, PEDESTAL.w + 100, PEDESTAL.h + 100);
      ctx.save();
      ctx.translate(PEDESTAL.x + PEDESTAL.w / 2, PEDESTAL.y + PEDESTAL.h / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = PALETTE.opal;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.restore();
      ctx.fillStyle = '#fff6c9';
      ctx.fillRect(PEDESTAL.x + PEDESTAL.w / 2 - 4, PEDESTAL.y + PEDESTAL.h / 2 - 4, 8, 8);
    } else {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `13px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('EMPTY', PEDESTAL.x + PEDESTAL.w / 2, PEDESTAL.y + PEDESTAL.h / 2 + 5);
    }

    // Side gems on the cases.
    for (const gem of world.gems) {
      if (gem.taken) continue;
      ctx.save();
      ctx.translate(gem.x, gem.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#7fe3c0';
      ctx.fillRect(-8, -8, 16, 16);
      ctx.restore();
    }

    // The getaway door, bottom-left: green while the opal is in hand.
    drawRect(EXIT, world.opalTaken ? PALETTE.exit : '#274a35', world.opalTaken ? '#b8ffd4' : '#5a7a66');
    ctx.fillStyle = world.opalTaken ? '#062b16' : '#9fc4ab';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(world.opalTaken ? 'GETAWAY →' : 'LOCKED', EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5);
  }

  function drawWatchers(world) {
    for (const camera of world.cameras) {
      drawCone(camera.x, camera.y, camera.angle, camera.range, camera.halfAngle, PALETTE.cameraCone, PALETTE.cameraConeEdge);
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 4, camera.y + Math.sin(camera.angle) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const guard of world.guards) {
      drawCone(guard.x, guard.y, guard.angle, guard.range, guard.halfAngle, PALETTE.guardCone, PALETTE.guardConeEdge);
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd65a';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 4, 0, Math.PI * 2);
      ctx.fill();
      if (guard.state === 'chase') {
        ctx.fillStyle = '#ff5c5c';
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 22);
      } else if (guard.state === 'investigate') {
        ctx.fillStyle = '#ffd65a';
        ctx.font = `bold 16px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('?', guard.x, guard.y - 22);
      }
    }
  }

  function drawThief(world) {
    const thief = world.thief;
    if (world.disguiseLeft > 0) {
      ctx.strokeStyle = 'rgba(122, 95, 208, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (thief.running) {
      ctx.strokeStyle = 'rgba(242, 234, 216, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, TOOLS.smokeRadius * 0.9, 0, Math.PI * 2);
      ctx.setLineDash([6, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // Hooded figure: cloak triangle and a pale face in the hood.
    ctx.save();
    ctx.translate(thief.x, thief.y);
    ctx.rotate(thief.angle + Math.PI / 2);
    ctx.fillStyle = PALETTE.thiefCloak;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(12, 12);
    ctx.lineTo(-12, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8dcc3';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (world.opalTaken) {
      ctx.fillStyle = PALETTE.opal;
      ctx.save();
      ctx.translate(thief.x + 16, thief.y - 14);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-6, -6, 12, 12);
      ctx.restore();
    }
  }

  function drawSmoke(world) {
    for (const smoke of world.smokes) {
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, smoke.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHud(world, screen) {
    // Top bar: alarm meter, tools, loot and clock.
    ctx.fillStyle = 'rgba(16, 16, 16, 0.85)';
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', 26, 29);
    const meterX = 100;
    const meterW = 320;
    ctx.fillStyle = '#333';
    ctx.fillRect(meterX, 14, meterW, 18);
    const alarmColour =
      world.alarm >= ALARM.warningLevel
        ? PALETTE.alarmHigh
        : world.alarm > 25
          ? PALETTE.alarmMid
          : PALETTE.alarmLow;
    ctx.fillStyle = alarmColour;
    ctx.fillRect(meterX, 14, meterW * (world.alarm / ALARM.max), 18);
    if (world.alarm >= ALARM.warningLevel && screen === SCREEN_PLAY) {
      ctx.strokeStyle = Math.floor(world.time * 6) % 2 ? '#ff5c5c' : '#ffd65a';
      ctx.lineWidth = 2;
      ctx.strokeRect(meterX - 2, 12, meterW + 4, 22);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`SCORE ${world.score}`, 460, 29);
    ctx.fillText(`GEMS ${world.gemsTaken}/3`, 590, 29);
    ctx.fillText(`OPAL ${world.opalTaken ? '✓' : '—'}`, 700, 29);
    ctx.fillText(`SMOKE ${world.smokeCharges}  COIN ${world.coinCharges}  MASK ${world.disguiseCharges}`, 830, 29);
    const minutes = Math.floor(world.time / 60);
    const seconds = Math.floor(world.time % 60);
    ctx.textAlign = 'right';
    ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, FIELD.width - 26, 29);
    ctx.textAlign = 'left';
    if (world.spotted && screen === SCREEN_PLAY) {
      ctx.fillStyle = '#ff5c5c';
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED — BREAK LINE OF SIGHT!', FIELD.width / 2, 84);
      ctx.textAlign = 'left';
    }
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 8, 6, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = accent;
    ctx.font = `bold 54px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `20px ${FONT}`;
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, 310 + index * 34);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.fillText('Click or press Space to continue', FIELD.width / 2, 310 + lines.length * 34 + 24);
    ctx.textAlign = 'left';
  }

  function draw(state, screen, best) {
    fit();
    const scale = canvas.width / FIELD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawFloor();
    drawRoom(state);
    drawWatchers(state);
    drawSmoke(state);
    drawThief(state);
    drawHud(state, screen);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(229, 72, 77, ${state.flash * 0.35})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawOverlay('THE VELVET VAULT', [
        'One room. Three guards. Two cameras. One opal.',
        'WASD / arrows to move · Shift to run (loud!)',
        'Q smoke pellet · E or click to toss a coin · F disguise mask',
        'Grab the Sunset Opal, then slip out the green getaway door.',
        `Best score: ${best}`,
      ], PALETTE.opal);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['The guards wait. The opal waits.', 'Press P or Space to keep moving.'], PALETTE.text);
    } else if (screen === SCREEN_CAUGHT) {
      drawOverlay('CAUGHT!', [
        `The alarm hit ${ALARM.max} and the gallery locked down.`,
        `Score ${state.score} · Gems ${state.gemsTaken}/3 · Opal ${state.opalTaken ? 'taken' : 'left behind'}`,
        'Next time: watch the cones sweep before you step out.',
      ], PALETTE.alarmHigh);
    } else if (screen === SCREEN_ESCAPED) {
      drawOverlay('CLEAN GETAWAY!', [
        `The Sunset Opal is yours. Score ${state.score}.`,
        `Time ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')} · Gems ${state.gemsTaken}/3`,
        `Best score: ${best}`,
      ], PALETTE.exit);
    }
  }

  return { draw };
}
