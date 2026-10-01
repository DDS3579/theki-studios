// Shared ticker: single rAF loop with prioritized subscribers
// B2.8: wake method, object-keyed subscribers, proper sleep/wake

type Subscriber = {
  update: (dt: number) => void;
  active: () => boolean;
};

class Ticker {
  private subscribers: Map<Subscriber, number> = new Map(); // subscriber → priority
  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;
  private paused = false;

  // B2.8: subscribe with priority (lower = higher priority)
  subscribe(sub: Subscriber, priority = 0): () => void {
    this.subscribers.set(sub, priority);
    this.ensureRunning();
    return () => this.unsubscribe(sub);
  }

  unsubscribe(sub: Subscriber) {
    this.subscribers.delete(sub);
    if (!this.hasActiveSubscribers()) {
      this.stop();
    }
  }

  // B2.8: wake method for handlers to call
  wake() {
    if (!this.running && !this.paused) {
      this.start();
    }
  }

  pause() {
    this.paused = true;
    this.stop();
  }

  resume() {
    this.paused = false;
    if (this.hasActiveSubscribers()) {
      this.start();
    }
  }

  private hasActiveSubscribers(): boolean {
    for (const [sub] of this.subscribers) {
      if (sub.active()) return true;
    }
    return false;
  }

  private ensureRunning() {
    if (!this.running && !this.paused && this.hasActiveSubscribers()) {
      this.start();
    }
  }

  private start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }

  private stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = () => {
    if (!this.running) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // cap at 100ms
    this.lastTime = now;

    // Sort by priority
    const sorted = [...this.subscribers.entries()].sort((a, b) => a[1] - b[1]);
    
    let anyActive = false;
    for (const [sub] of sorted) {
      if (sub.active()) {
        sub.update(dt);
        anyActive = true;
      }
    }

    if (anyActive) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      // B2.8: sleep when nothing is moving
      this.running = false;
      this.rafId = null;
    }
  };

  // Pause when tab is hidden
  handleVisibility = () => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };
}

export const ticker = new Ticker();

// Setup visibility handling
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', ticker.handleVisibility);
}
