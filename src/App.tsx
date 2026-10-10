import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Wall from './components/Wall';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { TopLevelErrorBoundary } from './components/ErrorBoundary';
import { start as startSmoothScroll, destroy as destroySmoothScroll } from './lib/smoothScroll';

export default function App() {
  // Smooth scrolling for the whole page
  useEffect(() => {
    startSmoothScroll();
    return () => {
      destroySmoothScroll();
    };
  }, []);

  return (
    <TopLevelErrorBoundary>
      <div id="top" className="min-h-screen bg-paper text-ink">
        {/* Skip link */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <Header />

        <main id="main-content" tabIndex={-1}>
          {/* The hero stays pinned while the wall slides up over it */}
          <Hero />
          <Wall />
          <Services />
          <Contact />
        </main>

        <Footer />
      </div>
    </TopLevelErrorBoundary>
  );
}
