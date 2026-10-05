import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Chapter, Photo } from '../../content';
import PhotoFrame from './PhotoFrame';
import { useReducedMotion } from '../../lib/gate';
import { useScrollReveal } from '../../lib/useScrollReveal';
import { scrollToContact } from '../../lib/scrollTo';
import {
  CHAPTER_OPENING_LENGTH,
  SEGMENT_LENGTH_PER_PHOTO,
  ENTER_WINDOW,
  DWELL_FRACTION,
  ENTER_ZOOM,
  DIM_AMOUNT,
  PUSH_BACK_DISTANCE,
  PUSH_BACK_SCALE,
  CHAPTER_END_FADE,
  CAPTION_FADE,
  EASE_REVEAL,
  EASE_SOFT,
  chapterLength,
} from '../../lib/motion';

gsap.registerPlugin(ScrollTrigger);

interface ChapterRoomProps {
  chapter: Chapter;
  title: string;
  subtitle: string;
  photos: readonly Photo[];
  chapterIndex: number;
  totalChapters: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

const CTA_TEXT: Record<Chapter, string> = {
  weddings: "Planning a wedding? Let's talk",
  cars: "Have a car to shoot? Let's talk",
  photoshoots: "Want a portrait session? Let's talk",
};

export default function ChapterRoom(props: ChapterRoomProps) {
  const reduced = useReducedMotion();
  return reduced ? <ReducedChapter {...props} /> : <ScrollChapter {...props} />;
}

// ---------------------------------------------------------------------------
// Full experience: a tall wrapper with a CSS-sticky screen inside. A single scrubbed
// timeline (no ScrollTrigger pin) plays while the visitor scrolls through the wrapper.
// ---------------------------------------------------------------------------
function ScrollChapter({ chapter, title, subtitle, photos, chapterIndex, totalChapters }: ChapterRoomProps) {
  const roomRef = useRef<HTMLDivElement>(null);
  const n = photos.length;
  const total = chapterLength(n);

  useGSAP(
    () => {
      const room = roomRef.current;
      if (!room) return;

      const S = SEGMENT_LENGTH_PER_PHOTO;
      const O = CHAPTER_OPENING_LENGTH;
      const enter = S * ENTER_WINDOW;
      const dwell = S * DWELL_FRACTION;
      const pick = (sel: string) => room.querySelector<HTMLElement>(sel);
      const animated = Array.from(room.querySelectorAll<HTMLElement>('[data-animate]'));

      const tl = gsap.timeline({
        scrollTrigger: {
          id: `chapter-${chapter}`,
          trigger: room,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true, // true, not a number: Lenis already smooths the scroll
          invalidateOnRefresh: true,
          onToggle: (self) => {
            animated.forEach((el) => {
              el.style.willChange = self.isActive ? 'transform, opacity' : 'auto';
            });
          },
        },
      });

      // ---- Opening: title mask-rise, rule draw, then lift away ----
      const titleEl = pick('[data-title]');
      const lineEl = pick('[data-title-line]');
      const ruleEl = pick('[data-rule]');
      const metaEls = Array.from(room.querySelectorAll<HTMLElement>('[data-title-meta]'));

      if (lineEl) tl.fromTo(lineEl, { yPercent: 110 }, { yPercent: 0, duration: O * 0.3, ease: EASE_REVEAL }, 0);
      if (ruleEl) tl.fromTo(ruleEl, { scaleX: 0 }, { scaleX: 1, duration: O * 0.25, ease: EASE_SOFT }, O * 0.12);
      if (metaEls.length) {
        tl.fromTo(
          metaEls,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: O * 0.2, ease: EASE_SOFT, stagger: O * 0.05 },
          O * 0.2
        );
      }
      if (titleEl) tl.to(titleEl, { y: '-4vh', autoAlpha: 0, duration: O * 0.3, ease: 'power2.in' }, O * 0.7);

      // ---- Photographs ----
      const cta = pick('[data-cta]');

      photos.forEach((photo, i) => {
        const el = pick(`[data-photo-id="${photo.id}"]`);
        if (!el) return;
        const fig = el.querySelector<HTMLElement>('[data-figure]');
        const mask = el.querySelector<HTMLElement>('[data-reveal]');
        const img = el.querySelector<HTMLElement>('[data-img]');
        const cap = el.querySelector<HTMLElement>('[data-caption]');

        const t0 = O + i * S; // photo starts entering
        const settle = t0 + enter; // fully revealed
        const isLast = i === n - 1;

        gsap.set(el, { autoAlpha: 0 });
        tl.set(el, { autoAlpha: 1 }, t0);

        // Enter: curtain reveal from the bottom edge, frame rises, image settles from a slight zoom.
        if (mask) tl.fromTo(mask, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: enter, ease: EASE_REVEAL }, t0);
        if (fig) tl.fromTo(fig, { y: '6vh' }, { y: 0, duration: enter, ease: EASE_REVEAL }, t0);
        if (img) {
          tl.fromTo(img, { scale: ENTER_ZOOM, yPercent: 4 }, { scale: 1, yPercent: 0, duration: enter, ease: EASE_REVEAL }, t0);
          // Dwell: the print "breathes" very slightly
          tl.to(img, { scale: 1.02, yPercent: -1, duration: dwell, ease: 'none' }, settle);
        }

        // Caption fades in once the photo has settled
        if (cap) {
          tl.fromTo(cap, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: S * CAPTION_FADE, ease: EASE_SOFT }, settle + S * 0.03);
        }

        if (!isLast) {
          const back = settle + dwell;
          if (cap) tl.to(cap, { autoAlpha: 0, duration: S * 0.06, ease: 'power2.in' }, back - S * 0.02);
          // Push back: dim, lift slightly, scale down while the next photo is uncovered
          tl.to(
            el,
            { autoAlpha: DIM_AMOUNT, y: `-${PUSH_BACK_DISTANCE}vh`, scale: PUSH_BACK_SCALE, duration: S - enter - dwell, ease: 'power2.inOut' },
            back
          );
          // Once the next photo fully covers it, remove it so at most two photos are ever visible
          tl.set(el, { autoAlpha: 0 }, t0 + S + enter);
        } else {
          // Last photo: hold, show the enquiry line, then fade to the dark stage before the next chapter
          const fadeStart = total - S * (CHAPTER_END_FADE + 0.02);
          if (cta) {
            tl.fromTo(cta, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: S * 0.1, ease: EASE_SOFT }, settle + dwell * 0.2);
            tl.to(cta, { autoAlpha: 0, duration: S * 0.08, ease: 'power2.in' }, fadeStart);
          }
          tl.to(el, { autoAlpha: 0, duration: S * CHAPTER_END_FADE, ease: 'power2.in' }, fadeStart);
        }
      });

      // Pad the timeline to the exact scroll length so the proportions never drift
      tl.to({}, { duration: 0 }, total);
    },
    { scope: roomRef, dependencies: [photos, chapter, n, total] }
  );

  return (
    <div
      ref={roomRef}
      id={`chapter-${chapter}`}
      className="relative"
      style={{ height: `${total + 100}svh` }}
      data-chapter={chapter}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Chapter opening */}
        <div
          data-title
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center"
        >
          <div className="overflow-hidden pb-2">
            <h2
              data-title-line
              className="font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-stage-text md:text-8xl"
            >
              {title}
            </h2>
          </div>
          <div data-rule className="my-5 h-px w-24 origin-left bg-brass" />
          <p data-title-meta className="max-w-md font-sans text-sm text-stage-muted">
            {subtitle}
          </p>
          <p data-title-meta className="mt-4 font-mono text-xs tabular-nums text-stage-muted">
            {pad(chapterIndex + 1)} / {pad(totalChapters)}
          </p>
        </div>

        {/* Photographs (ordered list for structure and screen readers) */}
        <ol className="absolute inset-0 m-0 list-none p-0">
          {photos.map((photo, i) => (
            <li key={photo.id} className="pointer-events-none absolute inset-0">
              <PhotoFrame
                photo={photo}
                chapter={chapter}
                photoIndex={i}
                totalPhotos={n}
                eager={chapterIndex === 0 && i < 2}
              />
            </li>
          ))}
        </ol>

        {/* Quiet enquiry line, shown while the last photo of the chapter rests */}
        <div
          data-cta
          className="pointer-events-none absolute bottom-[7svh] left-0 right-0 z-10 flex justify-center"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          <button
            type="button"
            onClick={() => scrollToContact(chapter)}
            className="pointer-events-auto border-b border-brass pb-1 font-mono text-[12px] uppercase tracking-[0.2em] text-stage-text transition-colors duration-200 hover:text-brass"
          >
            {CTA_TEXT[chapter]} &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reduced motion: no pinning, no scrubbing. Normal flow, each item fades in once.
