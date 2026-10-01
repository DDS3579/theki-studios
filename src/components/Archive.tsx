import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  chapters,
  copy,
  getPhotosByChapter,
  flags,
  getPhotoSrc,
  getPhotoSrcSet,
  getPhotoSizes,
  getAspect,
  allPhotosInDisplayOrder,
  getPhotoDisplayIndex,
  type Photo,
} from '../content';
import { useScrollReveal } from '../lib/useScrollReveal';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

export default function Archive() {
  // B8.7 & B9.14: Use shared reveal hook with generic type
  const sectionRef = useScrollReveal<HTMLElement>(0.05);
  
  // B8.4: Lightbox state with refs for stable handlers
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const dialogLightboxRef = useRef<HTMLDialogElement>(null);
  const lightboxPhotoRef = useRef<Photo | null>(null);
  const lightboxIndexRef = useRef(0);
  const touchStartX = useRef(0);

  // Keep refs in sync with state
  useEffect(() => {
    lightboxPhotoRef.current = lightboxPhoto;
    lightboxIndexRef.current = lightboxIndex;
  }, [lightboxPhoto, lightboxIndex]);

  // B8.4: Single close handler driven by native dialog close event
  const handleDialogClose = useCallback(() => {
    setLightboxPhoto(null);
    unlockScroll();
  }, []);

  // B8.5: Navigate with preloading
  const navigateLightbox = useCallback((direction: number) => {
    const currentIndex = lightboxIndexRef.current;
    const newIndex = currentIndex + direction;
    
    if (newIndex >= 0 && newIndex < allPhotosInDisplayOrder.length) {
      const photo = allPhotosInDisplayOrder[newIndex];
      if (photo) {
        setLoading(true);
        setLightboxPhoto(photo);
        setLightboxIndex(newIndex);
        
        // B8.5: Preload neighboring photos
        const preloadNext = allPhotosInDisplayOrder[newIndex + 1];
        const preloadPrev = allPhotosInDisplayOrder[newIndex - 1];
        
        if (preloadNext) {
          const img = new Image();
          img.src = getPhotoSrc(preloadNext, 'large');
        }
        if (preloadPrev) {
          const img = new Image();
          img.src = getPhotoSrc(preloadPrev, 'large');
        }
      }
    }
  }, []);

  // B8.4: Arrow keys only, attached once via ref
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxPhotoRef.current) return;
      
      // Only handle arrow keys, not Escape (native dialog handles it)
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateLightbox(1);
      }
    };
    
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [navigateLightbox]);

  // B8.5: Touch swipe handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!lightboxPhotoRef.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50; // minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swiped left, go next
        navigateLightbox(1);
      } else {
        // Swiped right, go prev
        navigateLightbox(-1);
      }
    }
  }, [navigateLightbox]);

  // B8.5: Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      dialogLightboxRef.current?.close();
    }
  }, []);

  // B8.1: Open lightbox with display order index
  const openLightbox = useCallback((photo: Photo) => {
    const index = getPhotoDisplayIndex(photo.id);
    setLightboxPhoto(photo);
    setLightboxIndex(index);
    setLoading(false);
    lockScroll();
    
    // Show modal after state is set
    setTimeout(() => {
      dialogLightboxRef.current?.showModal();
    }, 0);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="archive"
      className="bg-paper py-16 md:py-28 scroll-mt-20 md:scroll-mt-24"
      aria-labelledby="archive-heading"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        {/* Section header */}
        <div className="reveal mb-12 md:mb-20">
          <p className="font-mono text-[11px] text-ink-soft uppercase tracking-[0.25em] mb-4">
            Archive
          </p>
          <h2
            id="archive-heading"
            className="font-display font-bold uppercase tracking-[-0.02em] text-ink"
            style={{ fontSize: 'clamp(2.25rem, 5vw, 5rem)', lineHeight: 0.9 }}
          >
            All frames
          </h2>
          {/* B8.1: Reworded intro text */}
          <p className="mt-4 font-sans text-base text-ink-soft max-w-md">
            Every photograph, grouped by chapter.
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
              
              {/* B8.2: Responsive justified rows */}
              <JustifiedRows
                photos={[...chapterPhotos]}
                onPhotoClick={openLightbox}
              />
            </div>
          );
        })}
      </div>

      {/* B8.4 & B8.5: Improved lightbox dialog */}
      <dialog
        ref={dialogLightboxRef}
        className="fixed inset-0 w-full h-[100dvh] z-[60] p-0 m-0 bg-transparent"
        onClose={handleDialogClose}
      >
        {lightboxPhoto && (
          <div 
            className="relative w-full h-full bg-stage/95 flex items-center justify-center p-4 md:p-16"
            onClick={handleBackdropClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Close button */}
            <button
              onClick={() => dialogLightboxRef.current?.close()}
              className="absolute top-4 right-4 md:top-6 md:right-6 z-10 font-mono text-xs text-stage-muted uppercase tracking-widest hover:text-brass transition-colors p-3"
              aria-label="Close lightbox"
            >
              Close ✕
            </button>

            {/* Previous button */}
            {lightboxIndex > 0 && (
              <button
                onClick={() => navigateLightbox(-1)}
                className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 font-mono text-2xl text-stage-muted hover:text-brass transition-colors p-4"
                aria-label="Previous photo"
              >
                ←
              </button>
            )}
            
            {/* Next button */}
            {lightboxIndex < allPhotosInDisplayOrder.length - 1 && (
              <button
                onClick={() => navigateLightbox(1)}
                className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 font-mono text-2xl text-stage-muted hover:text-brass transition-colors p-4"
                aria-label="Next photo"
              >
                →
              </button>
            )}

            {/* B8.5: Image with loading state and proper sizing */}
            <figure className="max-w-full max-h-full flex flex-col items-center justify-center">
              <div className="relative">
                <img
                  src={getPhotoSrc(lightboxPhoto, 'large')}
                  srcSet={getPhotoSrcSet(lightboxPhoto)}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1600px"
                  alt={lightboxPhoto.alt}
                  className="max-w-full max-h-[70dvh] object-contain"
                  width={lightboxPhoto.width}
                  height={lightboxPhoto.height}
                  loading="eager"
                  decoding="async"
                  onLoad={() => setLoading(false)}
                />
                {/* B8.5: Loading indicator */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-stage/50">
                    <div className="w-8 h-8 border-2 border-stage-muted border-t-brass rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* B8.5: Caption and counter in flex layout to prevent overlap */}
              <div className="mt-4 text-center max-w-md space-y-2">
                {lightboxPhoto.caption && (
                  <p className="font-sans text-sm text-stage-muted">
                    {lightboxPhoto.caption}
                  </p>
                )}
                {flags.SHOW_CAPTURE && lightboxPhoto.capture && (
                  <p className="font-mono text-[11px] text-stage-muted">
                    {[
                      lightboxPhoto.capture.focal,
                      lightboxPhoto.capture.aperture,
                      lightboxPhoto.capture.shutter,
                      lightboxPhoto.capture.iso ? `ISO ${lightboxPhoto.capture.iso}` : null,
                    ].filter(Boolean).join(' / ')}
                  </p>
                )}
                {/* B8.5: Counter */}
                <p className="font-mono text-[11px] text-stage-muted">
                  {lightboxIndex + 1} / {allPhotosInDisplayOrder.length}
                </p>
              </div>
            </figure>
          </div>
        )}
      </dialog>
    </section>
  );
}

