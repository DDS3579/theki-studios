import { allPhotosInDisplayOrder, getAspect, getPhotoSrc, getPhotoSrcSet } from '../content';
import { about, faq, howWeWork, testimonials } from '../content/site';
import { useScrollReveal } from '../lib/useScrollReveal';
import { scrollToContact } from '../lib/scrollTo';

const eyebrow = 'mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-soft';
const h2 = 'font-display font-bold uppercase tracking-[-0.02em] text-ink';
const h2Style = { fontSize: 'clamp(2.25rem, 5vw, 5rem)', lineHeight: 0.92 } as const;
const shell = 'mx-auto max-w-[1600px] px-[clamp(1.25rem,4vw,4rem)]';

// ─── About ───────────────────────────────────────────────────────────────────
export function About() {
  const ref = useScrollReveal<HTMLElement>(0.1);
  const photo = allPhotosInDisplayOrder.find((p) => p.id === about.photoId);

  return (
    <section ref={ref} id="about" aria-labelledby="about-heading" className="bg-paper py-20 md:py-32">
      <div className={shell}>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-20">
          <div className="md:col-span-7">
            <p className={`reveal ${eyebrow}`}>{about.eyebrow}</p>
            <h2 id="about-heading" className={`reveal ${h2}`} style={h2Style}>
              {about.heading}
            </h2>

            <div className="mt-8 max-w-xl space-y-5 md:mt-12">
              {about.paragraphs.map((text, i) => (
                <p key={i} className="reveal font-sans text-base leading-relaxed text-ink-soft md:text-[17px]">
                  {text}
                </p>
              ))}
            </div>

            <ul className="reveal mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-3 md:mt-16">
              {about.principles.map((p) => (
                <li key={p.title}>
                  <h3 className="font-display text-xl font-bold uppercase tracking-tight text-ink">{p.title}</h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{p.text}</p>
                </li>
              ))}
            </ul>

            {about.facts.length > 0 && (
              <dl className="reveal mt-10 flex flex-wrap gap-x-12 gap-y-6">
                {about.facts.map((f) => (
                  <div key={f.label}>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">{f.label}</dt>
                    <dd className="mt-1 font-sans text-base text-ink">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {photo && (
            <div className="md:col-span-5">
              <figure className="reveal mx-auto max-w-sm md:sticky md:top-28 md:max-w-none">
                <img
                  src={getPhotoSrc(photo, 'thumbnail')}
                  srcSet={getPhotoSrcSet(photo)}
                  sizes="(min-width: 768px) 38vw, 80vw"
                  alt={photo.alt}
                  width={getAspect(photo)[0]}
                  height={getAspect(photo)[1]}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
              </figure>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Process ─────────────────────────────────────────────────────────────────
export function Process() {
  const ref = useScrollReveal<HTMLElement>(0.1);
  return (
    <section
      ref={ref}
      id="process"
      aria-labelledby="process-heading"
      className="border-t border-border bg-surface py-20 md:py-32"
    >
      <div className={shell}>
        <div className="reveal mb-12 md:mb-16">
          <p className={eyebrow}>{howWeWork.eyebrow}</p>
          <h2 id="process-heading" className={h2} style={h2Style}>
            {howWeWork.heading}
          </h2>
        </div>

        <ol className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {howWeWork.steps.map((s, i) => (
            <li
              key={s.title}
              className="reveal bg-surface p-6 md:p-8"
              style={{ transitionDelay: `${i * 0.07}s` }}
            >
              <span className="font-mono text-[11px] tabular-nums tracking-[0.2em] text-ink-soft">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold uppercase tracking-tight text-ink md:text-3xl">
                {s.title}
              </h3>
              <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Testimonials (hidden until you add some) ────────────────────────────────
export function Testimonials() {
  const ref = useScrollReveal<HTMLElement>(0.1);
  if (testimonials.length === 0) return null;
  return (
    <section
      ref={ref}
      id="testimonials"
      aria-labelledby="testimonials-heading"
      className="border-t border-border bg-card py-20 md:py-32"
    >
      <div className={shell}>
        <div className="reveal mb-12 md:mb-16">
          <p className={eyebrow}>Kind words</p>
          <h2 id="testimonials-heading" className={h2} style={h2Style}>
            From our clients
          </h2>
        </div>
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure key={i} className="reveal border-t border-ink pt-6" style={{ transitionDelay: `${i * 0.07}s` }}>
              <blockquote className="font-sans text-lg leading-relaxed text-ink">{t.quote}</blockquote>
              <figcaption className="mt-5 font-mono text-[12px] uppercase tracking-[0.16em] text-ink-soft">
                {t.name}
                {t.detail ? ` \u00B7 ${t.detail}` : ''}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
export function Faq() {
  const ref = useScrollReveal<HTMLElement>(0.1);
  return (
    <section
      ref={ref}
      id="faq"
      aria-labelledby="faq-heading"
      className="border-t border-border bg-paper py-20 md:py-32"
    >
      <div className={shell}>
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="reveal md:col-span-4">
            <p className={eyebrow}>{faq.eyebrow}</p>
            <h2 id="faq-heading" className={h2} style={h2Style}>
              {faq.heading}
            </h2>
            <p className="mt-6 max-w-xs font-sans text-[15px] leading-relaxed text-ink-soft">
              Can&rsquo;t find your question? Write to us and we will answer personally.
            </p>
            <button
              type="button"
              onClick={() => scrollToContact()}
              className="mt-6 border-b border-ink pb-1 font-mono text-[12px] uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:border-brass"
            >
              Ask a question &rarr;
            </button>
          </div>

          <div className="reveal border-t border-border md:col-span-8">
            {faq.items.map((item) => (
              <details key={item.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 md:py-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-xl font-bold uppercase tracking-tight text-ink md:text-2xl">
                    {item.q}
                  </span>
                  <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
                    <span className="absolute left-0 top-1/2 h-px w-full bg-ink" />
                    <span className="absolute left-1/2 top-0 h-full w-px bg-ink transition-transform duration-300 group-open:scale-y-0" />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 pr-10 font-sans text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
