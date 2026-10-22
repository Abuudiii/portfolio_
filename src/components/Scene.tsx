import { useEffect, useRef } from 'react';
import type { DitherScene, Layout } from '../lib/dither';
import { useReducedMotion } from '../lib/useReducedMotion';

/** Size of one dither pixel in CSS pixels; finer on small screens so subjects keep detail. */
const DOT: Record<Layout, number> = { side: 2, center: 1.5 };

type Props = {
  scene: new (canvas: HTMLCanvasElement) => DitherScene;
  layout: Layout;
  className?: string;
};

/**
 * Hosts one 1-bit canvas scene. The scene is built the first time it nears the
 * viewport (some precompute is heavy) and only animates while on screen.
 */
export default function Scene({ scene, layout, className = '' }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let renderer: DitherScene | null = null;
    let elapsed = reduced ? 9 : 0;
    let last = 0;
    let frame = 0;
    let sized = '';
    let settle = 0;

    const fit = () => {
      if (!renderer) return;
      // Snap each dither pixel to a whole number of device pixels so dots stay crisp.
      const dpr = window.devicePixelRatio || 1;
      const device = Math.max(1, Math.round(DOT[layout] * dpr));
      const { width, height } = box.getBoundingClientRect();
      const w = Math.ceil((width * dpr) / device);
      const h = Math.ceil((height * dpr) / device);
      if (`${w}x${h}` === sized) return;
      sized = `${w}x${h}`;
      canvas.style.width = `${(w * device) / dpr}px`;
      canvas.style.height = `${(h * device) / dpr}px`;
      renderer.resize(w, h, layout);
      renderer.render(elapsed, 0);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      elapsed += dt;
      renderer?.render(elapsed, dt);
      frame = requestAnimationFrame(tick);
    };

    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !renderer) {
          renderer = new scene(canvas);
          fit();
        }
        if (entry.isIntersecting && !reduced && !frame) {
          last = performance.now();
          frame = requestAnimationFrame(tick);
        } else if (!entry.isIntersecting && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: '30% 0px' },
    );
    // Resizing rebuilds lookup tables (the black hole re-traces its rays), so wait for the drag to settle.
    const resize = new ResizeObserver(() => {
      clearTimeout(settle);
      settle = window.setTimeout(fit, 150);
    });
    visibility.observe(box);
    resize.observe(box);

    return () => {
      visibility.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(settle);
    };
  }, [scene, layout, reduced]);

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
    </div>
  );
}
