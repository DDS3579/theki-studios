import { useEffect, useState } from 'react';
import { copy, chapters, getPhotosByChapter, getPhotoSrc, getPhotoSrcSet, getHeroPhoto } from '../content';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);

  // B7.4: Wait for image and fonts to load before starting intro
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setLoaded(true);
      return;
    }

    const heroPhoto = getHeroPhoto('weddings');
    if (!heroPhoto) {
      setLoaded(true);
      return;
    }

    const heroSrc = getPhotoSrc(heroPhoto, 'hero');
    
    // Wait for image to load
    const img = new Image();
    img.src = heroSrc;
    
    const imagePromise = new Promise<void>((resolve) => {
      if (img.complete) {
        resolve();
      } else {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Continue even if image fails
      }
    });

    // Wait for fonts to load (with timeout)
    const fontsPromise = document.fonts.ready.catch(() => {});
    
    // Maximum wait time: 1.2 seconds
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, 1200);
    });

    Promise.race([
      Promise.all([imagePromise, fontsPromise]),
      timeoutPromise
    ]).then(() => {
      setLoaded(true);
    });
  }, []);

  // B1.4: read hero image from content
  const heroPhoto = getHeroPhoto('weddings');
  const heroSrc = heroPhoto ? getPhotoSrc(heroPhoto, 'hero') : '';
  const heroSrcSet = heroPhoto ? getPhotoSrcSet(heroPhoto) : '';

  const totalFrames = chapters.reduce((sum, ch) => sum + getPhotosByChapter(ch).length, 0);

  return (
    <section
      className="relative h-[100svh] w-full overflow-hidden bg-stage"
      aria-label="Introduction"
    >
      {/* Hero background image */}
      <div className="absolute inset-0">
        {heroSrc && (
          <img
            src={heroSrc}
            srcSet={heroSrcSet}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center"
            width={heroPhoto?.width}
            height={heroPhoto?.height}
            decoding="async"
          />
        )}
        {/* B7.7: Merged gradient overlays into one */}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(36,26,18,1)_0%,rgba(36,26,18,0.5)_50%,rgba(36,26,18,0.2)_100%),linear-gradient(to_right,rgba(36,26,18,0.6)_0%,transparent_100%)]" />
      </div>

      {/* Viewfinder corner marks */}
      <div className="absolute inset-6 md:inset-10 lg:inset-14 pointer-events-none" aria-hidden="true">
        <div className="vf-mark vf-mark-tl" />
        <div className="vf-mark vf-mark-tr" />
        <div className="vf-mark vf-mark-bl" />
        <div className="vf-mark vf-mark-br" />
      </div>

      {/* Main content - left weighted */}
      <div className="relative z-10 h-full flex flex-col justify-end max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] pb-20 md:pb-28 lg:pb-32">
        {/* B7.7: Changed transition-all to specific properties */}
        <div className={`transition-[opacity,transform] duration-700 ease-[var(--ease-focus)] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {/* B1.4: label from content */}
          <p className="font-mono text-[10px] md:text-xs text-stage-muted uppercase tracking-[0.25em] mb-5 md:mb-7">
            {copy.hero.label}
          </p>

          {/* B1.4: headline lines from content */}
          <h1
            className="font-display font-black uppercase leading-[0.86] tracking-[-0.025em] text-stage-text mb-6 md:mb-8"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          >
            {copy.hero.headlineLines.map((line, i) => (
              <span key={i} className="block overflow-hidden pb-1">
                <span
                  className="inline-block transition-transform duration-700 ease-[var(--ease-focus)]"
                  style={{
                    transform: loaded ? 'translateY(0)' : 'translateY(110%)',
                    transitionDelay: `${0.3 + i * 0.12}s`,
                  }}
                >
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/* B1.4: support text from content */}
          {/* B7.7: Changed transition-all to specific properties */}
          <p
            className="font-sans text-base md:text-lg text-stage-muted max-w-md mb-8 md:mb-10 transition-[opacity,transform] duration-700 ease-[var(--ease-focus)]"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: '0.7s',
            }}
          >
            {copy.hero.support}
          </p>

          {/* B1.4: CTAs from content */}
          {/* B7.7: Changed transition-all to specific properties */}
          <div
            className="flex flex-wrap gap-4 transition-[opacity,transform] duration-700 ease-[var(--ease-focus)]"
            style={{
              opacity: loaded ? 1 : 0,
              transform: loaded ? 'translateY(0)' : 'translateY(16px)',
              transitionDelay: '0.85s',
            }}
          >
            <a
              href="#work"
              className="inline-block font-sans text-sm font-medium bg-paper text-ink px-7 py-3.5 hover:bg-cream transition-colors duration-200"
            >
              {copy.hero.ctaPrimary}
            </a>
            <a
              href="#contact"
              className="inline-block font-sans text-sm font-medium border border-stage-text/30 text-stage-text px-7 py-3.5 hover:border-brass hover:text-brass transition-colors duration-200"
            >
              {copy.hero.ctaSecondary}
            </a>
          </div>
        </div>
      </div>

      {/* Bottom strip - frame counts */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-stage-text/[0.08]">
        <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] py-3 flex items-center justify-between">
          <div className="flex gap-4 md:gap-8 font-mono text-[9px] md:text-[10px] text-stage-muted uppercase tracking-[0.15em]">
            {chapters.map(ch => (
              <span key={ch}>
                {ch}: {getPhotosByChapter(ch).length}
              </span>
            ))}
          </div>
          <div className="font-mono text-[9px] md:text-[10px] text-stage-muted uppercase tracking-[0.15em]">
            {totalFrames} frames
          </div>
        </div>
      </div>

      {/* B7.8: Scroll cue - positioned above bottom strip, hidden on short viewports */}
      <div
        className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 transition-opacity duration-500 max-md:hidden"
        style={{ opacity: loaded ? 0.6 : 0 }}
        aria-hidden="true"
      >
        <span className="font-mono text-[8px] text-stage-muted uppercase tracking-[0.2em]">Scroll</span>
        <div className="w-px h-8 bg-linear-to-b from-stage-muted to-transparent" />
      </div>
    </section>
  );
}
