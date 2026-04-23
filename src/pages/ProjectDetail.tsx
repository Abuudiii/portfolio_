import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { projects } from '../data/projects';

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find((p) => p.slug === slug);

  useEffect(() => {
    if (project) document.title = `${project.title} — Abdullah Sheikh`;
    return () => {
      document.title = 'Abdullah Sheikh';
    };
  }, [project]);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-ink font-mono text-sm">
        <div className="text-center">
          <p className="text-ink-faint">no project at that slug.</p>
          <Link to="/projects" className="mt-4 inline-block text-ember hover:underline">
            ← back to projects
          </Link>
        </div>
      </div>
    );
  }

  const video = project.media?.video;
  const codes = project.media?.code ?? [];

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-[1080px] px-6 md:px-10 py-10 md:py-14">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint"
        >
          <Link
            to="/projects"
            className="hover:text-ember transition-colors"
          >
            ← index
          </Link>
          <span>
            <span className="text-ember">●</span> {project.year}
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 font-bold tracking-tight text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.98]"
        >
          {project.title}
          <span className="text-ember">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-4 text-lg text-ink-soft"
        >
          {project.tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-4 text-[15px] text-ink-soft leading-relaxed max-w-prose"
        >
          {project.description}
        </motion.p>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-6 flex flex-wrap gap-x-4 gap-y-2 font-mono text-[11px] text-ink-faint"
        >
          {project.stack.map((s) => (
            <li key={s}>
              <span className="text-ink-soft">{s}</span>
            </li>
          ))}
        </motion.ul>

        {video && (
          <motion.figure
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 md:mt-16"
          >
            <div className="border border-rule/70 bg-bg-soft overflow-hidden rounded-sm">
              <video
                src={video}
                controls
                playsInline
                preload="metadata"
                controlsList="nodownload noplaybackrate"
                onContextMenu={(e) => e.preventDefault()}
                disablePictureInPicture
                className="w-full h-auto block"
              />
            </div>
            <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint">
              ▸ demo · {project.title}
            </figcaption>
          </motion.figure>
        )}

        {codes.length > 0 && (
          <section className="mt-14 md:mt-20">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-ember tracking-[0.2em]">
                //
              </span>
              <span className="font-semibold text-base text-ink tracking-tight">
                Source
              </span>
              <div className="h-px flex-1 bg-rule ml-2" />
            </div>

            {codes.map((snippet) => (
              <motion.div
                key={snippet.filename}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6 }}
                className="mt-6 border border-rule/70 rounded-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2.5 bg-bg-soft border-b border-rule/70">
                  <span className="font-mono text-[11px] text-ink-soft">
                    {snippet.filename}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
                    {snippet.lang}
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-5 text-[12.5px] leading-[1.7] font-mono text-ink bg-bg">
                  <code>{snippet.body}</code>
                </pre>
              </motion.div>
            ))}
          </section>
        )}

        <div className="mt-20 pt-8 border-t border-rule/60 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          <Link to="/projects" className="hover:text-ember transition-colors">
            ← all projects
          </Link>
          <Link to="/" className="hover:text-ember transition-colors">
            abdullah sheikh ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
