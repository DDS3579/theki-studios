// Shared ticker: single rAF loop with prioritized subscribers
// Sleeps when nothing moves, pauses when tab is hidden

type Subscriber = {
  id: string;
  priority: number; // lower = higher priority
  update: (dt: number) => void;
  active: () => boolean;
};

class Ticker {
  private subscribers: Subscriber[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;

  subscribe(sub: Subscriber) {
    this.subscribers.push(sub);
    this.subscribers.sort((a, b) => a.priority - b.priority);
    this.ensureRunning();
    return () => this.unsubscribe(sub.id);
  }

  unsubscribe(id: string) {
    this.subscribers = this.subscribers.filter((s) => s.id !== id);
    if (this.subscribers.every((s) => !s.active())) {
      this.stop();
    }
  }

  private ensureRunning() {
    if (!this.running && this.subscribers.some((s) => s.active())) {
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

    let anyActive = false;
    for (const sub of this.subscribers) {
      if (sub.active()) {
        sub.update(dt);
        anyActive = true;
      }
    }

    if (anyActive) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.rafId = null;
    }
  };

  // Pause when tab is hidden
  handleVisibility = () => {
    if (document.hidden) {
      this.stop();
    } else {
      this.ensureRunning();
    }
  };
}

export const ticker = new Ticker();

// Setup visibility handling
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', ticker.handleVisibility);
}
