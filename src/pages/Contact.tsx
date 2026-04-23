import { motion } from 'framer-motion';
import { profile } from '../data/profile';
import BlurIn from '../components/BlurIn';

type Row = {
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

export default function Contact() {
  const rows: Row[] = [
    { label: 'email', value: profile.email, href: `mailto:${profile.email}` },
    { label: 'github', value: `@${profile.github}`, href: profile.githubUrl, external: true },
    { label: 'linkedin', value: `/in/${profile.linkedin}`, href: profile.linkedinUrl, external: true },
    { label: 'x', value: `@${profile.x}`, href: profile.xUrl, external: true },
    { label: 'resume', value: 'abdullah-sheikh.pdf', href: profile.resumeUrl, external: true },
  ];

  return (
    <div className="mx-auto max-w-page px-6 md:px-10 pb-section">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint"
      >
        <span className="text-ember">●</span>
        <span>03 · contact</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 font-bold tracking-tight text-display-lg leading-[0.95] text-ink"
      >
        Say hello
        <span className="text-ember">.</span>
      </motion.h1>

      <ul className="mt-14 divide-y divide-rule/50">
        {rows.map((row, i) => (
          <BlurIn as="li" key={row.label} delay={i * 0.06}>
            <a
              href={row.href}
              target={row.external ? '_blank' : undefined}
              rel={row.external ? 'noopener noreferrer' : undefined}
              className="group flex items-baseline justify-between gap-6 py-5"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint group-hover:text-ember transition-colors">
                {row.label}
              </span>
              <span className="font-medium text-base md:text-lg text-ink-soft group-hover:text-ink transition-colors tracking-tight truncate">
                {row.value}
              </span>
            </a>
          </BlurIn>
        ))}
      </ul>
    </div>
  );
}
