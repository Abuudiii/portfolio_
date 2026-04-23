export type Project = {
  slug: string;
  title: string;
  year: string;
  tagline: string;
  description: string;
  stack: string[];
  links: {
    github?: string;
    demo?: string;
    devpost?: string;
    video?: string;
  };
  badge?: string;
};

export const projects: Project[] = [
  {
    slug: 'mlx-vdb',
    title: 'MLX Vector Database',
    year: 'Ongoing',
    tagline: 'GPU-accelerated vector DB for Apple Silicon.',
    description:
      'A vector database written on top of Apple\'s MLX framework that leverages the unified memory architecture on Apple Silicon to skip CPU↔GPU copies entirely. Inserts and nearest-neighbor queries run on the GPU against the same memory pages the host code writes, making retrieval and ingestion meaningfully faster on M-series laptops.',
    stack: ['MLX', 'Python', 'Apple Silicon', 'Unified Memory'],
    links: {
      github: 'https://github.com/Abuudiii/vdb',
    },
    badge: 'In progress',
  },
  {
    slug: 'metal-ray-tracer',
    title: 'Metal Ray Tracing Engine',
    year: 'Jan 2026',
    tagline: 'Real-time path tracer on Apple Silicon.',
    description:
      'Real-time path tracing renderer with 8+ custom GPU compute shaders on Apple Silicon. Hit 60 FPS at 1080p by parallelizing across 3 render passes with 4-bounce lighting, and cut ray-primitive intersection tests by 85% with a BVH acceleration structure.',
    stack: ['C++', 'Metal API', 'MSL', 'Apple Silicon'],
    links: {},
    badge: 'Solo',
  },
  {
    slug: 'opsforge',
    title: 'OpsForge',
    year: 'Sep 2025',
    tagline: 'Natural language to AWS infrastructure.',
    description:
      'AI-powered CLI that turns plain-English prompts into provisioned AWS infrastructure. Uses Groq for intent classification, Perplexity Sonar for live AWS CLI lookups, and an LLM planner to generate and execute infra changes. Shipped in 36 hours at Hack the North.',
    stack: ['Python', 'Node.js', 'Next.js', 'Groq', 'Perplexity', 'AWS'],
    links: {
      github: 'https://github.com/Abuudiii/OpsForge',
      devpost: 'https://devpost.com/software/opsforge-0nv3k9',
    },
    badge: 'Hack the North · 25',
  },
  {
    slug: 'civicpulse',
    title: 'CivicPulse',
    year: 'Nov 2025',
    tagline: 'Gamified civic engagement for sustainable cities.',
    description:
      'Civic engagement platform that gamifies sustainable transportation and community reporting. Citizens earn points for biking, walking, and reporting issues; admins get AI-powered issue clustering and auto-generated challenges. Built in a weekend at Hack the Change.',
    stack: ['TypeScript', 'React', 'Fastify', 'PostgreSQL', 'Prisma', 'OpenAI'],
    links: {
      github: 'https://github.com/Abuudiii/CivicPulse',
      devpost: 'https://devpost.com/software/civicpulse-r2snj4',
    },
    badge: 'Hack the Change · 25',
  },
  {
    slug: 'portobeats',
    title: 'PortoBeats',
    year: '2024',
    tagline: 'A wearable drumpad glove.',
    description:
      'Portable drumpad glove that maps instruments to individual fingers for live beat production. Force-sensing resistors feed pressure data into an Arduino, which emits MIDI over USB with configurable sensitivity per finger.',
    stack: ['Arduino', 'C', 'MIDI', 'FSR Sensors'],
    links: {
      video: './projects/portobeats.mov',
    },
  },
  {
    slug: 'pulselink',
    title: 'PulseLink',
    year: '2024',
    tagline: 'Wireless wearable feedback bracelets.',
    description:
      'A pair of 3D-printed bracelets that communicate over ESP-NOW for silent, wireless haptic feedback. Pressure on one bracelet triggers a buzzer on the other. Designed for accessibility and low-power wearables.',
    stack: ['ESP32', 'C', 'ESP-NOW', 'Fusion 360'],
    links: {
      video: './projects/pulselink.mov',
    },
  },
];
