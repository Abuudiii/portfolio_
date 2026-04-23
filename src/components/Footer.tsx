import { profile } from '../data/profile';
import Rule from './Rule';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto max-w-grid px-6 md:px-10 pt-16 pb-10 mt-section">
      <Rule className="mb-8" />
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-baseline justify-between">
        <div className="font-mono text-xs text-ink-faint">
          <span className="text-ember">●</span> open to chats
        </div>
        <div className="flex flex-wrap gap-5 font-mono text-xs">
          <a
            href={`mailto:${profile.email}`}
            className="text-ink-soft hover:text-ember transition-colors"
          >
            email ↗
          </a>
          <a
            href={profile.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:text-ember transition-colors"
          >
            github ↗
          </a>
          <a
            href={profile.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:text-ember transition-colors"
          >
            linkedin ↗
          </a>
          <a
            href={profile.resumeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft hover:text-ember transition-colors"
          >
            resume ↗
          </a>
        </div>
        <div className="font-mono text-[10px] text-ink-faint tracking-widest uppercase">
          © {year} · Abdullah Sheikh
        </div>
      </div>
    </footer>
  );
}
