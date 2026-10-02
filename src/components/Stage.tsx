import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { chapters, getFeaturedPhotos, copy, flags, getPhotoSrc, getAspect, type Chapter, type Photo } from '../content';
import { buildJourney, getSegmentAt, getLocalProgress, getChapterProgress } from '../lib/stage/journey';
import { computeFocusFromSegment } from '../lib/stage/focus';
import { createPointerParallax, setParallaxTarget, easeParallax, cameraFor } from '../lib/stage/camera';
import { computeChapterLayout, type PlaneLayout } from '../lib/stage/layout';
import { StageRenderer, type Plane } from '../lib/stage/renderer';
import { capabilityStore, RuntimeLadder } from '../lib/gate';
import { ticker } from '../lib/ticker';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import {
  PLANE_SPACING,
  PROGRESS_EPSILON,
  PARALLAX_EPSILON,
  TITLE_FADE_IN_END,
  TITLE_FADE_OUT_START,
  GROUP_FADE_OUT_START,
} from '../lib/stage/constants';

// Memoized HUD components
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

// B12.4: Title card with ref-based opacity
const ChapterTitle = memo(({ chapter, titleRef }: { chapter: Chapter; titleRef: React.RefObject<HTMLDivElement> }) => (
  <div 
    ref={titleRef}
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    style={{ opacity: 0 }}
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
  const titleRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const journeyRef = useRef(buildJourney());
  
  // Refs for continuous values
  const progressRef = useRef(0);
  const targetProgressRef = useRef(0);
  const parallaxRef = useRef(createPointerParallax());
  const focusRef = useRef(0);
  
  // B12.5: Cached chapter layout
  const chapterLayoutRef = useRef<PlaneLayout[]>([]);
  const chapterPlanesRef = useRef<Plane[]>([]);
  const lastChapterRef = useRef<Chapter>('weddings');
  
  // Cached measurements
  const scrollMeasurementsRef = useRef({
    containerTop: 0,
    scrollableDistance: 0,
    stageWidth: 0,
    stageHeight: 0
  });
  
  // State only for discrete values
  const [currentChapter, setCurrentChapter] = useState<Chapter>('weddings');
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isTitleSegment, setIsTitleSegment] = useState(false);
  const [focusLocked, setFocusLocked] = useState(true);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // B12.7: Live region for announcements
  const [announcement, setAnnouncement] = useState('');
  const previousChapterRef = useRef<Chapter>('weddings');
  const announcementTimeoutRef = useRef<number | null>(null);
  
  // Visibility and animation state
  const isVisibleRef = useRef(true);
  const ladderRef = useRef<RuntimeLadder | null>(null);
  const capsRef = useRef(capabilityStore.get());
  const lastTickTimeRef = useRef(performance.now());

  const closeContactSheet = useCallback(() => {
    setContactSheetOpen(false);
  }, []);

  // B12.10: Update scroll measurements
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

  const updateProgressFromScroll = useCallback(() => {
    const { containerTop, scrollableDistance } = scrollMeasurementsRef.current;
    if (scrollableDistance <= 0) return;
    
    const currentScroll = window.scrollY;
    const scrolled = currentScroll - containerTop;
    const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
    targetProgressRef.current = progress;
  }, []);

  // B12.5: Build chapter planes once
  const buildChapterPlanes = useCallback((chapter: Chapter, stageWidth: number, stageHeight: number) => {
    const chapterPhotos = getFeaturedPhotos(chapter);
    const photoAspects = chapterPhotos.map(p => {
      const [w, h] = getAspect(p);
      return w / h;
    });
    
    const screenAspect = stageWidth / stageHeight;
    const layouts = computeChapterLayout(photoAspects, screenAspect);
    
    const planes: Plane[] = chapterPhotos.map((photo, i) => ({
      textureId: photo.id,
      index: i,
      layout: layouts[i],
    }));
    
    chapterLayoutRef.current = layouts;
    chapterPlanesRef.current = planes;
    
    if (rendererRef.current) {
      rendererRef.current.setPlanes(planes);
    }
  }, []);

  // Initialize renderer
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

    // B12.7: Callback when first texture is ready
    renderer.setOnFirstTextureReady(() => {
      setLoading(false);
    });

    renderer.setOnTooManyFailures(() => {
      onFailure();
    });

    // Queue texture loads
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

    updateScrollMeasurements();
    updateProgressFromScroll();

    // B12.5: Build initial chapter planes
    const { stageWidth, stageHeight } = scrollMeasurementsRef.current;
    if (stageWidth > 0 && stageHeight > 0) {
      buildChapterPlanes('weddings', stageWidth, stageHeight);
    }

    return () => {
      renderer.dispose();
      rendererRef.current = null;
      // B12.39: Dispose ladder to clean up listener
      if (ladderRef.current) {
        ladderRef.current.dispose();
      }
      ladderRef.current = null;
    };
  }, [onFailure, updateScrollMeasurements, updateProgressFromScroll, buildChapterPlanes]);

  // Subscribe to capability changes
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

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      updateProgressFromScroll();
      ticker.wake();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [updateProgressFromScroll]);

  // B12.10: Resize handler with multiple triggers
  useEffect(() => {
    const handleResize = () => {
      updateScrollMeasurements();
      updateProgressFromScroll();
      ticker.wake();
    };

    window.addEventListener('resize', handleResize);
    
    // B12.10: Also re-measure on load and fonts-ready
    const on_load = () => {
      updateScrollMeasurements();
      ticker.wake();
    };
    window.addEventListener('load', on_load);
    
    document.fonts.ready.then(() => {
      updateScrollMeasurements();
      ticker.wake();
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', on_load);
    };
  }, [updateScrollMeasurements, updateProgressFromScroll]);

  // B12.9: Visibility observer with threshold 0
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0].isIntersecting;
        if (entries[0].isIntersecting) {
          ticker.wake();
        }
      },
      { threshold: 0 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // B12.6: Pointer parallax with proper easing
  useEffect(() => {
    if (!capsRef.current.stageMode || contactSheetOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      parallaxRef.current = setParallaxTarget(parallaxRef.current, x, y);
      ticker.wake();
    };

    // B12.6: Reset on mouseleave, blur, modal open
    const handlePointerLeave = () => {
      parallaxRef.current = setParallaxTarget(parallaxRef.current, 0, 0);
      ticker.wake();
    };

    const handleBlur = () => {
      parallaxRef.current = setParallaxTarget(parallaxRef.current, 0, 0);
      ticker.wake();
    };

    window.addEventListener('pointermove', handlePointerMove);
    document.documentElement.addEventListener('mouseleave', handlePointerLeave);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      document.documentElement.removeEventListener('mouseleave', handlePointerLeave);
      window.removeEventListener('blur', handleBlur);
    };
  }, [contactSheetOpen]);

  // B12.3, B12.4, B12.5, B12.13: Animation loop with all fixes
  useEffect(() => {
    if (!capsRef.current.stageMode) return;

    const subscriber = {
      active: () => {
        if (!isVisibleRef.current || contactSheetOpen) return false;
        
        // B12.3: Only active while something is moving
        const progressDiff = Math.abs(targetProgressRef.current - progressRef.current);
        const parallaxDiff = Math.abs(parallaxRef.current.target.x - parallaxRef.current.current.x) +
                            Math.abs(parallaxRef.current.target.y - parallaxRef.current.current.y) +
                            Math.abs(parallaxRef.current.target.yaw - parallaxRef.current.current.yaw);
        
        // B12.33: Also check if renderer needs frames (fade-in, texture load, resize)
        const rendererNeedsFrames = rendererRef.current?.needsFrames() ?? false;
        
        return progressDiff > PROGRESS_EPSILON || 
               parallaxDiff > PARALLAX_EPSILON ||
               rendererNeedsFrames;
      },
      update: (dt: number) => {
        try {
          if (!rendererRef.current || !stageRef.current) return;

          // B12.8: Real frame time for ladder
          const now = performance.now();
          const realDt = (now - lastTickTimeRef.current) / 1000;
          lastTickTimeRef.current = now;

          // Frame-rate independent smoothing
          const responseRate = 10;
          const smoothFactor = 1 - Math.exp(-responseRate * dt);
          const progressDiff = targetProgressRef.current - progressRef.current;
          progressRef.current += progressDiff * smoothFactor;

          if (Math.abs(progressDiff) < PROGRESS_EPSILON) {
            progressRef.current = targetProgressRef.current;
          }

          const journey = journeyRef.current;
          const segment = getSegmentAt(journey, progressRef.current);
          
          // B12.2: Segment-based focus
          const chapterPhotos = getFeaturedPhotos(segment.chapter);
          const isLastFrame = segment.type === 'frame' && 
                             segment.frameIndex === chapterPhotos.length - 1;
          const localProgress = getLocalProgress(segment, progressRef.current);
          
          const focusState = computeFocusFromSegment(
            segment.type,
            segment.type === 'frame' ? (segment.frameIndex ?? 0) : 0,
            localProgress,
            isLastFrame
          );
          
          focusRef.current = focusState.f;

          // B12.2: Chapter progress for camera moves
          const chapterProgress = getChapterProgress(journey, segment.chapter, progressRef.current);

          // B12.6: Ease parallax
          parallaxRef.current = easeParallax(parallaxRef.current, dt);

          // Camera
          const camera = cameraFor(
            segment.chapter,
            focusState.f,
            chapterProgress,
            parallaxRef.current
          );

          // B12.11: Group opacity
          let groupOpacity = 1;
          if (segment.type === 'title') {
            if (localProgress < TITLE_FADE_IN_END) {
              groupOpacity = (localProgress / TITLE_FADE_IN_END) * 0.35;
            } else if (localProgress > TITLE_FADE_OUT_START) {
              const t = (localProgress - TITLE_FADE_OUT_START) / (1 - TITLE_FADE_OUT_START);
              groupOpacity = 0.35 + t * 0.65;
            } else {
              groupOpacity = 0.35;
            }
          } else if (segment.type === 'frame' && 
                     segment.frameIndex === chapterPhotos.length - 1 &&
                     localProgress > GROUP_FADE_OUT_START) {
            const t = (localProgress - GROUP_FADE_OUT_START) / (1 - GROUP_FADE_OUT_START);
            groupOpacity = 1 - t;
          }

          // B12.11: Title opacity
          let titleOpacity = 0;
          if (segment.type === 'title') {
            if (segment.chapter === 'weddings' && progressRef.current < 0.01) {
              titleOpacity = 1; // First chapter starts at 1
            } else if (localProgress < TITLE_FADE_IN_END) {
              titleOpacity = localProgress / TITLE_FADE_IN_END;
            } else if (localProgress > TITLE_FADE_OUT_START) {
              titleOpacity = 1 - (localProgress - TITLE_FADE_OUT_START) / (1 - TITLE_FADE_OUT_START);
            } else {
              titleOpacity = 1;
            }
          }

          // B12.4: Apply title opacity via ref
          if (titleRef.current) {
            titleRef.current.style.opacity = String(titleOpacity);
          }

          // Update discrete state only when changed
          if (segment.chapter !== currentChapter) {
            setCurrentChapter(segment.chapter);
            lastChapterRef.current = segment.chapter;
            
            // B12.5: Rebuild planes for new chapter
            const { stageWidth, stageHeight } = scrollMeasurementsRef.current;
            buildChapterPlanes(segment.chapter, stageWidth, stageHeight);
            
            // B12.7: Announce chapter change
            if (previousChapterRef.current !== segment.chapter) {
              setAnnouncement(`Now viewing ${copy.chapters[segment.chapter].title}`);
              previousChapterRef.current = segment.chapter;
              if (announcementTimeoutRef.current) {
                clearTimeout(announcementTimeoutRef.current);
              }
              announcementTimeoutRef.current = window.setTimeout(() => setAnnouncement(''), 3000);
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
          
          if (focusState.isLocked !== focusLocked) {
            setFocusLocked(focusState.isLocked);
          }

          // B12.5: Render with focus and group opacity
          rendererRef.current.render(camera, focusState.f, groupOpacity);

          if (ladderRef.current) {
            ladderRef.current.recordFrame(realDt * 1000);
          }

          // B12.25: Update viewfinder using renderer's projection (uses cached matrices)
          if (viewfinderRef.current && segment.type === 'frame' && !loading && rendererRef.current) {
            const frameIndex = segment.frameIndex ?? 0;
            
            // Interpolate between current and next photo during rack
            let viewScreenRect;
            if (focusState.isRacking && frameIndex < chapterPhotos.length - 1) {
              const nextIndex = frameIndex + 1;
              const currentLayout = chapterLayoutRef.current[frameIndex];
              const nextLayout = chapterLayoutRef.current[nextIndex];
              
              if (currentLayout && nextLayout) {
                const t = focusState.f - frameIndex;
                const interpLayout: PlaneLayout = {
                  x: currentLayout.x + (nextLayout.x - currentLayout.x) * t,
                  y: currentLayout.y + (nextLayout.y - currentLayout.y) * t,
                  width: currentLayout.width + (nextLayout.width - currentLayout.width) * t,
                  height: currentLayout.height + (nextLayout.height - currentLayout.height) * t,
                };
                
                // B12.20: Correct distance formula: camera.z + index * PLANE_SPACING
                const photoZ = -(frameIndex + t) * PLANE_SPACING;
                viewScreenRect = rendererRef.current.projectPlaneToScreen(interpLayout, photoZ);
              }
            } else {
              const layout = chapterLayoutRef.current[frameIndex];
              if (layout) {
                // B12.20: Correct distance formula
                const photoZ = -frameIndex * PLANE_SPACING;
                viewScreenRect = rendererRef.current.projectPlaneToScreen(layout, photoZ);
              }
            }
            
            if (viewScreenRect && viewfinderRef.current) {
              // Only update if changed by more than 0.5px (avoid sub-pixel jitter)
              const currentLeft = parseFloat(viewfinderRef.current.style.left) || 0;
              const currentTop = parseFloat(viewfinderRef.current.style.top) || 0;
              const currentWidth = parseFloat(viewfinderRef.current.style.width) || 0;
              const currentHeight = parseFloat(viewfinderRef.current.style.height) || 0;
              
              if (
                Math.abs(viewScreenRect.left - currentLeft) > 0.5 ||
                Math.abs(viewScreenRect.top - currentTop) > 0.5 ||
                Math.abs(viewScreenRect.width - currentWidth) > 0.5 ||
                Math.abs(viewScreenRect.height - currentHeight) > 0.5
              ) {
                viewfinderRef.current.style.left = `${viewScreenRect.left}px`;
                viewfinderRef.current.style.top = `${viewScreenRect.top}px`;
                viewfinderRef.current.style.width = `${viewScreenRect.width}px`;
                viewfinderRef.current.style.height = `${viewScreenRect.height}px`;
              }
            }
          }
        } catch (err) {
          // B12.13: Catch errors in loop
          console.error('Stage loop error:', err);
          onFailure();
        }
      },
      onError: (err: Error) => {
        // B12.45: Handle ticker errors
        console.error('Stage ticker error:', err);
        onFailure();
      }
    };

    const unsubscribe = ticker.subscribe(subscriber, 0);
    return () => {
      unsubscribe();
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []); // B12.4: Empty deps, subscribe once

  // Handle chapter hash on load
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

  // B12.12: Scroll lock coordination
  useEffect(() => {
    if (contactSheetOpen) {
      lockScroll('contactSheet');
    }
    
    return () => {
      if (contactSheetOpen) {
        unlockScroll('contactSheet');
      }
    };
  }, [contactSheetOpen]);

  // B12.14: Memoize chapter photos
  const chapterPhotos = useRef(getFeaturedPhotos(currentChapter)).current;

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

        {/* B12.7: Live region for announcements */}
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

        {/* Loading indicator */}
        {loading && <LoadingIndicator />}

        {/* B12.1: Viewfinder always mounted, hidden with opacity */}
        <div
          ref={viewfinderRef}
          className="absolute pointer-events-none"
          style={{
            opacity: !loading && !isTitleSegment ? 1 : 0,
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          }}
          aria-hidden="true"
        >
          <div className="vf-mark vf-mark-tl" />
          <div className="vf-mark vf-mark-tr" />
          <div className="vf-mark vf-mark-bl" />
          <div className="vf-mark vf-mark-br" />
        </div>

        {/* HUD */}
        {!loading && !isTitleSegment && (
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

        {/* B12.4: Title card with ref */}
        {!loading && isTitleSegment && (
          <ChapterTitle chapter={currentChapter} titleRef={titleRef} />
        )}

        {/* Progress rail */}
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
              aria-current={currentChapter === ch ? 'step' : undefined}
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

      {/* Contact Sheet */}
      {contactSheetOpen && (
        <ContactSheet
          chapter={currentChapter}
          photos={[...chapterPhotos]}
          onClose={closeContactSheet}
        />
      )}

      {/* B12.14: Screen-reader content as text, not images */}
      <div className="sr-only">
        {chapters.map(ch => {
          const photos = getFeaturedPhotos(ch);
          return (
            <section key={ch}>
              <ul aria-label={`${copy.chapters[ch].title} photos`}>
                {photos.map(photo => (
                  <li key={photo.id}>{photo.alt}</li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ContactSheet component
function ContactSheet({ chapter, photos, onClose }: {
  chapter: Chapter;
  photos: Photo[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    }
    lockScroll('contactSheetDialog');
    
    return () => {
      unlockScroll('contactSheetDialog');
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-[60] bg-stage/97 w-full h-full p-0 m-0"
      onClose={onClose}
      role="dialog"
      aria-modal="true"
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