// B8.2: Responsive justified rows with ResizeObserver
function JustifiedRows({ photos, onPhotoClick }: {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // B8.2: Measure container width with ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // B8.2: Breakpoint-based target height
  const targetHeight = useMemo(() => {
    if (containerWidth < 640) return 160; // Mobile
    if (containerWidth < 1024) return 220; // Tablet
    return 260; // Desktop
  }, [containerWidth]);

  // B8.2 & B8.3: Memoized row calculation
  const rows = useMemo(() => {
    if (containerWidth === 0) return [];

    const result: Photo[][] = [];
    let currentRow: Photo[] = [];
    let currentWidth = 0;
    const gap = 4;

    for (const photo of photos) {
      const [w, h] = getAspect(photo);
      const aspect = w / h;
      const photoWidth = aspect * targetHeight;
      
      currentRow.push(photo);
      currentWidth += photoWidth + gap;

      // B8.2: Fill width, max 4 photos per row
      if (currentWidth >= containerWidth || currentRow.length >= 4) {
        result.push([...currentRow]);
        currentRow = [];
        currentWidth = 0;
      }
    }
    
    // B8.2: Last row (don't justify, keep at target height)
    if (currentRow.length > 0) {
      result.push(currentRow);
    }

    return result;
  }, [photos, containerWidth, targetHeight]);

  // B8.2: Very narrow screens - single column
  if (containerWidth > 0 && containerWidth < 400) {
    return (
      <div ref={containerRef} className="flex flex-col gap-2">
        {photos.map((photo) => (
          <PhotoTile key={photo.id} photo={photo} onClick={onPhotoClick} />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {rows.map((row, rowIdx) => {
        const isLastRow = rowIdx === rows.length - 1;
        const totalAspect = row.reduce((sum, p) => {
          const [w, h] = getAspect(p);
          return sum + w / h;
        }, 0);
        
        // B8.2: Calculate row height to fill width exactly (except last row)
        let rowHeight = targetHeight;
        if (!isLastRow && containerWidth > 0) {
          const gapSpace = (row.length - 1) * 4;
          const availableWidth = containerWidth - gapSpace;
          rowHeight = availableWidth / totalAspect;
          
          // Cap maximum height
          rowHeight = Math.min(rowHeight, targetHeight * 1.2);
        }
        
        return (
          <div 
            key={rowIdx} 
            className={`flex gap-1 ${isLastRow ? 'justify-start' : ''}`}
            style={{ height: rowHeight }}
          >
            {row.map((photo) => {
              const [w, h] = getAspect(photo);
              const aspect = w / h;
              const flexGrow = aspect / totalAspect * row.length;
              
              return (
                <button
                  key={photo.id}
                  onClick={() => onPhotoClick(photo)}
                  className="relative overflow-hidden bg-surface cursor-pointer group focus-visible:outline-brass focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ flexGrow, flexBasis: 0 }}
                  aria-label={`View: ${photo.alt}`}
                >
                  {/* B8.6 & B8.7: Thumbnails with srcset, async decoding, transform-only transition */}
                  <img
                    src={getPhotoSrc(photo, 'thumbnail')}
                    srcSet={getPhotoSrcSet(photo)}
                    sizes={getPhotoSizes('thumbnail')}
                    alt={photo.alt}
                    className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-focus)] group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                    width={photo.width}
                    height={photo.height}
                  />
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// B8.7: Extracted photo tile for single-column layout
function PhotoTile({ photo, onClick }: {
  photo: Photo;
  onClick: (photo: Photo) => void;
}) {
  const [w, h] = getAspect(photo);
  
  return (
    <button
      onClick={() => onClick(photo)}
      className="relative overflow-hidden bg-surface cursor-pointer group focus-visible:outline-brass focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ aspectRatio: `${w}/${h}` }}
      aria-label={`View: ${photo.alt}`}
    >
      <img
        src={getPhotoSrc(photo, 'thumbnail')}
        srcSet={getPhotoSrcSet(photo)}
        sizes={getPhotoSizes('thumbnail')}
        alt={photo.alt}
        className="w-full h-full object-cover transition-transform duration-500 ease-[var(--ease-focus)] group-hover:scale-[1.03]"
        loading="lazy"
        decoding="async"
        width={photo.width}
        height={photo.height}
      />
    </button>
  );
}
