import { useEffect, useRef, useState } from 'react';
import { photos, chapters, copy, getPhotosByChapter, flags, type Photo } from '../content';

export default function Archive() {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const dialogLightboxRef = useRef<HTMLDialogElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const allPhotos = [...photos].sort((a, b) => a.order - b.order);

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
      { threshold: 0.05 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const openLightbox = (photo: Photo, index: number, trigger: HTMLElement) => {
    triggerRef.current = trigger;
    setLightboxPhoto(photo);
    setLightboxIndex(index);
    dialogLightboxRef.current?.showModal();
  };

  const closeLightbox = () => {
    dialogLightboxRef.current?.close();
    setLightboxPhoto(null);
    triggerRef.current?.focus();
  };

  const navigateLightbox = (direction: number) => {
    const newIndex = lightboxIndex + direction;
    if (newIndex >= 0 && newIndex < allPhotos.length) {
      setLightboxPhoto(allPhotos[newIndex]);
      setLightboxIndex(newIndex);
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxPhoto) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navigateLightbox(-1);
      if (e.key === 'ArrowRight') navigateLightbox(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxPhoto, lightboxIndex]);

  return (
    <section
      ref={sectionRef}
      id="archive"
      className="bg-paper py-16 md:py-28"
      aria-labelledby="archive-heading"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        {/* Section header */}
        <div className="reveal mb-12 md:mb-20">
          <p className="font-mono text-[10px] text-ink-soft uppercase tracking-[0.25em] mb-4">
            Archive
          </p>
          <h2
            id="archive-heading"
            className="font-display font-bold uppercase tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 5rem)', lineHeight: 0.9 }}
          >
            All frames
          </h2>
          <p className="mt-4 font-sans text-base text-ink-soft max-w-md">
            Every photograph from every chapter, in the order they were made.
          </p>
        </div>

        {/* Chapters */}
        {chapters.map((chapter) => {
          const chapterPhotos = getPhotosByChapter(chapter);
          if (chapterPhotos.length === 0) return null;

          return (
            <div key={chapter} className="mb-16 md:mb-24">
              <h3 className="reveal font-display text-lg md:text-xl font-bold uppercase tracking-tight text-ink mb-6 border-b border-border pb-3">
                {copy.chapters[chapter].title}
              </h3>
              
              {/* Justified rows */}
              <JustifiedRows
                photos={chapterPhotos}
                allPhotos={allPhotos}
                onPhotoClick={openLightbox}
              />
            </div>
          );
        })}
      </div>

      {/* Lightbox dialog */}
      <dialog
        ref={dialogLightboxRef}
        className="fixed inset-0 w-full h-full z-[60] p-0 m-0"
        onClose={closeLightbox}
      >
        {lightboxPhoto && (
          <div className="relative w-full h-full bg-stage/95 flex items-center justify-center p-4 md:p-16">
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-10 font-mono text-xs text-stage-muted uppercase tracking-widest hover:text-brass transition-colors p-3"
              aria-label="Close lightbox"
            >
              Close ✕
            </button>

            {/* Prev */}
            {lightboxIndex > 0 && (
              <button
                onClick={() => navigateLightbox(-1)}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 font-mono text-2xl text-stage-muted hover:text-brass transition-colors p-4"
                aria-label="Previous photo"
              >
                ←
              </button>
            )}
            
            {/* Next */}
            {lightboxIndex < allPhotos.length - 1 && (
              <button
                onClick={() => navigateLightbox(1)}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 font-mono text-2xl text-stage-muted hover:text-brass transition-colors p-4"
                aria-label="Next photo"
              >
                →
              </button>
            )}

            {/* Image */}
            <figure className="max-w-full max-h-full flex flex-col items-center">
              <img
                src={lightboxPhoto.src}
                alt={lightboxPhoto.alt}
                className="max-w-full max-h-[70vh] object-contain"
              />
              <figcaption className="mt-4 text-center max-w-md">
                {lightboxPhoto.caption && (
                  <p className="font-sans text-sm text-stage-muted mb-1">
                    {lightboxPhoto.caption}
                  </p>
                )}
                {flags.SHOW_CAPTURE && lightboxPhoto.capture && (
                  <p className="font-mono text-[10px] text-stage-muted/70">
                    {[
                      lightboxPhoto.capture.focal,
                      lightboxPhoto.capture.aperture,
                      lightboxPhoto.capture.shutter,
                      lightboxPhoto.capture.iso ? `ISO ${lightboxPhoto.capture.iso}` : null,
                    ].filter(Boolean).join(' / ')}
                  </p>
                )}
              </figcaption>
            </figure>

            {/* Counter */}
            <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-stage-muted/70">
              {lightboxIndex + 1} / {allPhotos.length}
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}

// Justified rows component
function JustifiedRows({ photos, allPhotos, onPhotoClick }: {
  photos: Photo[];
  allPhotos: Photo[];
  onPhotoClick: (photo: Photo, index: number, trigger: HTMLElement) => void;
}) {
  const targetHeight = 260;
  const rows: Photo[][] = [];
  let currentRow: Photo[] = [];
  let currentWidth = 0;

  for (const photo of photos) {
    const aspect = photo.aspect[0] / photo.aspect[1];
    const photoWidth = aspect * targetHeight;
    
    currentRow.push(photo);
    currentWidth += photoWidth + 4; // gap

    if (currentWidth > 900 || currentRow.length >= 4) {
      rows.push([...currentRow]);
      currentRow = [];
      currentWidth = 0;
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);

  return (
    <div className="flex flex-col gap-1">
      {rows.map((row, rowIdx) => {
        const totalAspect = row.reduce((sum, p) => sum + p.aspect[0] / p.aspect[1], 0);
        
        return (
          <div key={rowIdx} className="flex gap-1" style={{ height: targetHeight }}>
            {row.map((photo) => {
              const aspect = photo.aspect[0] / photo.aspect[1];
              const flexGrow = aspect / totalAspect * row.length;
              const globalIndex = allPhotos.indexOf(photo);
              
              return (
                <button
                  key={photo.id}
                  onClick={(e) => onPhotoClick(photo, globalIndex, e.currentTarget)}
                  className="relative overflow-hidden bg-surface cursor-pointer group focus-visible:outline-brass focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ flexGrow, flexBasis: 0 }}
                  aria-label={`View: ${photo.alt}`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="w-full h-full object-cover transition-all duration-500 ease-[var(--ease-focus)] group-hover:scale-[1.03]"
                    loading="lazy"
                    width={photo.aspect[0] * 100}
                    height={photo.aspect[1] * 100}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-stage/0 group-hover:bg-stage/10 transition-colors duration-300" />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
