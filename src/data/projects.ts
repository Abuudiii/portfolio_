import type { SpriteName } from '../lib/sprites';

export type Project = {
  name: string;
  context: string;
  href: string;
  summary: string;
  icon: SpriteName;
};

export const projects: Project[] = [
  {
    name: 'RLHF with GRPO',
    context: 'Qwen2.5-1.5B · Anthropic HH-RLHF',
    href: 'https://huggingface.co/Abuudiii/grpo-Qwen2.5-1.5B-hh-rlhf-combined',
    icon: 'rlhf',
    summary:
      'Fine-tuned Qwen2.5-1.5B with GRPO against helpful and harmless reward models trained on human preferences, raising red-team refusals from 62.5% to 94%.',
  },
  {
    name: 'Exoplanets',
    context: "NASA's TESS satellite data",
    href: 'https://github.com/MikaVohl/exoplanets',
    icon: 'telescope',
    summary:
      'Hunting planets in NASA TESS light curves: masked transit searches and models that rank new candidates.',
  },
  {
    name: 'NeuroNorth',
    context: 'Hack the North 2026',
    href: 'https://devpost.com/software/neuro-north',
    icon: 'neurons',
    summary:
      'Hands-free typing with an EEG headset: flickering targets pick letters and a local model decodes words.',
  },
  {
    name: 'Doom deathmatch agent',
    context: 'Reinforcement learning',
    href: 'https://huggingface.co/Abuudiii/rl_course_vizdoom_deathmatch_bots',
    icon: 'doom',
    summary:
      'An APPO agent that learned Doom deathmatch from raw pixels across 512 parallel games on AMD GPUs.',
  },
];
