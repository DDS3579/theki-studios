import { useSyncExternalStore } from 'react';

// Simplified capability detection
// Only tracks reduced motion and data saver preferences

export interface Capabilities {
  reducedMotion: boolean;
  saveData: boolean;
}

type Subscriber = (caps: Capabilities) => void;

class CapabilityStore {
  private caps: Capabilities | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private reducedMotionQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners();
    }
  }

  private setupListeners() {
    // Listen for reduced motion preference changes
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery.addEventListener('change', () => this.reevaluate());
  }

  get(): Capabilities {
    if (!this.caps) {
      this.caps = this.detect();
    }
    return this.caps;
  }

  subscribe(sub: Subscriber): () => void {
    this.subscribers.add(sub);
    return () => this.subscribers.delete(sub);
  }

  private notify() {
    if (!this.caps) return;
    for (const sub of this.subscribers) {
      sub(this.caps);
    }
  }

  private reevaluate() {
    const oldCaps = this.caps;
    this.caps = this.detect();
    
    // Only notify if reduced motion preference changed
    if (!oldCaps || oldCaps.reducedMotion !== this.caps.reducedMotion) {
      this.notify();
    }
  }

  private detect(): Capabilities {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const saveData = (navigator as any).connection?.saveData === true;

    return {
      reducedMotion,
      saveData,
    };
  }
}

export const capabilityStore = new CapabilityStore();

// React hook: re-renders if the visitor changes the reduced-motion setting while the page is open
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => capabilityStore.subscribe(() => onChange()),
    () => capabilityStore.get().reducedMotion,
    () => false
  );
}

// Convenience function for backwards compatibility
export function detectCapabilities(): Capabilities {
  return capabilityStore.get();
}
