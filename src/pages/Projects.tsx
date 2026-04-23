import { motion } from 'framer-motion';
import { projects, type Project } from '../data/projects';
import BlurIn from '../components/BlurIn';
import { profile } from '../data/profile';

export default function Projects() {
  return (
    <div className="mx-auto max-w-grid px-6 md:px-10 pb-section">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint"
      >
        <span className="text-ember">●</span>
        <span>02 · projects</span>
        <span className="text-ink-faint/60">/</span>
        <span>selected · 2024 – 2026</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-6 font-bold tracking-tight text-display-lg leading-none text-ink"
      >
        Things I've <span className="text-ember-soft">built</span>.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="mt-8 max-w-prose text-ink-soft text-lg leading-relaxed"
      >
        Some are hardware, some are software, some are both. A rotating selection of
        what I'm proudest of right now, ordered roughly by recency.
      </motion.p>

      <div className="mt-section grid gap-px bg-rule/60 border-y border-rule/60">
        {projects.map((p, i) => (
          <BlurIn key={p.slug} delay={i * 0.05}>
            <ProjectRow project={p} index={String(i + 1).padStart(2, '0')} />
          </BlurIn>
        ))}
      </div>

      <BlurIn>
        <div className="mt-14 text-center font-mono text-xs text-ink-soft">
          more on{' '}
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ember hover:underline"
          >
            github ↗
          </a>
        </div>
      </BlurIn>
    </div>
  );
}

function ProjectRow({ project, index }: { project: Project; index: string }) {
  const linkEntries = Object.entries(project.links).filter(([, v]) => v);

  return (
    <article className="group relative bg-bg hover:bg-bg-soft transition-colors duration-500">
      <div className="grid grid-cols-1 md:grid-cols-[90px_minmax(0,1fr)_minmax(0,280px)] gap-6 md:gap-10 px-4 md:px-8 py-10 md:py-12">
        {/* Index + year */}
        <div className="flex md:flex-col md:justify-between items-baseline md:items-start gap-3">
          <span className="font-mono text-xs text-ember">{index}</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-faint">
            {project.year}
          </span>
        </div>

        {/* Title + description */}
        <div>
          <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1">
            <h2 className="font-bold tracking-tight text-2xl md:text-3xl text-ink leading-tight">
              {project.title}
            </h2>
            {project.badge && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-ember border border-ember/40 px-2 py-0.5 rounded-sm">
                {project.badge}
              </span>
            )}
          </div>
          <p className="mt-2 text-base text-ink-soft">
            {project.tagline}
          </p>
          <p className="mt-5 text-[15px] text-ink-soft leading-relaxed max-w-prose">
            {project.description}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-ink-faint">
            {project.stack.map((s) => (
              <li key={s}>
                <span className="text-ink-soft">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Links column */}
        <div className="flex md:flex-col md:items-end gap-4">
          {linkEntries.length === 0 && (
            <span className="font-mono text-[11px] text-ink-faint">private</span>
          )}
          {linkEntries.map(([key, url]) => (
            <a
              key={key}
              href={url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft hover:text-ember transition-colors"
            >
              <span className="underline-offset-4 group-hover/link:underline">
                {key}
              </span>
              <span className="ml-1.5">↗</span>
            </a>
          ))}
        </div>
      </div>

      {/* animated bottom accent on hover */}
      <span className="pointer-events-none absolute bottom-0 left-0 h-px w-0 bg-ember transition-all duration-500 group-hover:w-full" />
    </article>
  );
}
