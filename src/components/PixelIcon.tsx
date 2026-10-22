import { useEffect, useRef } from 'react';
import { Pen, SPRITE_SIZE, sprites, type SpriteName } from '../lib/sprites';
import { useReducedMotion } from '../lib/useReducedMotion';

/** Target CSS px per sprite pixel (~24px icons); snapped to whole device pixels below. */
const DOT = 1.5;

/** A 16x16 animated 1-bit sprite. */
export default function PixelIcon({ name }: { name: SpriteName }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const sprite = sprites[name];
    // Paint in the inherited text colour so the icon is always ink.
    ctx.fillStyle = getComputedStyle(canvas).color;
    // Snap each sprite pixel to whole device pixels so dots stay even (like the scenes).
    const dpr = window.devicePixelRatio || 1;
    const side = `${(SPRITE_SIZE * Math.max(1, Math.round(DOT * dpr))) / dpr}px`;
    canvas.style.width = side;
    canvas.style.height = side;
    let frame = 0;

    const paint = () => {
      const pen = new Pen();
      sprite.draw(pen, frame);
      ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
      for (let i = 0; i < pen.data.length; i++) {
        if (pen.data[i]) ctx.fillRect(i % SPRITE_SIZE, Math.floor(i / SPRITE_SIZE), 1, 1);
      }
      frame = (frame + 1) % sprite.frames;
    };

    paint();
    if (reduced) return;
    const timer = window.setInterval(paint, 1000 / sprite.fps);
    return () => clearInterval(timer);
  }, [name, reduced]);

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      aria-hidden="true"
      className="block h-6 w-6 shrink-0 bg-paper [image-rendering:pixelated]"
    />
  );
}
