import { useEffect, useState, type ReactNode } from 'react';
import PixelIcon from './components/PixelIcon';
import Scene from './components/Scene';
import { experience } from './data/experience';
import { profile } from './data/profile';
import { projects } from './data/projects';
import { BlackHoleScene } from './lib/blackhole';
import type { DitherScene } from './lib/dither';
import { OrbitScene } from './lib/orbit';

const WIDE = '(min-width: 1024px)';

/** One screen: a 1-bit scene on the right (on top for narrow screens), copy on the left. */
function Panel({
  id,
  scene,
  wide,
  children,
}: {
  id?: string;
  scene: new (canvas: HTMLCanvasElement) => DitherScene;
  wide: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="relative lg:h-dvh lg:snap-start lg:overflow-hidden">
      <Scene
        scene={scene}
        layout={wide ? 'side' : 'center'}
        className={wide ? 'absolute inset-0' : 'relative h-[48svh] w-full'}
      />
      <div className="relative z-10 flex flex-col gap-12 px-6 pb-12 sm:px-10 lg:h-full lg:justify-between lg:gap-0 lg:px-14 lg:py-12">
        {children}
      </div>
    </section>
  );
}

export default function App() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);

  useEffect(() => {
    const mql = window.matchMedia(WIDE);
    const handler = (e: MediaQueryListEvent) => setWide(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <main>
      <Panel scene={OrbitScene} wide={wide}>
        <header className="max-w-[30rem]">
          <h1 className="text-sm font-medium uppercase tracking-[0.3em]">{profile.name}</h1>
          <p className="mt-5 text-[13px] leading-relaxed">{profile.tagline}</p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em]">
            {profile.location} <span aria-hidden="true">/</span> {profile.school}
          </p>
        </header>

        <section aria-labelledby="experience" className="max-w-[30rem]">
          <h2 id="experience" className="label mb-4">
            Experience
          </h2>
          <ol className="space-y-3">
            {experience.map((job) => (
              <li key={job.company} className="grid grid-cols-[3rem_auto_1fr] items-center gap-x-4 text-[13px] leading-snug">
                <span className="tabular-nums">{job.when}</span>
                <PixelIcon name={job.icon} />
                <span>
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em]">{job.company}</span>
                  <span className="block">{job.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <a href="#projects" className="label self-start">
          <span className="link">Projects ↓</span>
        </a>
      </Panel>

      <Panel id="projects" scene={BlackHoleScene} wide={wide}>
        <h2 className="text-sm font-medium uppercase tracking-[0.3em]">Projects</h2>

        <ol className="max-w-[30rem] space-y-8">
          {projects.map((project) => (
            <li key={project.name} className="grid grid-cols-[auto_1fr] items-start gap-x-4 text-[13px] leading-relaxed">
              <PixelIcon name={project.icon} />
              <div>
                <a
                  href={project.href}
                  target="_blank"
                  rel="noreferrer"
                  className="link -ml-1 text-[12px] font-medium uppercase tracking-[0.12em]"
                >
                  {project.name} ↗
                </a>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.18em]">{project.context}</span>
                <p className="mt-2">{project.summary}</p>
              </div>
            </li>
          ))}
        </ol>

        <footer className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="label mb-3">Contact</h2>
            <ul className="flex flex-wrap gap-x-1 gap-y-2 text-[13px]">
              <li>
                <a className="link" href={`mailto:${profile.email}`}>
                  {profile.email}
                </a>
              </li>
              {profile.links.map((link) => (
                <li key={link.label}>
                  <a className="link" href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] uppercase tracking-[0.18em]">© {new Date().getFullYear()}</p>
        </footer>
      </Panel>
    </main>
  );
}
