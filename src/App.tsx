import { useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Archive from './components/Archive';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { TopLevelErrorBoundary } from './components/ErrorBoundary';
import { start as startSmoothScroll, destroy as destroySmoothScroll } from './lib/smoothScroll';

export default function App() {
  // Initialize smooth scroll on mount
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

        {/* Header */}
        <Header />

        {/* Main content */}
        <main id="main-content" tabIndex={-1}>
          {/* Hero - the first frame */}
          <Hero />

          {/* Work section - will be replaced with new DOM-based gallery in next batch */}
          <section id="work" className="bg-stage min-h-screen flex items-center justify-center">
            <div className="text-center text-stage-text">
              <p className="font-mono text-sm uppercase tracking-widest mb-4">
                Work Section
              </p>
              <p className="font-sans text-base max-w-md mx-auto">
                The new DOM-based scroll gallery will be implemented in the next batch.
              </p>
            </div>
          </section>

          {/* Transition: dark to light — the room brightens */}
          <div className="relative h-32 md:h-48 bg-linear-to-b from-stage to-paper" aria-hidden="true">
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[9px] text-ink-soft/40 uppercase tracking-[0.3em]">
              — Archive —
            </div>
          </div>

          {/* Archive - dense, editorial */}
          <Archive />

          {/* Services - clean index */}
          <Services />

          {/* Contact - the final scene */}
          <Contact />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </TopLevelErrorBoundary>
  );
}
