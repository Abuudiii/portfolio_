import { motion } from 'framer-motion';
import { profile } from '../data/profile';
import { education } from '../data/education';
import { experience, type Experience } from '../data/experience';
import { stack } from '../data/stack';
import BlurIn from '../components/BlurIn';

export default function Home() {
  return (
    <div className="mx-auto max-w-page px-6 md:px-10">
      <Hero />
      <Work />
      <Education />
      <Stack />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pb-14 md:pb-20">
      <div className="relative z-10 pt-4 md:pt-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint"
        >
          <span className="text-ember">●</span>
          <span>01 · index</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-bold tracking-tight text-display-lg leading-[0.95] text-ink"
        >
          {profile.name}
          <span className="text-ember">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-3 text-xl text-ink-soft"
        >
          {profile.title}.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="mt-8 text-ink-soft leading-relaxed text-[17px] max-w-prose"
        >
          {profile.tagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px]"
        >
          <span className="text-ink-soft">
            <span className="text-ember">[ currently ]</span> {profile.currently}
          </span>
          <span className="text-ink-soft">
            <span className="text-ember">[ next ]</span> {profile.next}
          </span>
        </motion.div>
      </div>
    </section>
  );
}

function SectionLabel({ number, label }: { number: string; label: string }) {
  return (
    <BlurIn className="mb-5 mt-10 md:mt-14">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-ember tracking-[0.2em]">
          {number}
        </span>
        <span className="font-semibold text-base text-ink tracking-tight">{label}</span>
        <div className="h-px flex-1 bg-rule ml-2" />
      </div>
    </BlurIn>
  );
}

function Work() {
  return (
    <section>
      <SectionLabel number="02" label="Work" />
      <ul className="divide-y divide-rule/70">
        {experience.map((job, i) => (
          <BlurIn as="li" key={job.company} delay={i * 0.05}>
            <Row job={job} />
          </BlurIn>
        ))}
      </ul>
    </section>
  );
}

function Row({ job }: { job: Experience }) {
  return (
    <div className="flex items-center gap-5 py-5">
      <LogoBadge src={job.logo} alt={job.company} />
      <div className="flex flex-1 flex-col md:flex-row md:items-baseline md:justify-between gap-0.5 min-w-0">
        <div className="min-w-0">
          <div className="font-semibold text-base md:text-lg text-ink tracking-tight">
            {job.company}
          </div>
          <div className="text-sm text-ink-soft">{job.role}</div>
        </div>
        <div className="font-mono text-[11px] text-ink-faint shrink-0 md:text-right">
          {job.dates}
        </div>
      </div>
    </div>
  );
}

function LogoBadge({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="shrink-0 h-14 w-14 object-contain"
    />
  );
}

function Education() {
  return (
    <section>
      <SectionLabel number="03" label="Education" />
      <ul className="divide-y divide-rule/70">
        {education.map((e, i) => (
          <BlurIn as="li" key={e.school} delay={i * 0.05}>
            <div className="flex items-center gap-5 py-5">
              <LogoBadge src={e.logo} alt={e.school} />
              <div className="flex flex-1 flex-col md:flex-row md:items-baseline md:justify-between gap-0.5 min-w-0">
                <div className="min-w-0">
                  <div className="font-semibold text-base md:text-lg text-ink tracking-tight">
                    {e.school}
                  </div>
                  <div className="text-sm text-ink-soft">{e.degree}</div>
                </div>
                <div className="font-mono text-[11px] text-ink-faint shrink-0 md:text-right">
                  {e.dates}
                  <span className="text-ink-faint/50 mx-2">·</span>
                  {e.location}
                </div>
              </div>
            </div>
          </BlurIn>
        ))}
      </ul>
    </section>
  );
}

function Stack() {
  const groups: { label: string; items: readonly string[] }[] = [
    { label: 'Languages & Frameworks', items: stack.languages },
    { label: 'Tools & Platforms', items: stack.tools },
    { label: 'Core Competencies', items: stack.competencies },
  ];

  return (
    <section className="pb-4">
      <SectionLabel number="04" label="Stack" />
      <dl className="divide-y divide-rule/60">
        {groups.map((g, i) => (
          <BlurIn key={g.label} delay={i * 0.05}>
            <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-2 md:gap-8 py-4">
              <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint md:pt-0.5">
                {g.label}
              </dt>
              <dd className="text-[14px] text-ink-soft leading-relaxed">
                {g.items.map((item, j) => (
                  <span key={item}>
                    <span className="text-ink">{item}</span>
                    {j < g.items.length - 1 && (
                      <span className="text-ink-faint/60">, </span>
                    )}
                  </span>
                ))}
              </dd>
            </div>
          </BlurIn>
        ))}
      </dl>
    </section>
  );
}
