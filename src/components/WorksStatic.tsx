import { useEffect, useRef } from 'react';
import { chapters, copy, getFeaturedPhotos, flags, type Chapter } from '../content';
import { detectCapabilities } from '../lib/gate';

// Static path: renders chapters as editorial sequences for mobile/reduced motion
export default function WorksStatic() {
  const caps = detectCapabilities();
  if (caps.stageMode) return null;

  return (
    <section id="work" className="bg-stage" aria-label="Our work">
      {chapters.map((chapter, i) => (
        <StaticChapter key={chapter} chapter={chapter} index={i} />
      ))}
    </section>
  );
}

function StaticChapter({ chapter, index }: { chapter: Chapter; index: number }) {
  const photos = getFeaturedPhotos(chapter);
  const sectionRef = useRef<HTMLDivElement>(null);

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
      { threshold: 0.08 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} id={`chapter-${chapter}`} className="border-t border-stage-text/[0.06]">
      {/* Title card */}
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] py-16 md:py-24">
        <div className="reveal">
          <p className="font-mono text-[10px] text-stage-muted/70 uppercase tracking-[0.25em] mb-4">
            {String(index + 1).padStart(2, '0')} — {String(chapters.length).padStart(2, '0')}
          </p>
          <h2 className="title-card text-stage-text mb-4">
            {copy.chapters[chapter].title}
          </h2>
          <p className="font-sans text-base md:text-lg text-stage-muted max-w-md">
            {copy.chapters[chapter].subtitle}
          </p>
        </div>
      </div>

      {/* Photos - editorial layout */}
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] pb-16 md:pb-24">
        <div className="space-y-6 md:space-y-8">
          {photos.map((photo, i) => {
            // Alternate between full-width and offset layouts
            const isOffset = i % 3 === 1;
            const isNarrow = i % 5 === 3;
            
            return (
              <figure
                key={photo.id}
                className="reveal"
                style={{ transitionDelay: `${(i % 3) * 0.1}s` }}
              >
                <div
                  className={`relative overflow-hidden bg-stage ${
                    isOffset ? 'md:ml-[12%]' : ''
                  } ${isNarrow ? 'md:max-w-[75%]' : ''}`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-auto block"
                    style={{ aspectRatio: `${photo.aspect[0]}/${photo.aspect[1]}` }}
                    loading="lazy"
                    width={photo.aspect[0] * 200}
                    height={photo.aspect[1] * 200}
                  />
                </div>
                
                {/* Caption bar */}
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-stage-muted/70 uppercase tracking-[0.15em]">
                    {copy.chapters[chapter].title} {String(i + 1).padStart(2, '0')}/{String(photos.length).padStart(2, '0')}
                  </span>
                  {flags.SHOW_CAPTURE && photo.capture && (
                    <span className="font-mono text-[10px] text-stage-muted/70 hidden md:block">
                      {[
                        photo.capture.focal,
                        photo.capture.aperture,
                        photo.capture.shutter,
                        photo.capture.iso ? `ISO ${photo.capture.iso}` : null,
                      ].filter(Boolean).join(' / ')}
                    </span>
                  )}
                </div>
              </figure>
            );
          })}
        </div>
      </div>
    </div>
  );
}
