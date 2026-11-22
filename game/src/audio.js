// Every sound is synthesized with WebAudio: no audio files, no network.
// A soft pad hums under the gallery, a coin chimes, the opal sings, the
// alarm wails while the meter is high, and a caught thief hears a sting.

/** Build the sound board. Nothing plays until the player gestures (start). */
export function createAudio() {
  let context = null;
  let padNodes = null;
  let alarmNodes = null;

  function ensure() {
    if (context) return context;
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    return context;
  }

  /** One short oscillator note: frequency, seconds, shape, volume. */
  function note(frequency, seconds, type, volume, when = 0) {
    const ctx = ensure();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + when;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    /** Call from the first gesture so the browser unlocks sound. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    },

    /** Start the low gallery hum underneath everything. */
    startPad() {
      const ctx = ensure();
      if (!ctx || padNodes) return;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 55;
      gain.gain.value = 0.035;
      const wobble = ctx.createOscillator();
      const wobbleGain = ctx.createGain();
      wobble.frequency.value = 0.07;
      wobbleGain.gain.value = 0.015;
      wobble.connect(wobbleGain);
      wobbleGain.connect(gain.gain);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      wobble.start();
      padNodes = { oscillator, wobble };
    },

    /** A coin tossed: a bright tick. */
    coinToss() {
      note(1320, 0.12, 'triangle', 0.12);
    },

    /** A gem snatched: two rising chimes. */
    gem() {
      note(880, 0.18, 'sine', 0.14);
      note(1318, 0.25, 'sine', 0.12, 0.07);
    },

    /** The opal in hand: a small golden arpeggio. */
    opal() {
      note(523, 0.22, 'sine', 0.16);
      note(659, 0.22, 'sine', 0.16, 0.09);
      note(784, 0.3, 'sine', 0.16, 0.18);
      note(1046, 0.45, 'sine', 0.14, 0.27);
    },

    /** A smoke pellet: a soft puff of noise. */
    smoke() {
      const ctx = ensure();
      if (!ctx) return;
      const duration = 0.35;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.value = 0.18;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    },

    /** The alarm wail, on while the meter is over the warning line. */
    setAlarm(on) {
      const ctx = ensure();
      if (!ctx) return;
      if (on && !alarmNodes) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 620;
        gain.gain.value = 0.045;
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 2.2;
        lfoGain.gain.value = 180;
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        lfo.start();
        alarmNodes = { oscillator, lfo };
      } else if (!on && alarmNodes) {
        alarmNodes.oscillator.stop();
        alarmNodes.lfo.stop();
        alarmNodes = null;
      }
    },

    /** Caught: a low sting. */
    caught() {
      note(220, 0.5, 'sawtooth', 0.16);
      note(110, 0.8, 'sawtooth', 0.14, 0.12);
    },

    /** Escaped: a getaway arpeggio. */
    escaped() {
      [523, 659, 784, 1046, 1318].forEach((frequency, index) => {
        note(frequency, 0.3, 'triangle', 0.14, index * 0.09);
      });
    },
  };
}
