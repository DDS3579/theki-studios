// Smooth scroll: Lenis driven by GSAP's ticker, synced with ScrollTrigger.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LENIS_LERP, LENIS_WHEEL_SPEED } from './motion';

gsap.registerPlugin(ScrollTrigger);

// Scroll must feel direct: no GSAP lag smoothing, and ignore the mobile address-bar resize.
gsap.ticker.lagSmoothing(0);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;
let isRunning = false;
let tick: ((time: number) => void) | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function start(): void {
  if (lenis || prefersReducedMotion()) return;

  lenis = new Lenis({
    lerp: LENIS_LERP,
    smoothWheel: true,
    wheelMultiplier: LENIS_WHEEL_SPEED,
  });

  lenis.on('scroll', ScrollTrigger.update);

  tick = (time: number) => {
    lenis?.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  isRunning = true;
}

// Freeze scrolling (dialogs, mobile menu)
export function stop(): void {
  if (lenis && isRunning) {
    lenis.stop();
    isRunning = false;
  }
}

export function resume(): void {
  if (prefersReducedMotion()) return;
  if (!lenis) {
    start();
    return;
  }
  if (!isRunning) {
    lenis.start();
    isRunning = true;
  }
}

export function destroy(): void {
  if (tick) gsap.ticker.remove(tick);
  tick = null;
  if (lenis) lenis.destroy();
  lenis = null;
  isRunning = false;
}

// `offset` is ADDED to the target position (use a negative offset to stop above it).
export function scrollTo(
  target: string | HTMLElement | number,
  options: { offset?: number; immediate?: boolean } = {}
): void {
  const { offset = 0, immediate = false } = options;

  if (!lenis && !prefersReducedMotion()) start();

  if (lenis && isRunning) {
    lenis.scrollTo(target, { offset, immediate, duration: 1.2 });
    return;
  }

  // Native fallback (reduced motion, or Lenis not running)
  let top = 0;
  if (typeof target === 'number') {
    top = target + offset;
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el) top = window.scrollY + el.getBoundingClientRect().top + offset;
  }
  window.scrollTo({ top, behavior: immediate || prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function scrollToTop(immediate = false): void {
  scrollTo(0, { immediate });
}