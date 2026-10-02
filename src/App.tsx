import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Stage from './components/Stage';
import WorksStatic from './components/WorksStatic';
import Archive from './components/Archive';
import Services from './components/Services';
import Contact from './components/Contact';
import Footer from './components/Footer';
import { StageErrorBoundary, TopLevelErrorBoundary } from './components/ErrorBoundary';
import { capabilityStore, type Capabilities } from './lib/gate';

export default function App() {
  // B12.41: Subscribe to capability changes
  const [caps, setCaps] = useState<Capabilities>(() => capabilityStore.get());
  
  useEffect(() => {
    return capabilityStore.subscribe(setCaps);
  }, []);
  
  // B12.42: Track if Stage has failed (with expiry in production)
  const [stageFailed, setStageFailed] = useState(() => {
    try {
      const stored = sessionStorage.getItem('theki_stage_failed');
      if (!stored) return false;
      
      // B12.42: In dev, ignore the flag
      if (import.meta.env.DEV) return false;
      
      // B12.42: Check expiry (30 minutes)
      const data = JSON.parse(stored);
      if (Date.now() - data.timestamp > 30 * 60 * 1000) {
        sessionStorage.removeItem('theki_stage_failed');
        return false;
      }
      
      return data.failed === true;
    } catch {
      return false;
    }
  });

  // B12.41: Handle Stage failure - only for real failures, not capability changes
  const handleStageFailure = useCallback(() => {
    setStageFailed(true);
    try {
      // B12.42: Store with timestamp for expiry
      sessionStorage.setItem('theki_stage_failed', JSON.stringify({
        failed: true,
        timestamp: Date.now(),
      }));
    } catch { /* ignore */ }
  }, []);

  // B12.41: Show Stage only if capabilities allow and it hasn't failed
  // B12.43: Hysteresis band around breakpoint
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
        <main id="main-content" tabIndex={-1}>
          {/* Hero - the first frame */}
          <Hero />

          {/* B2.7: Works with error boundary */}
          {/* B12.47: Pass resetKey to allow recovery */}
          <StageErrorBoundary fallback={<WorksStatic />} resetKey={caps.tier}>
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
