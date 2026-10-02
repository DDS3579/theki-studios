// Shared ticker: single rAF loop with prioritized subscribers
// B2.8: wake method, object-keyed subscribers, proper sleep/wake

type Subscriber = {
  update: (dt: number) => void;
  active: () => boolean;
  onError?: (error: Error) => void; // B12.45: Optional error callback
};

class Ticker {
  private subscribers: Map<Subscriber, number> = new Map(); // subscriber → priority
  private sortedSubscribers: Subscriber[] = []; // B12.45: Cached sorted list
  private sortedDirty = false; // B12.45: Flag to re-sort
  private rafId: number | null = null;
  private lastTime = 0;
  private running = false;
  private paused = false;

  // B2.8: subscribe with priority (lower = higher priority)
  subscribe(sub: Subscriber, priority = 0): () => void {
    this.subscribers.set(sub, priority);
    this.sortedDirty = true; // B12.45: Mark sorted list as dirty
    this.ensureRunning();
    return () => this.unsubscribe(sub);
  }

  unsubscribe(sub: Subscriber) {
    this.subscribers.delete(sub);
    this.sortedDirty = true; // B12.45: Mark sorted list as dirty
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

  // B12.45: Expose running state for debug overlay
  isRunning(): boolean {
    return this.running;
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

    // B12.45: Re-sort only when dirty
    if (this.sortedDirty) {
      this.sortedSubscribers = [...this.subscribers.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([sub]) => sub);
      this.sortedDirty = false;
    }
    
    let anyActive = false;
    for (const sub of this.sortedSubscribers) {
      if (sub.active()) {
        try {
          sub.update(dt);
          anyActive = true;
        } catch (err) {
          // B12.45: Catch errors and call optional error callback
          if (sub.onError && err instanceof Error) {
            sub.onError(err);
          } else {
            console.error('Ticker subscriber error:', err);
          }
        }
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
