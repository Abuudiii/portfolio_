// Tiny WebAudio SFX: square/triangle tones, no audio files. Sound defaults to off.
const KEY = 'pq-sound';
const GAIN = 0.06;

let enabled = readPref();
let ctx = null;

function readPref() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function getCtx() {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

function wake(c) {
  if (c.state === 'suspended') c.resume().catch(() => {});
}

// One oscillator note from `start` (context time) lasting `dur`, sweeping f0 -> f1.
function tone(c, type, f0, f1, start, dur) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const end = start + dur;
  osc.type = type;
  osc.frequency.setValueAtTime(f0, start);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, end);
  g.gain.setValueAtTime(GAIN, start);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(end + 0.01);
}

export function sfx(name) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  wake(c);
  const t = c.currentTime;
  switch (name) {
    case 'jump': tone(c, 'square', 300, 600, t, 0.12); break;
    case 'bump': tone(c, 'square', 120, 120, t, 0.08); break;
    case 'coin':
      tone(c, 'square', 988, 988, t, 0.08);
      tone(c, 'square', 1319, 1319, t + 0.08, 0.2);
      break;
    case 'stomp': tone(c, 'triangle', 400, 100, t, 0.1); break;
    case 'hurt': tone(c, 'square', 200, 80, t, 0.25); break;
    case 'clear':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, 'square', f, f, t + i * 0.12, 0.12));
      break;
  }
}

export function setSound(on) {
  enabled = !!on;
  try {
    localStorage.setItem(KEY, enabled ? 'on' : 'off');
  } catch {}
  if (enabled) {
    const c = getCtx();
    if (c) wake(c);
  }
}

export function soundOn() {
  return enabled;
}
