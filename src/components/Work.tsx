import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters, getFeaturedPhotos, copy, type Chapter } from '../content';
import ChapterRoom from './work/ChapterRoom';
import WorkProgress from './work/WorkProgress';
import { scrollToChapter } from '../lib/scrollTo';

gsap.registerPlugin(ScrollTrigger);

export default function Work() {
  const sectionRef = useRef<HTMLElement>(null);

  // D4: Handle chapter name in URL hash on page load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    
    // Check if hash matches a chapter name
    if (hash && chapters.includes(hash as Chapter)) {
      // Wait for ScrollTrigger to be ready
      setTimeout(() => {
        scrollToChapter(hash as Chapter, true);
      }, 100);
    }
  }, []);

  // Refresh ScrollTrigger after fonts and images are ready
  useEffect(() => {
    const refresh = () => {
      ScrollTrigger.refresh();
    };

    // Wait for fonts
    if (document.fonts) {
      document.fonts.ready.then(refresh);
    }

    // Wait for first images in each chapter
    const images = sectionRef.current?.querySelectorAll('img');
    if (images && images.length > 0) {
      let loadedCount = 0;
      const totalImages = images.length;
      
      const checkAllLoaded = () => {
        loadedCount++;
        if (loadedCount >= totalImages) {
          refresh();
        }
      };

      images.forEach(img => {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.addEventListener('load', checkAllLoaded);
          img.addEventListener('error', checkAllLoaded);
        }
      });
    }

    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(refresh, 200);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="work"
      className="bg-stage"
      aria-label="Our work"
    >
      {chapters.map((chapter, index) => {
        const photos = getFeaturedPhotos(chapter);
        return (
          <ChapterRoom
            key={chapter}
            chapter={chapter}
            title={copy.chapters[chapter].title}
            subtitle={copy.chapters[chapter].subtitle}
            photos={photos}
            chapterIndex={index}
            totalChapters={chapters.length}
          />
        );
      })}
      
      <WorkProgress chapters={chapters} />
    </section>
  );
}
