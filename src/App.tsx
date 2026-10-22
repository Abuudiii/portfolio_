import { useEffect, useState } from 'react';
import Orbit from './components/Orbit';
import { experience } from './data/experience';
import { profile } from './data/profile';

const WIDE = '(min-width: 1024px)';

export default function App() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);

  useEffect(() => {
    const mql = window.matchMedia(WIDE);
    const handler = (e: MediaQueryListEvent) => setWide(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return (
    <div className="relative min-h-dvh lg:h-dvh lg:overflow-hidden">
      <Orbit
        layout={wide ? 'side' : 'center'}
        className={wide ? 'fixed inset-0' : 'relative h-[48svh] w-full'}
      />

      <div className="relative z-10 flex flex-col gap-12 px-6 pb-8 sm:px-10 lg:h-full lg:justify-between lg:gap-0 lg:px-14 lg:py-12">
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
              <li key={job.company} className="grid grid-cols-[3.5rem_1fr] gap-x-4 text-[13px] leading-snug">
                <span className="tabular-nums">{job.when}</span>
                <span>
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em]">{job.company}</span>
                  <span className="block">{job.summary}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

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
      </div>
    </div>
  );
}
