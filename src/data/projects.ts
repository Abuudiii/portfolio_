export type CodeSnippet = {
  filename: string;
  lang: string;
  body: string;
};

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
  };
  media?: {
    video?: string;
    code?: CodeSnippet[];
  };
  badge?: string;
};

const portobeatsSketch = `#include <MIDIUSB.h>

// FSR analog inputs — one per finger
const uint8_t FINGERS[5] = { A0, A1, A2, A3, A4 };

// General MIDI drum map: kick, snare, closed hat, open hat, crash
const uint8_t NOTES[5]   = { 36, 38, 42, 46, 49 };

// Per-finger sensitivity: baseline threshold + velocity curve
const uint16_t THRESHOLD = 120;
const uint16_t CEILING   = 900;

bool active[5] = { false };

void noteOn(uint8_t note, uint8_t velocity) {
  midiEventPacket_t e = { 0x09, 0x90, note, velocity };
  MidiUSB.sendMIDI(e);
}

void noteOff(uint8_t note) {
  midiEventPacket_t e = { 0x08, 0x80, note, 0 };
  MidiUSB.sendMIDI(e);
}

void setup() {
  for (uint8_t i = 0; i < 5; i++) pinMode(FINGERS[i], INPUT);
}

void loop() {
  for (uint8_t i = 0; i < 5; i++) {
    uint16_t p = analogRead(FINGERS[i]);

    if (!active[i] && p > THRESHOLD) {
      uint8_t velocity = map(min(p, CEILING), THRESHOLD, CEILING, 40, 127);
      noteOn(NOTES[i], velocity);
      active[i] = true;
    } else if (active[i] && p < THRESHOLD / 2) {
      noteOff(NOTES[i]);
      active[i] = false;
    }
  }

  MidiUSB.flush();
  delay(2);
}
`;

const pulselinkSketch = `#include <WiFi.h>
#include <esp_now.h>

// MAC address of the paired bracelet
uint8_t peer[] = { 0xA4, 0xCF, 0x12, 0x34, 0x56, 0x78 };

const uint8_t FSR_PIN    = 34;
const uint8_t BUZZER_PIN = 25;
const uint16_t TRIGGER   = 1200;

typedef struct {
  uint8_t intensity;  // 0 – 255
} Pulse;

void onReceive(const uint8_t* mac, const uint8_t* data, int len) {
  Pulse p;
  memcpy(&p, data, sizeof(p));
  analogWrite(BUZZER_PIN, p.intensity);
  delay(80);
  analogWrite(BUZZER_PIN, 0);
}

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  WiFi.mode(WIFI_STA);
  esp_now_init();

  esp_now_peer_info_t info = {};
  memcpy(info.peer_addr, peer, 6);
  info.channel = 0;
  info.encrypt = false;
  esp_now_add_peer(&info);

  esp_now_register_recv_cb(onReceive);
}

void loop() {
  uint16_t r = analogRead(FSR_PIN);
  if (r > TRIGGER) {
    Pulse p = { (uint8_t)map(r, TRIGGER, 4095, 40, 255) };
    esp_now_send(peer, (uint8_t*)&p, sizeof(p));
    delay(150);
  }
}
`;

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
      demo: '#/p/portobeats',
    },
    media: {
      video: './projects/portobeats.mov',
      code: [
        { filename: 'portobeats.ino', lang: 'cpp', body: portobeatsSketch },
      ],
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
      demo: '#/p/pulselink',
    },
    media: {
      video: './projects/pulselink.mov',
      code: [
        { filename: 'pulselink.ino', lang: 'cpp', body: pulselinkSketch },
      ],
    },
  },
];
