import Header from './components/Header';
import Hero from './components/Hero';
import Stage from './components/Stage';
import WorksStatic from './components/WorksStatic';
import Archive from './components/Archive';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { detectCapabilities } from './lib/gate';

export default function App() {
  const caps = detectCapabilities();

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      {/* Header */}
      <Header />

      {/* Main content */}
      <main id="main-content">
        {/* Hero - the first frame */}
        <Hero />

        {/* Works - stage on desktop, static editorial on mobile */}
        {caps.stageMode ? <Stage /> : <WorksStatic />}

        {/* Transition: dark to light — the room brightens */}
        <div className="relative h-32 md:h-48 bg-gradient-to-b from-stage to-paper" aria-hidden="true">
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
  );
}
