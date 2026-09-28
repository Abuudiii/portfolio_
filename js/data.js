export const profile = {
  name: 'Abdullah Sheikh',
  title: 'Software Engineer',
  tagline:
    'I like working close to the metal: GPU kernels, drivers, and the infrastructure that keeps platforms upright when things go wrong.',
  currently: 'Software Engineering Intern @ AMD',
  email: 'sheikh04abdullah@gmail.com',
  github: 'Abuudiii',
  githubUrl: 'https://github.com/Abuudiii',
  linkedin: 'abdullah-tar-gz',
  linkedinUrl: 'https://www.linkedin.com/in/abdullah-tar-gz/',
  x: 'Abuudiii7',
  xUrl: 'https://x.com/Abuudiii7',
  resumeUrl: './resume.pdf',
};

export const stack = {
  languages: [
    'Python',
    'C',
    'C++',
    'Go',
    'Java',
    'JavaScript',
    'Bash',
    'SQL',
    'Ruby',
    'CUDA',
    'HIP',
  ],
  tools: ['Git', 'GitLab', 'Jenkins', 'Prometheus', 'Grafana', 'Linux', 'React'],
  competencies: [
    'GPU Programming',
    'Parallel Computing',
    'Debugging',
    'System Design',
    'Communication',
  ],
};

export const projects = [
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
    links: {},
    video: './assets/projects/portobeats.mov',
  },
  {
    slug: 'pulselink',
    title: 'PulseLink',
    year: '2024',
    tagline: 'Wireless wearable feedback bracelets.',
    description:
      'A pair of 3D-printed bracelets that communicate over ESP-NOW for silent, wireless haptic feedback. Pressure on one bracelet triggers a buzzer on the other. Designed for accessibility and low-power wearables.',
    stack: ['ESP32', 'C', 'ESP-NOW', 'Fusion 360'],
    links: {},
    video: './assets/projects/pulselink.mov',
  },
];

export const intro = { center: [-100, 48], zoom: 1.7, pitch: 0, bearing: 0 };
export const outro = { center: [-95, 45], zoom: 2.2, pitch: 0, bearing: 0 };

export const stops = [
  {
    id: 'ucalgary',
    kind: 'education',
    org: 'University of Calgary',
    role: 'BSc, Computer Science',
    dates: 'Expected June 2028',
    city: 'Calgary, AB',
    logo: './assets/logos/ucalgary.png',
    center: [-114.13881, 51.07505],
    zoom: 15.4,
    pitch: 55,
    bearing: 30,
    bullets: ['Home base: studying computer science while interning across Canada.'],
  },
  {
    id: 'enverus',
    kind: 'work',
    org: 'Enverus',
    role: 'Site Reliability Engineer Intern',
    dates: 'May – Aug 2025',
    city: 'Calgary, AB',
    logo: './assets/logos/enverus.png',
    center: [-114.07339, 51.04547],
    zoom: 15.4,
    pitch: 62,
    bearing: -20,
    bullets: [
      'Cut $200K+ in annual costs by architecting AWS PrivateLink and VPC Endpoints across 350+ VPCs.',
      'Built 15+ isolated AWS sandboxes, enabling org-wide teams to safely test cloud features pre-prod.',
    ],
  },
  {
    id: 'qnx',
    kind: 'work',
    org: 'BlackBerry QNX',
    role: 'Systems Software Engineering Intern',
    dates: 'Sep – Dec 2025',
    city: 'Ottawa, ON',
    logo: './assets/logos/blackberry.png',
    center: [-75.90978, 45.34368],
    zoom: 15.8,
    pitch: 60,
    bearing: 40,
    bullets: [
      'Developed 5+ C/C++ drivers for ADAS sensors, adding hardware peripheral support to the QNX RTOS.',
      'Designed interrupt-driven GPIO handling for ARM systems, enabling low-latency I/O across 8+ devices.',
      'Optimized a GPU-accelerated blit library in C++, achieving 3x throughput for sensor data processing.',
    ],
  },
  {
    id: 'shopify',
    kind: 'work',
    org: 'Shopify',
    role: 'Platform SRE Intern',
    dates: 'Jan – Apr 2026',
    city: 'Toronto, ON',
    logo: './assets/logos/shopify.png',
    center: [-79.40089, 43.64482],
    zoom: 15.5,
    pitch: 62,
    bearing: -35,
    bullets: [
      "Improved Semian's adaptive circuit breaker CPU performance by 20% by optimizing the PID controller hot path, protecting 93+ production integration points.",
      'Spearheaded Chaos Engineering tooling integration into the internal hub, enabling 100+ teams to run gameday tests.',
      'Shadowed IMOC on 5+ incidents impacting millions of merchants; built an incident-monitor skill adopted org-wide.',
    ],
  },
  {
    id: 'amd',
    kind: 'work',
    org: 'AMD',
    role: 'Software Engineering Intern · AGS Libraries',
    dates: 'May 2026 – Present',
    city: 'Calgary, AB',
    logo: './assets/logos/amd.png',
    center: [-114.07174, 51.04976],
    zoom: 15.5,
    pitch: 62,
    bearing: 15,
    current: true,
    bullets: ['Building GPU compute libraries in HIP and C++ on the AGS Libraries team.'],
  },
];
