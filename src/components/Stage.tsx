import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { chapters, getFeaturedPhotos, copy, flags, getPhotoSrc, getAspect, type Chapter, type Photo } from '../content';
import { buildJourney, getSegmentAt, getLocalProgress } from '../lib/stage/journey';
import { computeFocusState, circleOfConfusion } from '../lib/stage/focus';
import { createPointerParallax, setParallaxTarget, easeParallax, cameraFor } from '../lib/stage/camera';
import { computePlaneRect, projectPlaneToScreen } from '../lib/stage/layout';
import { StageRenderer, STAGE_FOV } from '../lib/stage/renderer';
import { capabilityStore, RuntimeLadder } from '../lib/gate';
import { ticker } from '../lib/ticker';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

// Memoized HUD components to prevent unnecessary re-renders
const FrameCounter = memo(({ chapter, frameIndex, totalFrames }: { chapter: Chapter; frameIndex: number; totalFrames: number }) => (
  <div className="absolute top-6 left-6 font-mono text-[11px] text-stage-muted tracking-[0.15em]">
    {chapter.toUpperCase()}{' '}
    {String(frameIndex + 1).padStart(2, '0')}
    /{String(totalFrames).padStart(2, '0')}
  </div>
));

const FocusIndicator = memo(({ locked }: { locked: boolean }) => (
  <div className="absolute top-6 right-6 flex items-center gap-2">
    <div className={`focus-lock ${locked ? 'locked' : 'hunting'}`} />
    <span className="font-mono text-[11px] text-stage-muted uppercase tracking-[0.15em]">
      {locked ? 'Locked' : 'Hunting'}
    </span>
  </div>
));

const CaptureSettings = memo(({ photo }: { photo: Photo | null }) => {
  if (!flags.SHOW_CAPTURE || !photo?.capture) return null;
  const c = photo.capture;
  return (
    <div className="absolute bottom-20 left-6 font-mono text-[11px] text-stage-muted tracking-wide">
      {[c.focal, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null]
        .filter(Boolean).join(' / ')}
    </div>
  );
});

const ChapterTitle = memo(({ chapter, opacity }: { chapter: Chapter; opacity: number }) => (
  <div 
    className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300"
    style={{ opacity }}
  >
    <div className="text-center">
      <h2 className="title-card text-stage-text">
        {copy.chapters[chapter].title}
      </h2>
      <p className="mt-4 font-sans text-base text-stage-muted max-w-sm mx-auto">
        {copy.chapters[chapter].subtitle}
      </p>
    </div>
  </div>
));

const LoadingIndicator = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="text-center">
      <div className="font-mono text-[11px] text-stage-muted tracking-[0.15em] mb-2">
        Loading frames
      </div>
      <div className="w-32 h-0.5 bg-stage-muted/20 mx-auto overflow-hidden">
        <div className="h-full bg-brass animate-pulse" style={{ width: '30%' }} />
      </div>
    </div>
  </div>
));

// Scroll to chapter function
function scrollToChapter(container: HTMLElement, chapter: Chapter, instant = false) {
  const journey = buildJourney();
  const chapterRange = journey.chapterRanges.find(r => r.chapter === chapter);
  if (!chapterRange) return;

  const containerRect = container.getBoundingClientRect();
  const containerTop = containerRect.top + window.scrollY;
  const scrollableDistance = container.offsetHeight - window.innerHeight;
  const targetScroll = containerTop + chapterRange.startP * scrollableDistance;

  window.scrollTo({
    top: targetScroll,
    behavior: instant ? 'instant' : 'smooth'
  });
}

interface StageProps {
  onFailure: () => void;
}

