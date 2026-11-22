// A small seeded random source, so a seed always builds the same night:
// the same guard patrols, the same gem placement, the same screenshot.

/** Mulberry32: a tiny deterministic generator from one 32-bit seed. */
export function createRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random number in [min, max) from the seeded source. */
export function range(random, min, max) {
  return min + random() * (max - min);
}
