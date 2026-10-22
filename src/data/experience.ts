import type { SpriteName } from '../lib/sprites';

export type Experience = {
  company: string;
  when: string;
  summary: string;
  icon: SpriteName;
};

/** Current role first, past roles newest to oldest, incoming last. */
export const experience: Experience[] = [
  { company: 'AMD', when: 'Now', summary: 'GPU compute kernels for ROCm on Instinct GPUs.', icon: 'gpu' },
  { company: 'Shopify', when: '2026', summary: 'Performance and resilience tooling for infra.', icon: 'bag' },
  { company: 'BlackBerry QNX', when: '2025', summary: 'Drivers and interrupt-driven I/O on QNX.', icon: 'chip' },
  { company: 'Enverus', when: '2025', summary: 'AWS network infrastructure across 350+ VPCs.', icon: 'network' },
  { company: 'Dominion Dynamics', when: '2027', summary: 'Incoming. Autonomy systems for Arctic defence.', icon: 'rover' },
];
