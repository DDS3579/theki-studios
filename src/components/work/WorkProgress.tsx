import { useRef, useState, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Chapter } from '../../content';
import { copy } from '../../content';
import { scrollToChapter } from '../../lib/scrollTo';

gsap.registerPlugin(ScrollTrigger);

interface WorkProgressProps {
  chapters: readonly Chapter[];
}

export default function WorkProgress({ chapters }: WorkProgressProps) {
  const [activeChapter, setActiveChapter] = useState<Chapter>(chapters[0]);
  const [progress, setProgress] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!progressRef.current) return;

    const ctx = gsap.context(() => {
      // D3: Show rail only while Work section is in view
      ScrollTrigger.create({
        trigger: '#work',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => setIsVisible(true),
        onLeave: () => setIsVisible(false),
        onEnterBack: () => setIsVisible(true),
        onLeaveBack: () => setIsVisible(false),
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
    scrollToChapter(chapter);
  };

  return (
    <div
      ref={progressRef}
      className={`fixed right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      role="navigation"
      aria-label="Work progress"
    >
      {/* D3: Vertical progress line with brass fill */}
      <div className="relative w-px h-48 bg-stage-text/20">
        <div
          className="absolute top-0 left-0 w-full bg-brass transition-all duration-300"
          style={{ height: `${progress * 100}%` }}
        />
      </div>

      {/* D3: Chapter ticks with 24px hit area and hover labels */}
      {/* E4: Screen readers - navigation landmark with labels */}
      <nav aria-label="Chapter navigation" className="flex flex-col gap-3">
        {chapters.map((chapter) => (
          <button
            key={chapter}
            onClick={() => handleClick(chapter)}
            className={`group relative w-6 h-6 flex items-center justify-center transition-all duration-300 ${
              activeChapter === chapter
                ? 'text-brass'
                : 'text-stage-text/40 hover:text-stage-text/60'
            }`}
            aria-label={`Go to ${copy.chapters[chapter].title} chapter`}
            aria-current={activeChapter === chapter ? 'step' : undefined}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                activeChapter === chapter ? 'bg-brass scale-125' : 'bg-current'
              }`}
            />
            {/* D3: Text label on hover or focus */}
            <span className="absolute right-8 font-mono text-xs text-stage-text/80 uppercase tracking-wider opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {copy.chapters[chapter].title}
            </span>
          </button>
        ))}
      </nav>

      {/* D3: Photo counter with tabular numbers */}
      {/* E4: Counter is decorative */}
      <div 
        className="font-mono text-xs text-stage-text/60 tabular-nums"
        aria-hidden="true"
      >
        {String(currentPhoto).padStart(2, '0')} / {String(totalPhotos).padStart(2, '0')}
      </div>
    </div>
  );
}
