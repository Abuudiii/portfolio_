export type Experience = {
  company: string;
  when: string;
  summary: string;
};

export const experience: Experience[] = [
  { company: 'Dominion Dynamics', when: '2027', summary: 'Incoming. Autonomy systems for Arctic defence.' },
  { company: 'AMD', when: 'Now', summary: 'GPU compute kernels for ROCm on Instinct GPUs.' },
  { company: 'Shopify', when: '2026', summary: 'Performance and resilience tooling for core infra.' },
  { company: 'BlackBerry QNX', when: '2025', summary: 'Drivers and interrupt-driven I/O on the QNX RTOS.' },
  { company: 'Enverus', when: '2025', summary: 'AWS network infrastructure across 350+ VPCs.' },
];
