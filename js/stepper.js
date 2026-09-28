// Guided navigation for the journey: a wheel/swipe/key gesture past a small threshold plays a
// timed flight to the next (or previous) snap point instead of scrubbing the camera by hand.
// The camera stays a pure function of scrollY; this module only animates scrollY.

import { clamp } from './camera.js';

// Seconds to traverse a full segment of each kind. Stops are entered/left at their midpoint,
// so a stop-to-stop flight costs half a stop + a transit + half a stop.
const SEG_SECONDS = { intro: 1.2, transit: 3.4, stop: 1.6, outro: 1.2 };
const WHEEL_THRESHOLD = 50; // px of accumulated wheel delta
const SWIPE_THRESHOLD = 40; // px of finger travel
const GESTURE_GAP_MS = 200; // wheel silence that ends a gesture (trackpad inertia included)
// While map tiles are still loading, the last part of a flight runs slower, up to this much extra.
const SETTLE_FRACTION = 0.45;
const SETTLE_SPEED = 0.35;
const MAX_STRETCH = 1.0; // at most +100% of the nominal duration

export function createStepper({ getPoints, getTimeline, isReady, isReduced }) {
  let anim = null;
  let wheelAcc = 0;
  let lastWheelT = 0;
  let wheelLocked = false;
  let touchY = null;
  let touchFired = false;

  const end = () => {
    const pts = getPoints();
    return pts[pts.length - 1];
  };
  // Inside the guided story, or at the top of the free-scrolling area and heading back up.
  const guided = (dir) => scrollY < end() - 2 || (dir < 0 && scrollY <= end() + 2);
  const modalOpen = () => document.querySelector('dialog[open]') !== null;

  function target(dir) {
    const pts = getPoints();
    if (dir > 0) return pts.findIndex((y) => y > scrollY + 2);
    for (let i = pts.length - 1; i >= 0; i--) if (pts[i] < scrollY - 2) return i;
    return -1;
  }

  // Piecewise-linear (time -> scrollY) keyframes, timed per segment kind.
  function keyframes(y0, y1) {
    const lo = Math.min(y0, y1);
    const hi = Math.max(y0, y1);
    const cuts = [lo, hi];
    for (const s of getTimeline()) cuts.push(s.top, s.top + s.height);
    const ys = [...new Set(cuts.filter((y) => y >= lo && y <= hi))].sort((a, b) => a - b);
    const secondsFor = (a, b) => {
      const mid = (a + b) / 2;
      const seg = getTimeline().find((s) => mid >= s.top && mid < s.top + s.height);
      const perPx = seg ? SEG_SECONDS[seg.kind] / seg.height : 1 / innerHeight;
      return (b - a) * perPx;
    };
    const frames = [{ y: ys[0], t: 0 }];
    for (let i = 1; i < ys.length; i++) {
      frames.push({ y: ys[i], t: frames[i - 1].t + secondsFor(ys[i - 1], ys[i]) });
    }
    if (y0 <= y1) return frames;
    const total = frames[frames.length - 1].t;
    return frames.reverse().map((f) => ({ y: f.y, t: total - f.t }));
  }

  function yAt(frames, t) {
    let i = 1;
    while (i < frames.length - 1 && frames[i].t < t) i++;
    const a = frames[i - 1];
    const b = frames[i];
    const span = b.t - a.t;
    return span > 0 ? a.y + (b.y - a.y) * clamp((t - a.t) / span, 0, 1) : b.y;
  }

  function goTo(index) {
    const pts = getPoints();
    const y1 = pts[clamp(index, 0, pts.length - 1)];
    if (isReduced()) {
      anim = null;
      scrollTo({ top: y1, behavior: 'instant' });
      return;
    }
    const frames = keyframes(scrollY, y1);
    const total = frames[frames.length - 1].t;
    if (total <= 0) return;
    anim = { frames, total, t: 0, real: 0, last: null };
    requestAnimationFrame(tick);
  }

  function tick(now) {
    if (!anim) return;
    const dt = anim.last == null ? 0 : Math.min(0.25, (now - anim.last) / 1000);
    anim.last = now;
    anim.real += dt;
    // Ease off near the destination until tiles arrive, within a bounded stretch.
    const settling = anim.t > anim.total * (1 - SETTLE_FRACTION);
    const stretched = anim.real - anim.total >= anim.total * MAX_STRETCH;
    const speed = settling && !stretched && !isReady() ? SETTLE_SPEED : 1;
    anim.t = Math.min(anim.total, anim.t + dt * speed);
    scrollTo({ top: yAt(anim.frames, anim.t), behavior: 'instant' });
    if (anim.t >= anim.total) {
      anim = null;
      return;
    }
    requestAnimationFrame(tick);
  }

  function step(dir) {
    const i = target(dir);
    if (i !== -1) goTo(i);
  }

  addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || modalOpen()) return; // pinch-zoom / dialog
      const dir = Math.sign(e.deltaY);
      const now = performance.now();
      const gap = now - lastWheelT;
      lastWheelT = now;
      // One gesture = one step: stay locked until the wheel (and trackpad inertia) goes quiet.
      if (wheelLocked && !anim && gap >= GESTURE_GAP_MS) wheelLocked = false;
      if (!anim && !wheelLocked && !guided(dir)) return;
      e.preventDefault();
      if (anim || wheelLocked) return;
      if (gap > GESTURE_GAP_MS) wheelAcc = 0;
      wheelAcc += e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(wheelAcc) >= WHEEL_THRESHOLD) {
        wheelLocked = true;
        step(Math.sign(wheelAcc));
        wheelAcc = 0;
      }
    },
    { passive: false },
  );

  addEventListener(
    'touchstart',
    (e) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
      touchFired = false;
    },
    { passive: true },
  );
  addEventListener(
    'touchmove',
    (e) => {
      if (touchY == null || modalOpen()) return;
      const dy = touchY - e.touches[0].clientY; // finger up = forward
      const dir = Math.sign(dy);
      if (!anim && !touchFired && !guided(dir)) return;
      e.preventDefault();
      if (anim || touchFired || Math.abs(dy) < SWIPE_THRESHOLD) return;
      touchFired = true;
      step(dir);
    },
    { passive: false },
  );

  addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || modalOpen()) return;
    if (e.target.closest?.('input, textarea, select, button, a, [contenteditable]') && e.key === ' ') return;
    const forward = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey);
    const back = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    const dir = forward ? 1 : back ? -1 : 0;
    if (!dir || !guided(dir)) return;
    e.preventDefault();
    if (!anim) step(dir);
  });

  return { goTo };
}
