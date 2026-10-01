import { useEffect, useRef } from 'react';
import { services, copy } from '../content';

export default function Services() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="bg-paper py-16 md:py-28 border-t border-border"
      aria-labelledby="services-heading"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        {/* Header */}
        <div className="reveal mb-12 md:mb-20">
          <p className="font-mono text-[10px] text-ink-soft uppercase tracking-[0.25em] mb-4">
            Services
          </p>
          <h2
            id="services-heading"
            className="font-display font-bold uppercase tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 5rem)', lineHeight: 0.9 }}
          >
            What we shoot
          </h2>
        </div>

        {/* Service index - editorial style */}
        <div className="border-t border-border">
          {services.map((service, i) => (
            <div
              key={service.id}
              className="reveal border-b border-border group"
              style={{ transitionDelay: `${i * 0.06}s` }}
            >
              <a
                href={service.chapter ? `#chapter-${service.chapter}` : '#contact'}
                className="grid grid-cols-12 gap-4 md:gap-8 py-6 md:py-8 items-baseline hover:bg-card/50 transition-colors duration-200 px-2 -mx-2"
              >
                {/* Number */}
                <div className="col-span-2 md:col-span-1">
                  <span className="font-mono text-[10px] text-ink-soft/60 uppercase tracking-wider">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Name */}
                <div className="col-span-10 md:col-span-3">
                  <h3 className="font-display text-xl md:text-2xl font-bold uppercase tracking-tight text-ink group-hover:text-brass transition-colors duration-200">
                    {service.name}
                  </h3>
                </div>

                {/* Description */}
                <div className="col-span-10 md:col-span-6 col-start-3 md:col-start-auto">
                  <p className="font-sans text-[15px] text-ink-soft leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex col-span-2 items-center justify-end">
                  <span className="font-mono text-ink-soft/40 group-hover:text-brass transition-[color,transform] duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
