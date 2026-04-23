import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../lib/useReducedMotion';

type Props = {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'span';
  className?: string;
};

export default function BlurIn({
  children,
  delay = 0,
  as = 'div',
  className,
}: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const motionProps = {
    initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
    whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    className,
  };

  if (as === 'li') return <motion.li {...motionProps}>{children}</motion.li>;
  if (as === 'section') return <motion.section {...motionProps}>{children}</motion.section>;
  if (as === 'span') return <motion.span {...motionProps}>{children}</motion.span>;
  return <motion.div {...motionProps}>{children}</motion.div>;
}
