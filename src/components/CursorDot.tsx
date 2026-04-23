import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

export default function CursorDot() {
  const reduced = useReducedMotion();
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.25 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.25 });

  useEffect(() => {
    if (reduced) return;
    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!visible) setVisible(true);
    };
    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest('a, button, [data-magnetic]');
      setHovering(!!interactive);
    };
    const leave = () => setVisible(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    window.addEventListener('mouseleave', leave);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      window.removeEventListener('mouseleave', leave);
    };
  }, [reduced, x, y, visible]);

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[60] hidden md:block"
      style={{
        x: sx,
        y: sy,
        translateX: '-50%',
        translateY: '-50%',
        opacity: visible ? 1 : 0,
      }}
    >
      <motion.div
        animate={{
          scale: hovering ? 2.8 : 1,
          backgroundColor: hovering ? 'rgba(184, 70, 43, 0.15)' : '#B8462B',
          borderColor: '#B8462B',
        }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="h-2 w-2 rounded-full border"
      />
    </motion.div>
  );
}
