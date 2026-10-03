// Smooth scroll integration: Lenis + GSAP ScrollTrigger
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { LENIS_LERP, LENIS_WHEEL_SPEED, HEADER_HEIGHT } from './motion';

// Register ScrollTrigger once
gsap.registerPlugin(ScrollTrigger);

// Turn off GSAP's built-in lag smoothing so scroll feels direct
gsap.ticker.lagSmoothing(0);

let lenis: Lenis | null = null;
let isRunning = false;

// Check for reduced motion preference
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Start smooth scrolling
export function start(): void {
  // E2: Don't start Lenis if reduced motion is preferred
  if (isRunning || prefersReducedMotion()) return;

  lenis = new Lenis({
    lerp: LENIS_LERP,
    smoothWheel: true,
    wheelMultiplier: LENIS_WHEEL_SPEED,
    touchMultiplier: 0, // Disable smooth touch to keep native scrolling
  });

  // Drive Lenis from GSAP's ticker
  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    if (lenis) {
      lenis.raf(time * 1000);
    }
  });

  isRunning = true;
}

// Stop smooth scrolling (used by dialogs and mobile menu)
export function stop(): void {
  if (!isRunning || !lenis) return;
  lenis.stop();
  isRunning = false;
}

// Resume smooth scrolling
export function resume(): void {
  if (isRunning || prefersReducedMotion()) return;
  if (!lenis) {
    start();
    return;
  }
  lenis.start();
  isRunning = true;
}

// Scroll to a position or element
export function scrollTo(
  target: string | HTMLElement | number,
  options: { offset?: number; immediate?: boolean } = {}
): void {
  const { offset = 0, immediate = false } = options;

  // If reduced motion or immediate, use native scroll
  if (prefersReducedMotion() || immediate) {
    let targetPosition = 0;

    if (typeof target === 'number') {
      targetPosition = target;
    } else {
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (element) {
        const rect = element.getBoundingClientRect();
        targetPosition = window.scrollY + rect.top - offset;
      }
    }

    window.scrollTo({
      top: targetPosition,
      behavior: immediate ? 'auto' : 'smooth',
    });
    return;
  }

  // Use Lenis for smooth scroll
  if (!lenis) {
    start();
    if (!lenis) return;
  }

  if (typeof target === 'number') {
    lenis.scrollTo(target + offset, { duration: 1.2 });
  } else {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (element && element instanceof HTMLElement) {
      lenis.scrollTo(element, { offset, duration: 1.2 });
    }
  }
}

// Get current scroll velocity (useful for debugging or conditional animations)
export function getVelocity(): number {
  if (!lenis) return 0;
  return lenis.velocity;
}

// Check if smooth scroll is active
export function isActive(): boolean {
  return isRunning;
}

// Destroy Lenis instance (cleanup)
export function destroy(): void {
  if (lenis) {
    lenis.destroy();
    lenis = null;
    isRunning = false;
  }
}

// Helper to scroll to a chapter with header offset
export function scrollToChapter(chapterId: string): void {
  scrollTo(`#${chapterId}`, { offset: HEADER_HEIGHT });
}

// Helper to scroll to top
export function scrollToTop(immediate = false): void {
  scrollTo(0, { immediate });
}
