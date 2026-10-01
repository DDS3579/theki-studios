import { useEffect, useRef, useState, useCallback } from 'react';
import { StageRenderer, type Plane } from '../lib/stage/renderer';
import { circleOfConfusion, isFocusLocked } from '../lib/stage/focus';
import { cameraFor, createPointerParallax, updatePointerParallax, type PointerParallax } from '../lib/stage/camera';
import { computePlaneRect, getScreenRect } from '../lib/stage/layout';
import { buildJourney, getSegmentAt, getLocalProgress, type Segment } from '../lib/stage/journey';
import { capabilityStore, RuntimeLadder, type Capabilities, type RenderTier } from '../lib/gate';
import { ticker } from '../lib/ticker';
import { chapters, getFeaturedPhotos, copy, flags, getPhotoSrc, getAspect, type Chapter, type Photo } from '../content';

interface StageState {
  progress: number;
  segment: Segment;
  localProgress: number;
  chapter: Chapter;
  frameIndex: number;
  focusLocked: boolean;
  coc: number;
}

interface StageProps {
  onFailure: () => void;
}

export default function Stage({ onFailure }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const parallaxRef = useRef<PointerParallax>(createPointerParallax());
  const ladderRef = useRef<RuntimeLadder | null>(null);
  const stateRef = useRef<StageState>({
    progress: 0,
    segment: { type: 'title', chapter: 'weddings', startP: 0, endP: 0.1 },
    localProgress: 0,
    chapter: 'weddings',
    frameIndex: 0,
    focusLocked: true,
    coc: 0,
  });
  const journeyRef = useRef(buildJourney());
  const [stageState, setStageState] = useState<StageState>(stateRef.current);
  const [screenRect, setScreenRect] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [caps, setCaps] = useState<Capabilities>(() => capabilityStore.get());
  const targetProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  // B2.3: subscribe to capability changes
  useEffect(() => {
    const unsubscribe = capabilityStore.subscribe((newCaps) => {
      setCaps(newCaps);
      
      // B2.4: if stage mode is disabled, report failure
      if (!newCaps.stageMode) {
        onFailure();
      }
    });
    return unsubscribe;
  }, [onFailure]);

  // B2.2: initialize runtime ladder
  useEffect(() => {
    if (!caps.stageMode) return;

    ladderRef.current = new RuntimeLadder(caps.tier, (newTier) => {
      console.log('Runtime ladder downgrade to', newTier);
      
      // B2.4: if we hit static, report failure
      if (newTier === 'static') {
        onFailure();
        return;
      }

      // B2.1: update renderer quality
      if (rendererRef.current) {
        const newDpr = newTier === 'A0' ? 1.5 : newTier === 'A1' ? 1.25 : 1;
        const enableBlur = newTier !== 'A2';
        rendererRef.current.setQuality(newTier, newDpr, enableBlur);
      }
    });

    return () => {
      ladderRef.current = null;
    };
  }, [caps.stageMode, caps.tier, onFailure]);

  // Initialize renderer
  useEffect(() => {
    if (!caps.stageMode || !canvasRef.current) return;
    
    const renderer = new StageRenderer(canvasRef.current);
    rendererRef.current = renderer;

    // B2.4: check if renderer failed
    if (renderer.getState() === 'failed') {
      onFailure();
      return;
    }

    // B2.1: set initial quality
    renderer.setQuality(caps.tier, caps.dpr, caps.enableBlur);

    // B1.1/B1.3: load textures from local files
    const allPhotos = chapters.flatMap(ch => getFeaturedPhotos(ch));
    allPhotos.forEach(photo => renderer.loadTexture(photo.id, getPhotoSrc(photo, 'texture')));

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [caps.stageMode, caps.tier, caps.dpr, caps.enableBlur, onFailure]);

  // Scroll handler
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    const handleScroll = () => {
      const rect = container.getBoundingClientRect();
      const containerHeight = container.offsetHeight;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = containerHeight - viewportHeight;
      
      if (scrollableDistance <= 0) return;
      
      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      targetProgressRef.current = progress;
      
      // B2.8: wake ticker on scroll
      ticker.wake();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pointer parallax
  useEffect(() => {
    if (!caps.stageMode) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      parallaxRef.current = updatePointerParallax(parallaxRef.current, x, y, 0.016);
      
      // B2.8: wake ticker on pointer move
      ticker.wake();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [caps.stageMode]);

  // B2.8: subscribe to ticker for animation loop
  useEffect(() => {
    if (!caps.stageMode) return;

    const stiffness = 120;
    const damping = 30;
    let velocity = 0;

    const subscriber = {
      active: () => {
        // B2.8: active while progress is changing or pointer is moving
        const progressDiff = Math.abs(targetProgressRef.current - smoothProgressRef.current);
        return progressDiff > 0.001 || Math.abs(velocity) > 0.001;
      },
      update: (dt: number) => {
        const target = targetProgressRef.current;
        const current = smoothProgressRef.current;

        // Critically damped spring
        const force = stiffness * (target - current);
        const dampForce = -damping * velocity;
        velocity += (force + dampForce) * dt;
        const newProgress = current + velocity * dt;
        smoothProgressRef.current = Math.max(0, Math.min(1, newProgress));

        const journey = journeyRef.current;
        const segment = getSegmentAt(journey, smoothProgressRef.current);
        const localProgress = getLocalProgress(segment, smoothProgressRef.current);
        
        let focusDistance = 0;
        let currentCoc = 0;
        
        if (segment.type === 'frame' && segment.frameIndex !== undefined) {
          focusDistance = segment.frameIndex;
          currentCoc = 0;
        } else {
          focusDistance = -0.5;
          currentCoc = 0.5;
        }

        const locked = isFocusLocked(currentCoc);
        
        const newState: StageState = {
          progress: smoothProgressRef.current,
          segment,
          localProgress,
          chapter: segment.chapter,
          frameIndex: segment.frameIndex ?? 0,
          focusLocked: locked,
          coc: currentCoc,
        };

        stateRef.current = newState;
        setStageState(newState);

        // Render WebGL
        if (rendererRef.current && rendererRef.current.getState() === 'ready') {
          const camera = cameraFor(segment.chapter, localProgress, parallaxRef.current);
          
          // B2.1: limit planes based on tier
          const chapterPhotos = getFeaturedPhotos(segment.chapter);
          const maxPlanes = caps.maxPlanes;
          const planes: Plane[] = [];
          
          for (let i = 0; i < Math.min(chapterPhotos.length, maxPlanes); i++) {
            const photo = chapterPhotos[i];
            const stageAspect = window.innerWidth / window.innerHeight;
            const aspect = getAspect(photo);
            const rect = computePlaneRect(aspect, stageAspect, i, chapterPhotos.length);
            
            let opacity = 1;
            if (segment.type === 'frame' && segment.frameIndex !== undefined) {
              const dist = Math.abs(i - segment.frameIndex);
              opacity = dist === 0 ? 1 : Math.max(0, 1 - dist * 0.5);
            } else {
              opacity = 0.4;
            }

            planes.push({
              textureId: photo.id,
              z: i * 2.5,
              x: (rect.x - 0.5) * 3,
              y: 0,
              scaleX: rect.width * 3,
              scaleY: rect.height * 3,
              opacity,
            });
          }

          rendererRef.current.setPlanes(planes);
          
          // B2.2: get frame time for runtime ladder
          const frameTime = rendererRef.current.render(
            camera,
            focusDistance * 2.5,
            (z: number) => circleOfConfusion(z, focusDistance * 2.5, 4)
          );
          
          if (ladderRef.current) {
            ladderRef.current.recordFrame(frameTime);
          }
        }

        // Update screen rect for viewfinder
        if (segment.type === 'frame' && segment.frameIndex !== undefined) {
          const chapterPhotos = getFeaturedPhotos(segment.chapter);
          const photo = chapterPhotos[segment.frameIndex];
          if (photo && containerRef.current) {
            const stageRect = containerRef.current.getBoundingClientRect();
            const stageAspect = stageRect.width / stageRect.height;
            const aspect = getAspect(photo);
            const planeRect = computePlaneRect(aspect, stageAspect, segment.frameIndex, chapterPhotos.length);
            const sr = getScreenRect(planeRect, stageRect.width, stageRect.height);
            setScreenRect(sr);
          }
        }
      }
    };

    const unsubscribe = ticker.subscribe(subscriber, 0); // priority 0 (highest)
    return unsubscribe;
  }, [caps.stageMode, caps.maxPlanes]);

  const currentChapterPhotos = getFeaturedPhotos(stageState.chapter);
  const currentPhoto = stageState.segment.type === 'frame' && stageState.segment.frameIndex !== undefined
    ? currentChapterPhotos[stageState.segment.frameIndex]
    : null;

  const journey = journeyRef.current;
  const containerHeight = `${Math.max(journey.segments.length * 90, 400)}svh`;

  if (!caps.stageMode) return null;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ height: containerHeight }}
      id="work"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-stage">
        <canvas
          ref={canvasRef}
          className="stage-canvas"
          aria-hidden="true"
        />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {currentPhoto && screenRect.width > 0 && (
            <div
              className="absolute"
              style={{
                left: screenRect.left,
                top: screenRect.top,
                width: screenRect.width,
                height: screenRect.height,
              }}
            >
              <div className="vf-mark vf-mark-tl" />
              <div className="vf-mark vf-mark-tr" />
              <div className="vf-mark vf-mark-bl" />
              <div className="vf-mark vf-mark-br" />
            </div>
          )}

          <div className="absolute top-6 left-6 font-mono text-[11px] text-stage-muted tracking-[0.15em]">
            {stageState.chapter.toUpperCase()}{' '}
            {String((stageState.frameIndex || 0) + 1).padStart(2, '0')}
            /{String(currentChapterPhotos.length).padStart(2, '0')}
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-2">
            <div className={`focus-lock ${stageState.focusLocked ? 'locked' : 'hunting'}`} />
            <span className="font-mono text-[10px] text-stage-muted uppercase tracking-[0.15em]">
              {stageState.focusLocked ? 'Locked' : 'Hunting'}
            </span>
          </div>

          {flags.SHOW_CAPTURE && currentPhoto?.capture && (
            <div className="absolute bottom-20 left-6 font-mono text-[11px] text-stage-muted tracking-wide">
              {[
                currentPhoto.capture.focal,
                currentPhoto.capture.aperture,
                currentPhoto.capture.shutter,
                currentPhoto.capture.iso ? `ISO ${currentPhoto.capture.iso}` : null,
              ].filter(Boolean).join(' / ')}
            </div>
          )}
        </div>

        {stageState.segment.type === 'title' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <h2 className="title-card text-stage-text">
                {copy.chapters[stageState.chapter].title}
              </h2>
              <p className="mt-4 font-sans text-base text-stage-muted max-w-sm mx-auto">
                {copy.chapters[stageState.chapter].subtitle}
              </p>
            </div>
          </div>
        )}

        <nav className="absolute right-5 top-1/2 -translate-y-1/2 flex flex-col gap-4 pointer-events-auto" aria-label="Chapter progress">
          {chapters.map((ch) => (
            <a
              key={ch}
              href={`#chapter-${ch}`}
              className={`progress-tick ${stageState.chapter === ch ? 'active' : ''}`}
              aria-label={copy.chapters[ch].title}
              aria-current={stageState.chapter === ch ? 'step' : undefined}
            />
          ))}
        </nav>

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
      </div>

      {contactSheetOpen && (
        <ContactSheet
          chapter={stageState.chapter}
          photos={[...currentChapterPhotos]}
          onClose={() => setContactSheetOpen(false)}
        />
      )}

      <div className="sr-only">
        {chapters.map(ch => (
          <div key={ch} id={`chapter-${ch}`}>
            <h2>{copy.chapters[ch].title}</h2>
            <p>{copy.chapters[ch].subtitle}</p>
            {getFeaturedPhotos(ch).map(photo => (
              <figure key={photo.id}>
                <img src={getPhotoSrc(photo, 'thumbnail')} alt={photo.alt} />
              </figure>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactSheet({ chapter, photos, onClose }: {
  chapter: Chapter;
  photos: Photo[];
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    document.body.style.overflow = 'hidden';
    
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

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
              <p className="font-mono text-[10px] text-stage-muted uppercase tracking-[0.2em] mb-2">
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
                  alt={photo.alt}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={photo.width}
                  height={photo.height}
                />
                <div className="absolute bottom-1 left-1 font-mono text-[9px] text-stage-muted bg-stage/60 px-1">
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
