import { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Chapter } from '../../content';
import { copy } from '../../content';

gsap.registerPlugin(ScrollTrigger);

interface WorkProgressProps {
  chapters: readonly Chapter[];
}

export default function WorkProgress({ chapters }: WorkProgressProps) {
  const [activeChapter, setActiveChapter] = useState<Chapter>(chapters[0]);
  const [progress, setProgress] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!progressRef.current) return;

    const ctx = gsap.context(() => {
      // Create ScrollTrigger for the entire work section
      ScrollTrigger.create({
        trigger: '#work',
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          setProgress(self.progress);
        },
      });

      // Create ScrollTrigger for each chapter to track active chapter
      chapters.forEach((chapter) => {
        ScrollTrigger.create({
          trigger: `#chapter-${chapter}`,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => setActiveChapter(chapter),
          onEnterBack: () => setActiveChapter(chapter),
        });
      });
    }, progressRef.current);

    return () => ctx.revert();
  }, [chapters]);

  // Calculate total photos and current photo
  useEffect(() => {
    const total = chapters.reduce((sum, ch) => {
      const chapterEl = document.getElementById(`chapter-${ch}`);
      if (chapterEl) {
        const photos = chapterEl.querySelectorAll('[data-photo-id]');
        return sum + photos.length;
      }
      return sum;
    }, 0);
    setTotalPhotos(total);

    // Track current photo based on scroll position
    const updateCurrentPhoto = () => {
      let count = 0;
      for (const chapter of chapters) {
        const chapterEl = document.getElementById(`chapter-${chapter}`);
        if (chapterEl) {
          const photos = chapterEl.querySelectorAll('[data-photo-id]');
          for (let i = 0; i < photos.length; i++) {
            const rect = photos[i].getBoundingClientRect();
            if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
              setCurrentPhoto(count + i + 1);
              return;
            }
          }
          count += photos.length;
        }
      }
    };

    window.addEventListener('scroll', updateCurrentPhoto, { passive: true });
    updateCurrentPhoto();

    return () => window.removeEventListener('scroll', updateCurrentPhoto);
  }, [chapters]);

  const handleClick = (chapter: Chapter) => {
    const element = document.getElementById(`chapter-${chapter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      ref={progressRef}
      className="fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4"
    >
      {/* Vertical progress line */}
      <div className="relative w-px h-48 bg-stage-text/20">
        <div
          className="absolute top-0 left-0 w-full bg-brass transition-all duration-300"
          style={{ height: `${progress * 100}%` }}
        />
      </div>

      {/* Chapter ticks */}
      <div className="flex flex-col gap-3">
        {chapters.map((chapter) => (
          <button
            key={chapter}
            onClick={() => handleClick(chapter)}
            className={`w-6 h-6 flex items-center justify-center transition-all duration-300 ${
              activeChapter === chapter
                ? 'text-brass'
                : 'text-stage-text/40 hover:text-stage-text/60'
            }`}
            aria-label={`Go to ${copy.chapters[chapter].title}`}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeChapter === chapter ? 'bg-brass scale-125' : 'bg-current'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Photo counter */}
      <div className="font-mono text-xs text-stage-text/60 tabular-nums">
        {String(currentPhoto).padStart(2, '0')} / {String(totalPhotos).padStart(2, '0')}
      </div>
    </div>
  );
}
