import { useEffect, useRef } from 'react';

// B9.14: Generic type for element ref
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // B9.14: Show immediately under reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      const reveals = el.querySelectorAll('.reveal');
      reveals.forEach((r) => r.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold,
        rootMargin: '0px 0px -50px 0px' // B9.14: Small negative bottom margin
      }
    );

    const reveals = el.querySelectorAll('.reveal');
    reveals.forEach((r) => observer.observe(r));

    // B9.14: Safety timeout - show after 2 seconds if not revealed
    const timeoutId = setTimeout(() => {
      reveals.forEach((r) => {
        if (!r.classList.contains('visible')) {
          r.classList.add('visible');
        }
      });
    }, 2000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [threshold]);

  return ref;
}
