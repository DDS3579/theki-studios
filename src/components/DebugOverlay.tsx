import { type MutableRefObject, useRef, useEffect } from 'react';
import { type Chapter } from '../content';
import { type CameraState } from '../lib/stage/camera';
import { type StageRenderer } from '../lib/stage/renderer';
import { type RenderTier } from '../lib/gate';
import { PLANE_SPACING, FOCUS_DISTANCE } from '../lib/stage/constants';
import { ticker } from '../lib/ticker';

interface DebugOverlayProps {
  progressRef: MutableRefObject<number>;
  chapterRef: MutableRefObject<Chapter>;
  segmentTypeRef: MutableRefObject<'title' | 'frame'>;
  frameIndexRef: MutableRefObject<number>;
  focusRef: MutableRefObject<number>;
  isRackingRef: MutableRefObject<boolean>;
  cameraRef: MutableRefObject<CameraState>;
  rendererRef: MutableRefObject<StageRenderer | null>;
  tierRef: MutableRefObject<RenderTier>;
  dprRef: MutableRefObject<number>;
  planeCountRef: MutableRefObject<number>;
}

export function DebugOverlay({
  progressRef,
  chapterRef,
  segmentTypeRef,
  frameIndexRef,
  focusRef,
  isRackingRef,
  cameraRef,
  rendererRef,
  tierRef,
  dprRef,
  planeCountRef,
}: DebugOverlayProps) {
  // Only show in development with ?debug parameter
  if (!import.meta.env.DEV || !window.location.search.includes('debug')) {
    return null;
  }

  return (
    <DebugOverlayContent
      progressRef={progressRef}
      chapterRef={chapterRef}
      segmentTypeRef={segmentTypeRef}
      frameIndexRef={frameIndexRef}
      focusRef={focusRef}
      isRackingRef={isRackingRef}
      cameraRef={cameraRef}
      rendererRef={rendererRef}
      tierRef={tierRef}
      dprRef={dprRef}
      planeCountRef={planeCountRef}
    />
  );
}

function DebugOverlayContent({
  progressRef,
  chapterRef,
  segmentTypeRef,
  frameIndexRef,
  focusRef,
  isRackingRef,
  cameraRef,
  rendererRef,
  tierRef,
  dprRef,
  planeCountRef,
}: DebugOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const lastUpdateRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;

    const update = () => {
      const now = performance.now();
      
      // Update FPS counter
      frameCountRef.current++;
      if (now - lastFpsUpdateRef.current >= 1000) {
        fpsRef.current = frameCountRef.current;
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      // Update overlay at most 5 times per second (200ms interval)
      if (now - lastUpdateRef.current >= 200 && overlayRef.current) {
        lastUpdateRef.current = now;

        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        
        // Calculate plane distances and apparent heights
        const planeInfo = [];
        for (let i = 0; i < planeCountRef.current; i++) {
          const distance = camera.z + i * PLANE_SPACING;
          // Apparent height as percentage of screen height
          // At FOCUS_DISTANCE, height is 72% (landscape) or 78% (portrait)
          // Height scales inversely with distance
          const apparentHeight = (FOCUS_DISTANCE / distance) * 72;
          planeInfo.push({
            index: i,
            distance: distance.toFixed(2),
            height: apparentHeight.toFixed(1),
          });
        }

        // Build debug text
        const lines = [
          `Progress: ${(progressRef.current * 100).toFixed(1)}%`,
          `Chapter: ${chapterRef.current}`,
          `Segment: ${segmentTypeRef.current}`,
          `Frame: ${frameIndexRef.current}`,
          `Focus: ${focusRef.current.toFixed(2)}`,
          `Racking: ${isRackingRef.current ? 'YES' : 'NO'}`,
          ``,
          `Camera X: ${camera.x.toFixed(2)}`,
          `Camera Y: ${camera.y.toFixed(2)}`,
          `Camera Z: ${camera.z.toFixed(2)}`,
          `Camera Yaw: ${(camera.yaw * 180 / Math.PI).toFixed(1)}°`,
          ``,
          `Planes:`,
          ...planeInfo.map(p => `  #${p.index}: dist=${p.distance} height=${p.height}%`),
          ``,
          `Ticker: ${ticker.isRunning() ? 'RUNNING' : 'SLEEPING'}`,
          `FPS: ${fpsRef.current}`,
          `Renderer: ${renderer?.getState() || 'null'}`,
          `Textures: ${renderer ? getTextureStats(renderer) : 'N/A'}`,
          ``,
          `Tier: ${tierRef.current}`,
          `DPR: ${dprRef.current.toFixed(2)}`,
        ];

        overlayRef.current.textContent = lines.join('\n');
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [progressRef, chapterRef, segmentTypeRef, frameIndexRef, focusRef, isRackingRef, cameraRef, rendererRef, tierRef, dprRef, planeCountRef]);

  return (
    <div
      ref={overlayRef}
      className="fixed top-4 right-4 z-[9999] bg-black/90 text-green-400 font-mono text-xs p-4 rounded shadow-lg pointer-events-none whitespace-pre"
      style={{
        fontFamily: 'monospace',
        fontSize: '11px',
        lineHeight: '1.4',
        maxWidth: '400px',
      }}
    />
  );
}

function getTextureStats(_renderer: StageRenderer): string {
  // This is a simplified version - in a real implementation, we'd need to expose
  // texture stats from the renderer
  return 'loaded:?, failed:?';
}
