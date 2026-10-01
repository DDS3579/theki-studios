import { useState, useCallback } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Stage from './components/Stage';
import WorksStatic from './components/WorksStatic';
import Archive from './components/Archive';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { StageErrorBoundary, TopLevelErrorBoundary } from './components/ErrorBoundary';
import { detectCapabilities } from './lib/gate';

export default function App() {
  const caps = detectCapabilities();
  
  // B2.4: track if Stage has failed (remember for session)
  const [stageFailed, setStageFailed] = useState(() => {
    try {
      return sessionStorage.getItem('theki_stage_failed') === 'true';
    } catch {
      return false;
    }
  });

  // B2.4: handle Stage failure
  const handleStageFailure = useCallback(() => {
    setStageFailed(true);
    try {
      sessionStorage.setItem('theki_stage_failed', 'true');
    } catch { /* ignore */ }
  }, []);

  // B2.3: show Stage only if capabilities allow and it hasn't failed
  const showStage = caps.stageMode && !stageFailed;

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
        <main id="main-content">
          {/* Hero - the first frame */}
          <Hero />

          {/* B2.7: Works with error boundary */}
          <StageErrorBoundary fallback={<WorksStatic />}>
            {showStage ? (
              <Stage onFailure={handleStageFailure} />
            ) : (
              <WorksStatic />
            )}
          </StageErrorBoundary>

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
