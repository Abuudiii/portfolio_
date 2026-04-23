import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const links = [
  { to: '/', label: 'Index', index: '01' },
  { to: '/projects', label: 'Projects', index: '02' },
  { to: '/contact', label: 'Contact', index: '03' },
];

export default function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-[6px] bg-bg/70 border-b border-rule/60"
    >
      <div className="mx-auto flex max-w-grid items-center justify-between px-6 py-4 md:px-10">
        <Link
          to="/"
          className="group flex items-baseline gap-2 text-ink"
          aria-label="Home"
        >
          <span className="font-semibold tracking-tight text-lg leading-none">Abdullah Sheikh</span>
        </Link>
        <nav aria-label="Primary">
          <ul className="flex items-center gap-6 sm:gap-8">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) =>
                    `group relative font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                      isActive ? 'text-ember' : 'text-ink-soft hover:text-ink'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="hidden sm:inline text-ink-faint mr-1">{link.index}</span>
                      <span>{link.label}</span>
                      <span
                        className={`absolute -bottom-1 left-0 h-[1.5px] bg-ember transition-all duration-300 ${
                          isActive ? 'w-full' : 'w-0 group-hover:w-full'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </motion.header>
  );
}
