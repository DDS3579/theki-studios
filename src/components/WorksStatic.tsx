import { chapters, copy, getFeaturedPhotos, flags, getPhotoSrc, getPhotoSrcSet, getPhotoSizes, getAspect, type Chapter } from '../content';
import { useScrollReveal } from '../lib/useScrollReveal';

// B12.40: Static path - always renders, no capability check
// App decides which component to show (Stage or WorksStatic)
export default function WorksStatic() {
  return (
    <section id="work" className="bg-stage" aria-label="Our work" data-mode="static">
      {chapters.map((chapter, i) => (
        <StaticChapter key={chapter} chapter={chapter} index={i} />
      ))}
    </section>
  );
}

function StaticChapter({ chapter, index }: { chapter: Chapter; index: number }) {
  const photos = getFeaturedPhotos(chapter);
  const sectionRef = useScrollReveal<HTMLDivElement>(0.08);

  return (
    <div ref={sectionRef} id={`chapter-${chapter}`} className="border-t border-stage-text/[0.06]">
      {/* Title card */}
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)] py-16 md:py-24">
        <div className="reveal">
          <p className="font-mono text-[11px] text-stage-muted uppercase tracking-[0.25em] mb-4">
            {String(index + 1).padStart(2, '0')} — {String(chapters.length).padStart(2, '0')}
          </p>
          {/* B9.10: Title card with smaller minimum font size */}
          <h2 className="title-card text-stage-text mb-4" style={{ fontSize: 'clamp(3rem, 12vw, 16rem)' }}>
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
            const [w, h] = getAspect(photo);
            const isPortrait = h > w;
            const isOffset = i % 3 === 1;
            const isNarrow = i % 5 === 3;
            
            return (
              <figure
                key={photo.id}
                className="reveal"
                style={{ transitionDelay: `${(i % 3) * 0.1}s` }}
              >
                {/* B9.9 & B12.64: Constrain portrait photos by width, not height */}
                <div
                  className={`relative bg-stage ${
                    isOffset && !isPortrait ? 'md:ml-[12%]' : ''
                  } ${isNarrow && !isPortrait ? 'md:max-w-[75%]' : ''} ${
                    isPortrait ? 'md:max-w-[50%] mx-auto md:mx-0' : ''
                  }`}
                  style={isPortrait ? { 
                    // B12.64: Constrain width based on aspect ratio and 85svh height
                    maxWidth: `min(50%, calc(85svh * ${w / h}))`
                  } : undefined}
                >
                  {/* B9.11: Responsive images with srcset */}
                  <img
                    src={getPhotoSrc(photo, 'thumbnail')}
                    srcSet={getPhotoSrcSet(photo)}
                    sizes={getPhotoSizes('thumbnail')}
                    alt={photo.alt}
                    className="w-full h-auto block"
                    style={{ aspectRatio: `${w}/${h}` }}
                    loading="lazy"
                    decoding="async"
                    width={photo.width}
                    height={photo.height}
                  />
                </div>
                
                {/* Caption bar */}
                <div className={`mt-2 flex items-center justify-between ${isPortrait ? 'md:max-w-[50%] mx-auto md:mx-0' : ''}`}>
                  <span className="font-mono text-[11px] text-stage-muted uppercase tracking-[0.15em]">
                    {copy.chapters[chapter].title} {String(i + 1).padStart(2, '0')}/{String(photos.length).padStart(2, '0')}
                  </span>
                  {flags.SHOW_CAPTURE && photo.capture && (
                    <span className="font-mono text-[11px] text-stage-muted hidden md:block">
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
