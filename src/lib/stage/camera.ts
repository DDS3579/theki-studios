// Camera system: follows focus position with chapter-specific movements
// B3.2: Uses chapter progress, not segment progress
// B3.3: Camera follows focus position continuously

import type { Chapter } from '../../content';

export interface CameraState {
  x: number;
  y: number;
  z: number; // Distance from origin (positive = in front of camera)
  yaw: number;
  pitch: number;
  targetDepth: number; // The depth position the camera is focused on
}

export interface PointerParallax {
  yaw: number;
  offsetX: number;
  offsetY: number;
}

// B3.9: Split parallax into target setting and per-frame easing
export function createPointerParallax(): PointerParallax {
  return { yaw: 0, offsetX: 0, offsetY: 0 };
}

// B3.9: Set target from pointer position (called on pointer move)
export function setParallaxTarget(
  _parallax: PointerParallax,
  pointerX: number, // -1 to 1
  pointerY: number  // -1 to 1
): PointerParallax {
  const maxYaw = 0.05; // radians
  const maxOffset = 0.3; // world units
  
  return {
    yaw: pointerX * maxYaw,
    offsetX: pointerX * maxOffset,
    offsetY: pointerY * maxOffset,
  };
}

// B3.9: Ease toward target (called every frame)
export function easeParallax(
  current: PointerParallax,
  target: PointerParallax,
  dt: number
): PointerParallax {
  const smoothing = 0.08; // Lower = smoother
  const factor = 1 - Math.pow(smoothing, dt);
  
  return {
    yaw: current.yaw + (target.yaw - current.yaw) * factor,
    offsetX: current.offsetX + (target.offsetX - current.offsetX) * factor,
    offsetY: current.offsetY + (target.offsetY - current.offsetY) * factor,
  };
}



// B3.2 & B3.3: Camera follows focus position with chapter-specific movements
export function cameraFor(
  chapter: Chapter,
  chapterProgress: number, // 0-1 progress within the chapter
  focusDepth: number, // The depth position being focused on
  parallax: PointerParallax
): CameraState {
  // Base distance: camera sits slightly in front of the focused plane
  const baseDistance = focusDepth + 2.0; // 2 units in front of focus
  
  // Chapter-specific movements are small offsets on top of base
  switch (chapter) {
    case 'weddings': {
      // Slow dolly in along Z with longest focus pulls
      const dollyOffset = chapterProgress * 0.5; // Subtle dolly
      return {
        x: parallax.offsetX,
        y: parallax.offsetY,
        z: baseDistance - dollyOffset,
        yaw: parallax.yaw,
        pitch: 0,
        targetDepth: focusDepth,
      };
    }
    
    case 'cars': {
      // Lateral track along X, planes at staggered depths
      const trackOffset = (chapterProgress - 0.5) * 1.0; // Track left to right
      return {
        x: parallax.offsetX + trackOffset,
        y: parallax.offsetY,
        z: baseDistance,
        yaw: parallax.yaw,
        pitch: 0,
        targetDepth: focusDepth,
      };
    }
    
    case 'photoshoots': {
      // B3.8 & B3.13: Arc around focused plane, wrapped in block
      const arcAngle = (chapterProgress - 0.5) * 0.3; // ±15 degrees max
      const orbitRadius = 0.5; // Small orbit around focus
      
      return {
        x: parallax.offsetX + Math.sin(arcAngle) * orbitRadius,
        y: parallax.offsetY,
        z: baseDistance + Math.cos(arcAngle) * orbitRadius - orbitRadius,
        yaw: parallax.yaw - arcAngle, // Orbit direction
        pitch: 0,
        targetDepth: focusDepth,
      };
    }
    
    default:
      return {
        x: parallax.offsetX,
        y: parallax.offsetY,
        z: baseDistance,
        yaw: parallax.yaw,
        pitch: 0,
        targetDepth: focusDepth,
      };
  }
}
