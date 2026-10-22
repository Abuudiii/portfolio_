import { useEffect, useRef } from 'react';
import { OrbitRenderer, type Layout } from '../lib/orbit';
import { useReducedMotion } from '../lib/useReducedMotion';

/** Size of one dither pixel in CSS pixels; finer on small screens so the Earth keeps detail. */
const DOT: Record<Layout, number> = { side: 2, center: 1.5 };

export default function Orbit({ layout, className = '' }: { layout: Layout; className?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const renderer = new OrbitRenderer(canvas);
    const start = performance.now();
    let last = start;
    let frame = 0;

    const fit = () => {
      // Snap each dither pixel to a whole number of device pixels so dots stay crisp.
      const dpr = window.devicePixelRatio || 1;
      const device = Math.max(1, Math.round(DOT[layout] * dpr));
      const { width, height } = box.getBoundingClientRect();
      const w = Math.ceil((width * dpr) / device);
      const h = Math.ceil((height * dpr) / device);
      canvas.style.width = `${(w * device) / dpr}px`;
      canvas.style.height = `${(h * device) / dpr}px`;
      renderer.resize(w, h, layout);
      renderer.render(reduced ? 9 : (last - start) / 1000);
      if (!reduced && !frame) frame = requestAnimationFrame(tick);
    };

    const tick = (now: number) => {
      renderer.render((now - start) / 1000, Math.min(0.1, (now - last) / 1000));
      last = now;
      frame = requestAnimationFrame(tick);
    };

    // ResizeObserver fires once on observe: that first fit sizes the buffers and starts the loop.
    const observer = new ResizeObserver(fit);
    observer.observe(box);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [layout, reduced]);

  return (
    <div ref={boxRef} className={`overflow-hidden ${className}`} aria-hidden="true">
      <canvas ref={canvasRef} className="block [image-rendering:pixelated]" />
    </div>
  );
}
