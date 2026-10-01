// Capability gate: determines rendering mode
// B2.1-B2.6: Proper tier logic, subscribable store, real device signals

export type RenderTier = 'A0' | 'A1' | 'A2' | 'static';

export interface Capabilities {
  stageMode: boolean;
  webgl2: boolean;
  tier: RenderTier;
  reducedMotion: boolean;
  coarsePointer: boolean;
  saveData: boolean;
  dpr: number;
  // B2.1: quality settings per tier
  maxPlanes: number;
  enableBlur: boolean;
}

// B2.3: subscribable capability store
type Subscriber = (caps: Capabilities) => void;

class CapabilityStore {
  private caps: Capabilities | null = null;
  private subscribers: Set<Subscriber> = new Set();
  private resizeTimeout: number | null = null;
  private reducedMotionQuery: MediaQueryList | null = null;
  private pointerQuery: MediaQueryList | null = null;
  private hoverQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.setupListeners();
    }
  }

  private setupListeners() {
    // B2.3: debounced resize listener
    window.addEventListener('resize', () => {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = window.setTimeout(() => {
        this.reevaluate();
      }, 200);
    });

    // B2.3: media query change listeners
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery.addEventListener('change', () => this.reevaluate());

    this.pointerQuery = window.matchMedia('(pointer: coarse)');
    this.pointerQuery.addEventListener('change', () => this.reevaluate());

    // B2.6: hover capability
    this.hoverQuery = window.matchMedia('(hover: hover)');
    this.hoverQuery.addEventListener('change', () => this.reevaluate());
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
    
    // B2.3: hysteresis - only notify if meaningful change
    if (!oldCaps || 
        oldCaps.stageMode !== this.caps.stageMode ||
        oldCaps.tier !== this.caps.tier ||
        oldCaps.reducedMotion !== this.caps.reducedMotion) {
      this.notify();
    }
  }

  private detect(): Capabilities {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    // B2.6: also require hover capability for desktop
    const hasHover = window.matchMedia('(hover: hover)').matches;
    const isDesktop = window.innerWidth >= 1024 && hasHover;
    const saveData = (navigator as any).connection?.saveData === true;

    // B2.5: check sessionStorage first
    let webgl2 = false;
    try {
      const stored = sessionStorage.getItem('theki_webgl2');
      if (stored !== null) {
        webgl2 = stored === 'true';
      } else {
        // B2.5: use offscreen canvas if available
        const canvas = typeof OffscreenCanvas !== 'undefined' 
          ? new OffscreenCanvas(1, 1) 
          : document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        webgl2 = !!gl;
        sessionStorage.setItem('theki_webgl2', String(webgl2));
      }
    } catch {
      webgl2 = false;
    }

    const cores = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // B2.1: determine tier from real signals
    const stageMode = isDesktop && !coarsePointer && !reducedMotion && webgl2 && !saveData;

    let tier: RenderTier = 'static';
    let maxPlanes = 10;
    let enableBlur = true;
    let tierDpr = dpr;

    if (stageMode) {
      // B2.1: check GPU renderer string
      let isIntegratedGPU = false;
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            isIntegratedGPU = /intel|mesa|llvmpipe/i.test(renderer);
          }
        }
      } catch { /* ignore */ }

      // B2.1: tier assignment
      if (cores >= 8 && deviceMemory >= 8 && dpr <= 1.5 && !isIntegratedGPU) {
        tier = 'A0';
        maxPlanes = 10;
        enableBlur = true;
        tierDpr = Math.min(dpr, 1.5);
      } else if (cores >= 4 && deviceMemory >= 4 && dpr <= 2) {
        tier = 'A1';
        maxPlanes = 7;
        enableBlur = true;
        tierDpr = Math.min(dpr, 1.25);
      } else {
        tier = 'A2';
        maxPlanes = 5;
        enableBlur = false;
        tierDpr = 1;
      }
    }

    return {
      stageMode,
      webgl2,
      tier,
      reducedMotion,
      coarsePointer,
      saveData,
      dpr: tierDpr,
      maxPlanes,
      enableBlur,
    };
  }
}

export const capabilityStore = new CapabilityStore();

// Convenience function for backwards compatibility
export function detectCapabilities(): Capabilities {
  return capabilityStore.get();
}

// B2.2: Runtime ladder - steps quality down based on frame times
export class RuntimeLadder {
  private frameTimes: number[] = [];
  private currentTier: RenderTier;
  private onDowngrade: (tier: RenderTier) => void;
  private frameCount = 0;
  private lastHiddenTime = 0;

  constructor(initialTier: RenderTier, onDowngrade: (tier: RenderTier) => void) {
    this.currentTier = initialTier;
    this.onDowngrade = onDowngrade;

    // Track when tab is hidden
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.lastHiddenTime = performance.now();
        }
      });
    }
  }

  recordFrame(dt: number) {
    this.frameCount++;

    // B2.2: ignore first 60 frames (warmup)
    if (this.frameCount < 60) return;

    // B2.2: ignore frames right after tab was hidden
    const timeSinceHidden = performance.now() - this.lastHiddenTime;
    if (timeSinceHidden < 2000) return;

    this.frameTimes.push(dt);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    // B2.2: hysteresis - need sustained poor performance
    if (this.frameTimes.length >= 30) {
      const sorted = [...this.frameTimes].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      
      // B2.2: threshold at 20ms (50fps)
      if (p75 > 20) {
        this.stepDown();
      }
    }
  }

  private stepDown() {
    const order: RenderTier[] = ['A0', 'A1', 'A2', 'static'];
    const idx = order.indexOf(this.currentTier);
    
    // B2.2: never step back up
    if (idx < order.length - 1) {
      this.currentTier = order[idx + 1];
      this.frameTimes = []; // reset after downgrade
      this.onDowngrade(this.currentTier);
    }
  }

  getTier(): RenderTier {
    return this.currentTier;
  }
}
