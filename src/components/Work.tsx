import { useEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapters, getFeaturedPhotos, copy } from '../content';
import ChapterRoom from './work/ChapterRoom';
import WorkProgress from './work/WorkProgress';
import { scrollToChapter } from '../lib/scrollTo';

export default function Work() {
  // Once fonts are ready, re-measure every chapter, then honour a #weddings / #cars / #photoshoots link
  useEffect(() => {
    const target = chapters.find((c) => c === window.location.hash.slice(1));
    const ready = () => {
      ScrollTrigger.refresh();
      if (target) scrollToChapter(target, true);
    };
    if (document.fonts?.ready) {
      document.fonts.ready.then(ready);
    } else {
      ready();
    }
  }, []);

  return (
    <section id="work" className="bg-stage" aria-label="Our work">
      {chapters.map((chapter, index) => (
        <ChapterRoom
          key={chapter}
          chapter={chapter}
          title={copy.chapters[chapter].title}
          subtitle={copy.chapters[chapter].subtitle}
          photos={getFeaturedPhotos(chapter)}
          chapterIndex={index}
          totalChapters={chapters.length}
        />
      ))}
      <WorkProgress chapters={chapters} />
    </section>
  );
}