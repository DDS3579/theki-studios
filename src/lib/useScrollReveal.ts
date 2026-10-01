import { useEffect, useRef } from 'react';

export function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    const reveals = el.querySelectorAll('.reveal');
    reveals.forEach((r) => observer.observe(r));

    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