export default function Stage({ onFailure }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const journeyRef = useRef(buildJourney());
  
  // Refs for continuous values (B5.1)
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const parallaxRef = useRef(createPointerParallax());
  const focusDepthRef = useRef(0);
  const blurRef = useRef(0);
  
  // Cached measurements (B5.6)
  const scrollMeasurementsRef = useRef({
    containerTop: 0,
    scrollableDistance: 0,
    stageWidth: 0,
    stageHeight: 0
  });
  
  // State only for discrete values (B5.1)
  const [currentChapter, setCurrentChapter] = useState<Chapter>('weddings');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isTitleSegment, setIsTitleSegment] = useState(false);
  const [focusLocked, setFocusLocked] = useState(true);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [titleOpacity, setTitleOpacity] = useState(0);
  
  // B10.7: Live region for chapter announcements
  const [announcement, setAnnouncement] = useState('');
  const previousChapterRef = useRef<Chapter>('weddings');
  
  // Visibility and animation state
  const isVisibleRef = useRef(true);
  const lastFrameTimeRef = useRef(performance.now());
  const ladderRef = useRef<RuntimeLadder | null>(null);
  const capsRef = useRef(capabilityStore.get());

  // Stable close handler for ContactSheet (B5.9)
  const closeContactSheet = useCallback(() => {
    setContactSheetOpen(false);
  }, []);

  // Update scroll measurements (B5.6)
  const updateScrollMeasurements = useCallback(() => {
    if (!containerRef.current || !stageRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const stageRect = stageRef.current.getBoundingClientRect();
    
    scrollMeasurementsRef.current = {
      containerTop: containerRect.top + window.scrollY,
      scrollableDistance: containerRef.current.offsetHeight - window.innerHeight,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height
    };
  }, []);

  // Compute progress from scroll position (B5.6)
  const updateProgressFromScroll = useCallback(() => {
    const { containerTop, scrollableDistance } = scrollMeasurementsRef.current;
    if (scrollableDistance <= 0) return;
    
    const currentScroll = window.scrollY;
    const scrolled = currentScroll - containerTop;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
    targetProgressRef.current = progress;
  }, []);

  // Initialize renderer and effects
  useEffect(() => {
    if (!canvasRef.current || !stageRef.current) return;
    
    const caps = capsRef.current;
    if (!caps.stageMode) {
      onFailure();
      return;
    }

    const renderer = new StageRenderer(canvasRef.current, caps.tier);
    rendererRef.current = renderer;

    if (renderer.getState() === 'failed') {
      onFailure();
      return;
    }

    renderer.setQuality(caps.tier, caps.dpr, caps.enableBlur);

    // Set up failure callback
    renderer.setOnTooManyFailures(() => {
      onFailure();
    });

    // Queue texture loads with priority
    chapters.forEach((chapter, chapterIndex) => {
      const chapterPhotos = getFeaturedPhotos(chapter);
      chapterPhotos.forEach(photo => {
        renderer.queueTextureLoad(
          photo.id,
          getPhotoSrc(photo, 'texture'),
          chapterIndex
        );
      });
    });

    // Check if first texture is loaded to hide loading indicator
    const checkLoading = () => {
      const firstChapter = chapters[0];
      const firstPhoto = getFeaturedPhotos(firstChapter)[0];
      if (firstPhoto && renderer.isTextureLoaded(firstPhoto.id)) {
        setLoading(false);
      } else {
        setTimeout(checkLoading, 100);
      }
    };
    checkLoading();

    // Initialize runtime ladder
    ladderRef.current = new RuntimeLadder(caps.tier, (newTier) => {
      if (newTier === 'static') {
        onFailure();
        return;
      }
      const newDpr = newTier === 'A0' ? 1.5 : newTier === 'A1' ? 1.25 : 1;
      const enableBlur = newTier !== 'A2';
      renderer.setQuality(newTier, newDpr, enableBlur);
    });

    // Initial measurements
    updateScrollMeasurements();
    updateProgressFromScroll();

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      ladderRef.current = null;
    };
  }, [onFailure, updateScrollMeasurements, updateProgressFromScroll]);

  // Subscribe to capability changes (B5.14)
  useEffect(() => {
    const unsubscribe = capabilityStore.subscribe((newCaps) => {
      capsRef.current = newCaps;
      if (!newCaps.stageMode) {
        onFailure();
      } else if (rendererRef.current) {
        rendererRef.current.setQuality(newCaps.tier, newCaps.dpr, newCaps.enableBlur);
      }
    });
    return unsubscribe;
  }, [onFailure]);

  // Scroll handler (B5.6)
  useEffect(() => {
    const handleScroll = () => {
      updateProgressFromScroll();
      ticker.wake();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateProgressFromScroll]);

  // Resize handler (B5.7)
  useEffect(() => {
    const handleResize = () => {
      updateScrollMeasurements();
      updateProgressFromScroll();
      ticker.wake();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateScrollMeasurements, updateProgressFromScroll]);

  // IntersectionObserver for visibility (B5.4)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
        if (entries[0].isIntersecting) {
          ticker.wake();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Pointer parallax handler (B5.13)
  useEffect(() => {
    if (!capsRef.current.stageMode || contactSheetOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      parallaxRef.current = setParallaxTarget(parallaxRef.current, x, y);
      ticker.wake();
    };

    const handlePointerLeave = () => {
      parallaxRef.current = setParallaxTarget(parallaxRef.current, 0, 0);
      ticker.wake();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [contactSheetOpen]);

  // Animation loop (B5.4, B5.5)
  useEffect(() => {
    if (!capsRef.current.stageMode) return;

    const subscriber = {
      active: () => isVisibleRef.current && !contactSheetOpen,
      update: (dt: number) => {
        if (!rendererRef.current || !stageRef.current || !viewfinderRef.current) return;

        // B5.15: Clamp elapsed time
        const clampedDt = Math.min(dt, 0.05);
        
        // B5.5: Frame-rate independent exponential smoothing
        const responseRate = 10; // responses per second
        const smoothFactor = 1 - Math.exp(-responseRate * clampedDt);
        const progressDiff = targetProgressRef.current - progressRef.current;
        progressRef.current += progressDiff * smoothFactor;

        // Reset velocity at clamps
        if (Math.abs(progressDiff) < 0.0001) {
          progressRef.current = targetProgressRef.current;
        }

        const journey = journeyRef.current;
        const segment = getSegmentAt(journey, progressRef.current);
        const chapterProgress = getLocalProgress(segment, progressRef.current);

        // Update discrete state only when changed (B5.1)
        if (segment.chapter !== currentChapter) {
          setCurrentChapter(segment.chapter);
          // B10.7: Announce chapter change to screen readers
          if (previousChapterRef.current !== segment.chapter) {
            setAnnouncement(`Now viewing ${copy.chapters[segment.chapter].title}`);
            previousChapterRef.current = segment.chapter;
            // Clear announcement after 3 seconds
            setTimeout(() => setAnnouncement(''), 3000);
          }
        }
        if (segment.type === 'title') {
          if (!isTitleSegment) setIsTitleSegment(true);
          setCurrentFrameIndex(0);
        } else {
          if (isTitleSegment) setIsTitleSegment(false);
          const frameIndex = segment.frameIndex ?? 0;
          if (frameIndex !== currentFrameIndex) {
            setCurrentFrameIndex(frameIndex);
          }
        }

        // Compute focus state
        const chapterPhotos = getFeaturedPhotos(segment.chapter);
        const totalFrames = chapterPhotos.length;
        const focusState = segment.type === 'title'
          ? { focusPosition: 0, focusedFrameIndex: 0, isRacking: false, rackProgress: 0 }
          : computeFocusState(chapterProgress, totalFrames);

        focusDepthRef.current = focusState.focusPosition;
        blurRef.current = circleOfConfusion(
          segment.type === 'frame' ? (segment.frameIndex ?? 0) : 0,
          focusState.focusPosition,
          1.0,
          1.5
        );

        const locked = blurRef.current < 0.15;
        if (locked !== focusLocked) {
          setFocusLocked(locked);
        }

        // B5.11: Title card opacity
        if (segment.type === 'title') {
          const titleProgress = chapterProgress;
          const opacity = titleProgress < 0.2 ? titleProgress / 0.2 : titleProgress > 0.8 ? (1 - titleProgress) / 0.2 : 1;
          setTitleOpacity(opacity);
        } else {
          if (titleOpacity !== 0) setTitleOpacity(0);
        }

        // Camera
        const camera = cameraFor(
          segment.chapter,
          chapterProgress,
          focusState.focusPosition,
          parallaxRef.current
        );

        // Build planes
        const { stageWidth, stageHeight } = scrollMeasurementsRef.current;
        const screenAspect = stageWidth / stageHeight;
        const maxPlanes = capsRef.current.maxPlanes;
        const planes = [];

        for (let i = 0; i < Math.min(chapterPhotos.length, maxPlanes); i++) {
          const photo = chapterPhotos[i];
          const [pw, ph] = getAspect(photo);
          const photoAspect = pw / ph;
          const planeDistance = camera.z - i * 2.5;
          if (planeDistance <= 0.1) continue;

          const rect = computePlaneRect(
            photoAspect,
            planeDistance,
            STAGE_FOV,
            screenAspect,
            i,
            chapterPhotos.length
          );

          let opacity = 1.0;
          const distFromFocus = Math.abs(i - focusState.focusPosition);
          if (distFromFocus > 3) {
            opacity *= Math.max(0, 1 - (distFromFocus - 3) * 0.3);
          }
          if (i < focusState.focusPosition - 0.5) {
            const passed = focusState.focusPosition - i - 0.5;
            opacity *= Math.max(0, 1 - passed * 0.5);
          }
          if (opacity < 0.01) continue;

          planes.push({
            textureId: photo.id,
            depth: i,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            opacity
          });
        }

        rendererRef.current.setPlanes(planes);
        const frameTime = rendererRef.current.render(camera, focusDepthRef.current, 2.5, clampedDt);

        if (ladderRef.current) {
          ladderRef.current.recordFrame(frameTime);
        }

        // B5.2: Update viewfinder rect directly via DOM (no React state)
        if (segment.type === 'frame' && (segment.frameIndex ?? 0) < chapterPhotos.length) {
          const frameIndex = segment.frameIndex ?? 0;
          const photo = chapterPhotos[frameIndex];
          const [pw, ph] = getAspect(photo);
          const photoAspect = pw / ph;
          const planeDistance = camera.z - frameIndex * 2.5;
          const planeRect = computePlaneRect(
            photoAspect,
            planeDistance,
            STAGE_FOV,
            screenAspect,
            frameIndex,
            chapterPhotos.length
          );

          const screenRect = projectPlaneToScreen(
            planeRect,
            camera.z,
            frameIndex * 2.5,
            STAGE_FOV,
            screenAspect,
            stageWidth,
            stageHeight
          );

          // Direct DOM manipulation (B5.2)
          if (viewfinderRef.current) {
            viewfinderRef.current.style.left = `${screenRect.left}px`;
            viewfinderRef.current.style.top = `${screenRect.top}px`;
            viewfinderRef.current.style.width = `${screenRect.width}px`;
            viewfinderRef.current.style.height = `${screenRect.height}px`;
          }
        }
      }
    };

    const unsubscribe = ticker.subscribe(subscriber, 0);
    return unsubscribe;
  }, [currentChapter, currentFrameIndex, isTitleSegment, focusLocked, titleOpacity, contactSheetOpen]);

  // Handle chapter hash on load (B5.8)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && chapters.includes(hash as Chapter)) {
      setTimeout(() => {
        if (containerRef.current) {
          scrollToChapter(containerRef.current, hash as Chapter, true);
        }
      }, 100);
    }
  }, []);

  // Scroll lock for contact sheet (B5.9)
  useEffect(() => {
    if (contactSheetOpen) {
      lockScroll();
    } else {
      unlockScroll();
    }
    return () => {
      if (contactSheetOpen) {
        unlockScroll();
      }
    };
  }, [contactSheetOpen]);

  const chapterPhotos = [...getFeaturedPhotos(currentChapter)];

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: `${journeyRef.current.totalWeight}svh` }}
      id="work"
    >
      <div
        ref={stageRef}
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-stage"
      >
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          aria-hidden="true"
        />

        {/* B10.7: Live region for chapter announcements */}
        {announcement && (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {announcement}
          </div>
        )}

        {/* Loading indicator (B5.12) */}
        {loading && <LoadingIndicator />}

        {/* Viewfinder overlay */}
        {!loading && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {/* Viewfinder marks (B5.2, B5.3) */}
            {!isTitleSegment && (
              <div
                ref={viewfinderRef}
                className="absolute"
                style={{
                  left: 0,
                  top: 0,
                  width: 0,
                  height: 0
                }}
              >
                <div className="vf-mark vf-mark-tl" />
                <div className="vf-mark vf-mark-tr" />
                <div className="vf-mark vf-mark-bl" />
                <div className="vf-mark vf-mark-br" />
              </div>
            )}

            {/* HUD (B5.11) */}
            {!isTitleSegment && (
              <>
                <FrameCounter
                  chapter={currentChapter}
                  frameIndex={currentFrameIndex}
                  totalFrames={chapterPhotos.length}
                />
                <FocusIndicator locked={focusLocked} />
                <CaptureSettings photo={chapterPhotos[currentFrameIndex] || null} />
              </>
            )}
          </div>
        )}

        {/* Chapter title (B5.11) */}
        {!loading && isTitleSegment && (
          <ChapterTitle chapter={currentChapter} opacity={titleOpacity} />
        )}

        {/* Progress rail (B5.8) */}
        <nav className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto" aria-label="Chapter progress">
          {chapters.map((ch) => (
            <button
              key={ch}
              onClick={() => {
                if (containerRef.current) {
                  scrollToChapter(containerRef.current, ch);
                }
              }}
              className={`group relative w-6 h-6 flex items-center justify-center`}
              aria-label={`Go to ${copy.chapters[ch].title}`}
            >
              <div className={`progress-tick ${currentChapter === ch ? 'active' : ''}`} />
              <span className="absolute right-8 font-mono text-[11px] text-stage-muted uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {copy.chapters[ch].title}
              </span>
            </button>
          ))}
        </nav>

        {/* Contact sheet button */}
        {!loading && (
          <button
            onClick={() => setContactSheetOpen(true)}
            className="absolute bottom-6 right-6 pointer-events-auto
              font-mono text-[11px] text-stage-muted uppercase tracking-[0.15em]
              border border-stage-muted/40 px-4 py-2
              hover:border-brass hover:text-brass
              transition-colors duration-200"
            aria-label="Open contact sheet"
          >
            Contact sheet
          </button>
        )}
      </div>

      {/* Contact Sheet (B5.9, B5.16) */}
      {contactSheetOpen && (
        <ContactSheet
          chapter={currentChapter}
          photos={chapterPhotos}
          onClose={closeContactSheet}
        />
      )}

      {/* B5.10: Hidden accessible content with lazy loading */}
      <div className="sr-only">
        {chapters.map(ch => {
          const photos = getFeaturedPhotos(ch);
          return (
            <section key={ch}>
              <ul aria-label={`${copy.chapters[ch].title} photos`}>
                {photos.map(photo => (
                  <li key={photo.id}>
                    <img
                      src={getPhotoSrc(photo, 'thumbnail')}
                      alt={photo.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ContactSheet component (B5.9, B5.16)
function ContactSheet({ chapter, photos, onClose }: {
  chapter: Chapter;
  photos: Photo[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Store trigger for focus return
    triggerRef.current = document.activeElement as HTMLButtonElement;
    
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }

    // Focus first focusable element
    setTimeout(() => {
      const closeButton = dialogRef.current?.querySelector('button');
      closeButton?.focus();
    }, 0);

    return () => {
      // Return focus to trigger (B5.9)
      triggerRef.current?.focus();
    };
  }, []);

  const handleDialogClose = () => {
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[60] bg-stage/97 w-full h-full p-0 m-0"
      onClose={handleDialogClose}
      aria-label={`Contact sheet for ${copy.chapters[chapter].title}`}
    >
      <div className="h-full overflow-auto p-6 md:p-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="font-mono text-[11px] text-stage-muted uppercase tracking-[0.2em] mb-2">
                Contact Sheet
              </p>
              <h3 className="font-display text-2xl md:text-3xl font-bold text-stage-text uppercase tracking-tight">
                {copy.chapters[chapter].title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="font-mono text-xs text-stage-muted uppercase tracking-widest
                hover:text-brass transition-colors p-2 border border-stage-muted/30"
              aria-label="Close contact sheet"
            >
              Close ✕
            </button>
          </div>
          
          {/* B5.16: Use thumbnails with srcset */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {photos.map((photo, i) => (
              <div key={photo.id} className="relative aspect-[3/2] bg-stage overflow-hidden group">
                <img
                  src={getPhotoSrc(photo, 'thumbnail')}
                  srcSet={`${getPhotoSrc(photo, 'thumbnail')} 800w, ${getPhotoSrc(photo, 'texture')} 1600w`}
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  width={getAspect(photo)[0]}
                  height={getAspect(photo)[1]}
                />
                <div className="absolute bottom-1 left-1 font-mono text-[11px] text-stage-muted bg-stage/60 px-1">
                  {String(i + 1).padStart(2, '0')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
