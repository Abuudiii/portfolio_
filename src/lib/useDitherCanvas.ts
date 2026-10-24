import { useEffect, type RefObject } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** CSS px per dither pixel, matching the scenes. */
const DOT = 2;

/**
 * Per-frame painter for a small standalone 1-bit canvas. Fill `value` with intensities (0..1+,
 * thresholded against the R2 dither) and mark `solid` where the shape should hide the stars
 * behind it even when a pixel dithers off. Both arrays are cleared before each call.
 */
export type DitherPainter = (t: number, value: Float32Array, solid: Uint8Array) => void;

/**
 * Drives a small transparent 1-bit canvas overlaid on the page (the Sun, the Helix): snaps it to
 * whole device pixels, reads ink and paper from the page's colours, dithers each frame with the
 * same R2 mask as the scenes, animates only while on screen, and draws one still frame under
 * `prefers-reduced-motion`.
 */
export function useDitherCanvas(ref: RefObject<HTMLCanvasElement>, w: number, h: number, fps: number, paint: DitherPainter) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const device = Math.max(1, Math.round(DOT * dpr));
    canvas.style.width = `${(w * device) / dpr}px`;
    canvas.style.height = `${(h * device) / dpr}px`;

    const rgb = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);
    const ink = rgb(getComputedStyle(canvas).color);
    const paper = rgb(getComputedStyle(document.body).backgroundColor);

    const image = ctx.createImageData(w, h);
    const px = image.data;
    const value = new Float32Array(w * h);
    const solid = new Uint8Array(w * h);
    const start = performance.now();

    const frame = (t: number) => {
      value.fill(0);
      solid.fill(0);
      paint(t, value, solid);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const k = y * w + x;
          const r2 = 0.7548776662 * x + 0.56984029 * y;
          const on = value[k] > r2 - Math.floor(r2);
          const c = on ? ink : paper;
          const i = k * 4;
          px[i] = c[0];
          px[i + 1] = c[1];
          px[i + 2] = c[2];
          px[i + 3] = on || solid[k] ? 255 : 0;
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    frame(9);
    if (reduced) return;
    let timer = 0;
    const visibility = new IntersectionObserver(([entry]) => {
      clearInterval(timer);
      if (entry.isIntersecting) timer = window.setInterval(() => frame((performance.now() - start) / 1000), 1000 / fps);
    });
    visibility.observe(canvas);
    return () => {
      visibility.disconnect();
      clearInterval(timer);
    };
  }, [ref, w, h, fps, paint, reduced]);
}