// ---------------------------------------------------------------------------
function ReducedChapter({ chapter, title, subtitle, photos, chapterIndex, totalChapters }: ChapterRoomProps) {
  const ref = useScrollReveal<HTMLDivElement>(0.1);

  return (
    <div
      ref={ref}
      id={`chapter-${chapter}`}
      data-chapter={chapter}
      className="mx-auto max-w-[1600px] px-[clamp(1.25rem,4vw,4rem)] py-20 md:py-28"
    >
      <div className="reveal mb-12 md:mb-16">
        <p className="mb-3 font-mono text-xs tabular-nums text-stage-muted">
          {pad(chapterIndex + 1)} / {pad(totalChapters)}
        </p>
        <h2 className="font-display text-5xl font-bold uppercase tracking-tight text-stage-text md:text-8xl">{title}</h2>
        <div className="my-5 h-px w-24 bg-brass" />
        <p className="max-w-md font-sans text-sm text-stage-muted">{subtitle}</p>
      </div>

      <ol className="m-0 list-none space-y-16 p-0 md:space-y-24">
        {photos.map((photo, i) => (
          <li key={photo.id} className="reveal">
            <PhotoFrame photo={photo} chapter={chapter} photoIndex={i} totalPhotos={photos.length} variant="flow" />
          </li>
        ))}
      </ol>

      <div className="reveal mt-16">
        <button
          type="button"
          onClick={() => scrollToContact(chapter)}
          className="border-b border-brass pb-1 font-mono text-[12px] uppercase tracking-[0.2em] text-stage-text transition-colors duration-200 hover:text-brass"
        >
          {CTA_TEXT[chapter]} &rarr;
        </button>
      </div>
    </div>
  );
}