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
    name: 'Exoplanets',
    context: 'with Mika Vohl',
    href: 'https://github.com/MikaVohl/exoplanets',
    icon: 'telescope',
    summary:
      'Hunting planets in NASA TESS light curves: masked transit searches, a labelled dataset built from NASA verdicts, and models that rank new candidates.',
  },
  {
    name: 'NeuroNorth',
    context: 'Hack the North 2026',
    href: 'https://devpost.com/software/neuro-north',
    icon: 'neurons',
    summary:
      'Hands-free typing with a non-invasive EEG headset. Flickering targets pick letter ranges, a local model decodes the words, head gestures navigate, and AI agents act on the result.',
  },
];
