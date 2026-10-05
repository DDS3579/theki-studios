import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, chapters, getPhotosByChapter, getPhotoSrc, getPhotoSrcSet, getHeroPhoto } from '../content';
import { EASE_INTRO } from '../lib/motion';
import { scrollToChapter, scrollToSection } from '../lib/scrollTo';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const supportRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollCueRef = useRef<HTMLDivElement>(null);

  // B1.4: read hero image from content
  const heroPhoto = getHeroPhoto('weddings');
  const heroSrc = heroPhoto ? getPhotoSrc(heroPhoto, 'hero') : '';
  const heroSrcSet = heroPhoto ? getPhotoSrcSet(heroPhoto) : '';

  const totalFrames = chapters.reduce((sum, ch) => sum + getPhotosByChapter(ch).length, 0);

  useGSAP(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        // Show everything immediately for reduced motion
        gsap.set([headlineRef.current, supportRef.current, ctaRef.current, scrollCueRef.current], {
          opacity: 1,
          y: 0,
        });
        return;
      }

      // D1: Calm intro sequence
      const tl = gsap.timeline({
        delay: 0.2,
      });

      // Headline lines rise in with mask
      if (headlineRef.current) {
        const lines = headlineRef.current.querySelectorAll('.headline-line');
        tl.fromTo(
          lines,
          { y: '100%', opacity: 0 },
          {
            y: '0%',
            opacity: 1,
            duration: 0.8,
            stagger: 0.08,
            ease: EASE_INTRO,
          }
        );
      }

      // Image settles from 106% to 100% over 1.4s
      if (imageRef.current) {
        tl.fromTo(
          imageRef.current,
          { scale: 1.06 },
          {
            scale: 1,
            duration: 1.4,
            ease: EASE_INTRO,
          },
          0 // Start at same time as headline
        );
      }

      // Support text and CTAs fade in
      tl.fromTo(
        [supportRef.current, ctaRef.current, scrollCueRef.current],
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.15,
          ease: EASE_INTRO,
        },
        0.7
      );

      // D1: Parallax on scroll - image drifts 8% slower than page
      if (imageRef.current) {
        gsap.to(imageRef.current, {
          yPercent: 6,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }

      // D1: Darken the photograph slightly as it scrolls away
      if (darkRef.current) {
        gsap.to(darkRef.current, {
          opacity: 0.45,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
      }
    }, sectionRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative h-[100svh] w-full overflow-hidden bg-stage"
      aria-label="Introduction"
    >
      {/* Hero background image */}
      <div ref={imageRef} className="absolute inset-x-0 -top-[8%] h-[116%]">
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
            fetchPriority="high"
          />
        )}
      </div>

      {/* D1: Darken overlay on scroll */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(36,26,18,1)_0%,rgba(36,26,18,0.5)_50%,rgba(36,26,18,0.2)_100%),linear-gradient(to_right,rgba(36,26,18,0.6)_0%,transparent_100%)]"
      />
      <div ref={darkRef} className="absolute inset-0 bg-stage" style={{ opacity: 0 }} aria-hidden="true" />

      {/* Viewfinder corner marks */}
      <div className="absolute inset-6 md:inset-10 lg:inset-14 pointer-events-none" aria-hidden="true">
        <div className="vf-mark vf-mark-tl" />
        <div className="vf-mark vf-mark-tr" />
        <div className="vf-mark vf-mark-bl" />
        <div className="vf-mark vf-mark-br" />
      </div>

      {/* Main content - left weighted */}
      <div className="relative z-10 h-full flex flex-col justify-end max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] pb-20 md:pb-28 lg:pb-32">
        <div>
          {/* B1.4: label from content */}
          <p className="font-mono text-[11px] md:text-xs text-stage-muted uppercase tracking-[0.25em] mb-5 md:mb-7">
            {copy.hero.label}
          </p>

          {/* B1.4: headline lines from content */}
          <h1
            ref={headlineRef}
            className="font-display font-black uppercase leading-[0.86] tracking-[-0.025em] text-stage-text mb-6 md:mb-8"
            style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
          >
            {copy.hero.headlineLines.map((line, i) => (
              <span key={i} className="headline-line block overflow-hidden pb-1">
                <span className="inline-block">
                  {line}
                </span>
              </span>
            ))}
          </h1>

          {/* B1.4: support text from content */}
          <p
            ref={supportRef}
            className="font-sans text-base md:text-lg text-stage-muted max-w-md mb-8 md:mb-10"
            style={{ opacity: 0 }}
          >
            {copy.hero.support}
          </p>

          {/* B1.4: CTAs from content */}
          <div
            ref={ctaRef}
            className="flex flex-wrap gap-4"
            style={{ opacity: 0 }}
          >
            <a
              href="#work"
              onClick={(e) => {
                e.preventDefault();
                scrollToChapter('weddings');
              }}
              className="inline-block font-sans text-sm font-medium bg-paper text-ink px-7 py-3.5 hover:bg-cream transition-colors duration-200"
            >
              {copy.hero.ctaPrimary}
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('contact');
              }}
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
          <div className="flex gap-4 md:gap-8 font-mono text-[11px] md:text-xs text-stage-muted uppercase tracking-[0.15em]">
            {chapters.map(ch => (
              <span key={ch}>
                {ch}: {getPhotosByChapter(ch).length}
              </span>
            ))}
          </div>
          <div className="font-mono text-[11px] md:text-xs text-stage-muted uppercase tracking-[0.15em]">
            {totalFrames} frames
          </div>
        </div>
      </div>

      {/* B7.8: Scroll cue - positioned above bottom strip, hidden on short viewports */}
      <div
        ref={scrollCueRef}
        className="absolute bottom-16 md:bottom-20 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 max-md:hidden"
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span className="font-mono text-[11px] text-stage-muted uppercase tracking-[0.2em]">Scroll</span>
        <div className="w-px h-8 bg-linear-to-b from-stage-muted to-transparent" />
      </div>
    </section>
  );
}
