import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Nav from './components/Nav';
import Footer from './components/Footer';
import CursorDot from './components/CursorDot';

export default function App() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <CursorDot />
      <Nav />
      <main className="relative z-10 pt-24 md:pt-28">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
