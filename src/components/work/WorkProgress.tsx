import { useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, getFeaturedPhotos, type Chapter } from '../../content';
import { useReducedMotion } from '../../lib/gate';
import { scrollToChapter, scrollToPhoto } from '../../lib/scrollTo';
import { CHAPTER_OPENING_LENGTH, SEGMENT_LENGTH_PER_PHOTO, chapterLength } from '../../lib/motion';

gsap.registerPlugin(ScrollTrigger);

const pad = (n: number) => String(n).padStart(2, '0');

interface WorkProgressProps {
  chapters: readonly Chapter[];
}

// Right-edge rail: progress line, chapter jumps, per-photo jumps for the current chapter, counter.
// React state changes only when the chapter or photo changes. The line fill is written straight to the DOM.
export default function WorkProgress({ chapters }: WorkProgressProps) {
  const reduced = useReducedMotion();
  const fillRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState<{ chapter: Chapter; photo: number }>({
    chapter: chapters[0],
    photo: 0,
  });

  const counts = useMemo(() => chapters.map((c) => getFeaturedPhotos(c).length), [chapters]);
  const total = counts.reduce((a, b) => a + b, 0);
  const activeChapterIndex = chapters.indexOf(active.chapter);
  const overall = counts.slice(0, activeChapterIndex).reduce((a, b) => a + b, 0) + active.photo + 1;

  useGSAP(
    () => {
      if (reduced) return;

      ScrollTrigger.create({
        trigger: '#work',
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => setVisible(self.isActive),
        onUpdate: (self) => {
          if (fillRef.current) fillRef.current.style.transform = `scaleY(${self.progress})`;
        },
      });

      chapters.forEach((chapter, ci) => {
        const len = chapterLength(counts[ci]);
        ScrollTrigger.create({
          trigger: `#chapter-${chapter}`,
          start: 'top top',
          end: 'bottom bottom',
          onUpdate: (self) => {
            if (!self.isActive) return;
            const t = self.progress * len;
            const idx = Math.min(
              counts[ci] - 1,
              Math.max(0, Math.floor((t - CHAPTER_OPENING_LENGTH - SEGMENT_LENGTH_PER_PHOTO * 0.15) / SEGMENT_LENGTH_PER_PHOTO))
            );
            setActive((prev) => (prev.chapter === chapter && prev.photo === idx ? prev : { chapter, photo: idx }));
          },
        });
      });
    },
    { dependencies: [reduced] }
  );

  if (reduced) return null;

  return (
    <div
      role="navigation"
      aria-label="Work progress"
      className={`fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-5 transition-[opacity,visibility] duration-500 md:flex ${
        visible ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      <div className="relative h-40 w-px bg-stage-text/20">
        <div
          ref={fillRef}
          className="absolute inset-0 origin-top bg-brass"
          style={{ transform: 'scaleY(0)' }}
        />
      </div>

      <div className="flex flex-col items-end">
        {chapters.map((chapter, ci) => {
          const isActive = active.chapter === chapter;
          return (
            <div key={chapter} className="flex flex-col items-end">
              <button
                type="button"
                onClick={() => scrollToChapter(chapter)}
                aria-label={`Go to ${copy.chapters[chapter].title}`}
                aria-current={isActive ? 'step' : undefined}
                className={`group flex h-6 items-center gap-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors duration-300 ${
                  isActive ? 'text-brass' : 'text-stage-muted hover:text-stage-text'
                }`}
              >
                <span
                  className={`transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'
                  }`}
                >
                  {copy.chapters[chapter].title}
                </span>
                <span className={`block h-1.5 w-1.5 rounded-full ${isActive ? 'bg-brass' : 'bg-current'}`} />
              </button>

              {isActive && counts[ci] > 1 && (
                <div className="flex flex-col items-end">
                  {Array.from({ length: counts[ci] }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => scrollToPhoto(chapter, i)}
                      aria-label={`Photo ${i + 1} of ${counts[ci]}`}
                      aria-current={active.photo === i ? 'true' : undefined}
                      className="group flex h-6 w-6 items-center justify-end"
                    >
                      <span
                        className={`block h-px transition-[width,background-color] duration-300 ${
                          active.photo === i ? 'w-4 bg-brass' : 'w-2 bg-stage-muted group-hover:w-3'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p aria-hidden="true" className="font-mono text-[11px] tabular-nums text-stage-muted">
        {pad(overall)} / {pad(total)}
      </p>
    </div>
  );
}