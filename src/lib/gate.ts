// Capability gate: determines rendering mode
// Stage mode: desktop, fine pointer, no reduced motion, WebGL2, sufficient cores

export type RenderTier = 'A0' | 'A1' | 'A2' | 'static';

export interface Capabilities {
  stageMode: boolean;
  webgl2: boolean;
  tier: RenderTier;
  reducedMotion: boolean;
  coarsePointer: boolean;
  saveData: boolean;
  dpr: number;
}

let cached: Capabilities | null = null;

export function detectCapabilities(): Capabilities {
  if (cached) return cached;

  const reducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = typeof window !== 'undefined' && 
    window.matchMedia('(pointer: coarse)').matches;
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  const saveData = typeof navigator !== 'undefined' && 
    (navigator as any).connection?.saveData === true;

  let webgl2 = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    webgl2 = !!gl;
    if (gl) {
      const ext = gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
  } catch {
    webgl2 = false;
  }

  // Cache WebGL2 probe in sessionStorage
  if (typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('theki_webgl2', String(webgl2));
    } catch { /* ignore */ }
  }

  const cores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

  const stageMode = isDesktop && !coarsePointer && !reducedMotion && webgl2 && !saveData && cores >= 4;

  let tier: RenderTier = 'static';
  if (stageMode) {
    if (dpr <= 2) tier = 'A0';
    else if (dpr <= 1.5) tier = 'A1';
    else tier = 'A2';
  }

  cached = { stageMode, webgl2, tier, reducedMotion, coarsePointer, saveData, dpr };
  return cached;
}

// Runtime ladder: step down if frame times are too high
class RuntimeLadder {
  private frameTimes: number[] = [];
  private currentTier: RenderTier;
  private onDowngrade: (tier: RenderTier) => void;

  constructor(initialTier: RenderTier, onDowngrade: (tier: RenderTier) => void) {
    this.currentTier = initialTier;
    this.onDowngrade = onDowngrade;
  }

  recordFrame(dt: number) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 30) {
      this.frameTimes.shift();
    }

    if (this.frameTimes.length >= 30) {
      const sorted = [...this.frameTimes].sort((a, b) => a - b);
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      
      if (p75 > 20) { // Above 20ms = below 50fps
        this.stepDown();
      }
    }
  }

  private stepDown() {
    const order: RenderTier[] = ['A0', 'A1', 'A2', 'static'];
    const idx = order.indexOf(this.currentTier);
    if (idx < order.length - 1) {
      this.currentTier = order[idx + 1];
      this.frameTimes = [];
      this.onDowngrade(this.currentTier);
    }
  }

  getTier(): RenderTier {
    return this.currentTier;
  }
}

export { RuntimeLadder };
