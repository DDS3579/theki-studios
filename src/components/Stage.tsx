import { useEffect, useRef, useState, useCallback } from 'react';
import { StageRenderer, STAGE_FOV, type Plane } from '../lib/stage/renderer';
import { computeFocusState, circleOfConfusion, isFocusLocked } from '../lib/stage/focus';
import { cameraFor, createPointerParallax, setParallaxTarget, easeParallax, resetParallax, type PointerParallax } from '../lib/stage/camera';
import { computePlaneRect, projectPlaneToScreen } from '../lib/stage/layout';
import { buildJourney, getSegmentAt, getChapterProgress, type Segment } from '../lib/stage/journey';
import { capabilityStore, RuntimeLadder, type Capabilities } from '../lib/gate';
import { ticker } from '../lib/ticker';
import { chapters, getFeaturedPhotos, copy, flags, getPhotoSrc, getAspect, type Chapter, type Photo } from '../content';

const PLANE_SPACING = 2.5; // Distance between planes in world units

interface StageState {
  progress: number;
  segment: Segment;
  chapter: Chapter;
  chapterProgress: number;
  frameIndex: number;
  focusLocked: boolean;
  blur: number;
}

interface StageProps {
  onFailure: () => void;
}

export default function Stage({ onFailure }: StageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<StageRenderer | null>(null);
  const parallaxTargetRef = useRef<PointerParallax>(createPointerParallax());
  const parallaxCurrentRef = useRef<PointerParallax>(createPointerParallax());
  const ladderRef = useRef<RuntimeLadder | null>(null);
  const stateRef = useRef<StageState>({
    progress: 0,
    segment: { type: 'title', chapter: 'weddings', startP: 0, endP: 0.1 },
    chapter: 'weddings',
    chapterProgress: 0,
    frameIndex: 0,
    focusLocked: true,
    blur: 0,
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
      if (newTier === 'static') {
        onFailure();
        return;
      }
      if (rendererRef.current) {
        const newDpr = newTier === 'A0' ? 1.5 : newTier === 'A1' ? 1.25 : 1;
        const enableBlur = newTier !== 'A2';
        rendererRef.current.setQuality(newTier, newDpr, enableBlur);
      }
    });

    return () => { ladderRef.current = null; };
  }, [caps.stageMode, caps.tier, onFailure]);

  // Initialize renderer
  useEffect(() => {
    if (!caps.stageMode || !canvasRef.current) return;
    
    const renderer = new StageRenderer(canvasRef.current);
    rendererRef.current = renderer;

    if (renderer.getState() === 'failed') {
      onFailure();
      return;
    }

    renderer.setQuality(caps.tier, caps.dpr, caps.enableBlur);

    const allPhotos = chapters.flatMap(ch => getFeaturedPhotos(ch));
    allPhotos.forEach(photo => renderer.loadTexture(photo.id, getPhotoSrc(photo, 'texture')));

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [caps.stageMode, caps.tier, caps.dpr, caps.enableBlur, onFailure]);

  // B3.10: Container height from journey total weight
  const containerHeight = `${journeyRef.current.totalWeight}svh`;

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
      ticker.wake();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // B3.9: Pointer parallax - set target on move, ease per frame
  useEffect(() => {
    if (!caps.stageMode) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      parallaxTargetRef.current = setParallaxTarget(parallaxTargetRef.current, x, y);
      ticker.wake();
    };
    
    const handlePointerLeave = () => {
      parallaxTargetRef.current = resetParallax();
      ticker.wake();
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [caps.stageMode]);

  // B2.8: Subscribe to ticker for animation loop
  useEffect(() => {
    if (!caps.stageMode) return;

    const stiffness = 120;
    const damping = 30;
    let velocity = 0;

    const subscriber = {
      active: () => {
        const progressDiff = Math.abs(targetProgressRef.current - smoothProgressRef.current);
        const parallaxDiff = Math.abs(parallaxTargetRef.current.yaw - parallaxCurrentRef.current.yaw);
        return progressDiff > 0.0001 || Math.abs(velocity) > 0.0001 || parallaxDiff > 0.0001;
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
        
        // B3.2: Get chapter progress (continuous across whole chapter)
        const chapterProgress = getChapterProgress(journey, segment.chapter, smoothProgressRef.current);
        
        // B3.4: Compute focus state from chapter progress
        const chapterPhotos = getFeaturedPhotos(segment.chapter);
        const totalFrames = chapterPhotos.length;
        
        let focusState;
        let frameIndex: number;
        
        if (segment.type === 'title') {
          // B3.4: During title, focus softly on first frame
          focusState = {
            focusPosition: 0,
            focusedFrameIndex: 0,
            isRacking: false,
            rackProgress: 0,
          };
          frameIndex = 0;
        } else {
          focusState = computeFocusState(chapterProgress, totalFrames);
          frameIndex = segment.frameIndex ?? 0;
        }
        
        const focusDepth = focusState.focusPosition;
        const blur = circleOfConfusion(frameIndex, focusDepth, 1.0, 1.5);
        const locked = isFocusLocked(blur);
        
        // B3.9: Ease parallax per frame
        parallaxCurrentRef.current = easeParallax(
          parallaxCurrentRef.current,
          parallaxTargetRef.current,
          dt
        );
        
        // B3.3: Camera follows focus position
        const camera = cameraFor(
          segment.chapter,
          chapterProgress,
          focusDepth,
          parallaxCurrentRef.current
        );
        
        const newState: StageState = {
          progress: smoothProgressRef.current,
          segment,
          chapter: segment.chapter,
          chapterProgress,
          frameIndex,
          focusLocked: locked,
          blur,
        };

        stateRef.current = newState;
        setStageState(newState);

        // Render WebGL
        if (rendererRef.current && rendererRef.current.getState() === 'ready') {
          // Build planes in world units
          const maxPlanes = caps.maxPlanes;
          const screenAspect = window.innerWidth / window.innerHeight;
          const planes: Plane[] = [];
          
          for (let i = 0; i < Math.min(chapterPhotos.length, maxPlanes); i++) {
            const photo = chapterPhotos[i];
            const [pw, ph] = getAspect(photo);
            const photoAspect = pw / ph;
            
            // B3.5: Compute plane rect in world units at this plane's distance
            const planeDistance = camera.z - i * PLANE_SPACING;
            if (planeDistance <= 0.1) continue; // Behind camera
            
            const rect = computePlaneRect(
              photoAspect,
              planeDistance,
              STAGE_FOV,
              screenAspect,
              i,
              chapterPhotos.length
            );
            
            // B3.11: Compute opacity with fade
            let opacity = 1.0;
            const distFromFocus = Math.abs(i - focusDepth);
            
            // Fade far planes
            if (distFromFocus > 3) {
              opacity *= Math.max(0, 1 - (distFromFocus - 3) * 0.3);
            }
            
            // Fade near planes (already passed)
            if (i < focusDepth - 0.5) {
              const passed = focusDepth - i - 0.5;
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
              opacity,
            });
          }

          rendererRef.current.setPlanes(planes);
          
          // B3.4: Blur function based on focus depth
          const blurFn = (depth: number) => circleOfConfusion(depth, focusDepth, 1.0, 1.5);
          
          const frameTime = rendererRef.current.render(camera, blurFn, PLANE_SPACING);
          
          if (ladderRef.current) {
            ladderRef.current.recordFrame(frameTime);
          }
          
          // B3.7: Update viewfinder rect from renderer matrices
          const matrices = rendererRef.current.getLastMatrices();
          if (matrices && containerRef.current) {
            const stageRect = containerRef.current.getBoundingClientRect();
            const focusedPhoto = chapterPhotos[frameIndex];
            if (focusedPhoto) {
              const [pw, ph] = getAspect(focusedPhoto);
              const photoAspect = pw / ph;
              const planeDistance = camera.z - frameIndex * PLANE_SPACING;
              const planeRect = computePlaneRect(
                photoAspect,
                planeDistance,
                STAGE_FOV,
                screenAspect,
                frameIndex,
                chapterPhotos.length
              );
              
              const sr = projectPlaneToScreen(
                planeRect,
                camera.z,
                frameIndex * PLANE_SPACING,
                STAGE_FOV,
                stageRect.width / stageRect.height,
                stageRect.width,
                stageRect.height
              );
              setScreenRect(sr);
            }
          }
        }
      }
    };

    const unsubscribe = ticker.subscribe(subscriber, 0);
    return unsubscribe;
  }, [caps.stageMode, caps.maxPlanes]);

  const currentChapterPhotos = getFeaturedPhotos(stageState.chapter);

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
          {screenRect.width > 0 && (
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

          {flags.SHOW_CAPTURE && currentChapterPhotos[stageState.frameIndex]?.capture && (
            <div className="absolute bottom-20 left-6 font-mono text-[11px] text-stage-muted tracking-wide">
              {(() => {
                const c = currentChapterPhotos[stageState.frameIndex].capture!;
                return [c.focal, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null]
                  .filter(Boolean).join(' / ');
              })()}
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
