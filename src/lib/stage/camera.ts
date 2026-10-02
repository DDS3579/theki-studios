// Camera system - new coordinate system
// Camera looks down negative z, photos at negative z positions
import type { Chapter } from '../../content';
import { FOCUS_DISTANCE, PLANE_SPACING, WEDDINGS_DOLLY, CARS_TRACK, PHOTOSHOOTS_ARC } from './constants';

export interface CameraState {
  x: number;
  y: number;
  z: number; // Camera world z position
  yaw: number;
  pitch: number;
}

export interface PointerParallax {
  target: { x: number; y: number; yaw: number };
  current: { x: number; y: number; yaw: number };
}

// Create initial parallax state
export function createPointerParallax(): PointerParallax {
  return {
    target: { x: 0, y: 0, yaw: 0 },
    current: { x: 0, y: 0, yaw: 0 },
  };
}

// Set parallax target from pointer position
export function setParallaxTarget(
  current: PointerParallax,
  pointerX: number, // -1 to 1
  pointerY: number  // -1 to 1
): PointerParallax {
  const maxYaw = 0.05; // radians
  const maxOffset = 0.3; // world units
  
  return {
    target: {
      yaw: pointerX * maxYaw,
      x: pointerX * maxOffset,
      y: pointerY * maxOffset,
    },
    current: current.current,
  };
}

// Ease parallax toward target (called every frame)
export function easeParallax(
  parallax: PointerParallax,
  dt: number
): PointerParallax {
  const smoothing = 0.08;
  const factor = 1 - Math.pow(smoothing, dt);
  
  return {
    target: parallax.target,
    current: {
      x: parallax.current.x + (parallax.target.x - parallax.current.x) * factor,
      y: parallax.current.y + (parallax.target.y - parallax.current.y) * factor,
      yaw: parallax.current.yaw + (parallax.target.yaw - parallax.current.yaw) * factor,
    },
  };
}

// Compute camera state
// f = focus position in photo-index units (continuous)
// chapterProgress = 0 to 1 across entire chapter (including title)
export function cameraFor(
  chapter: Chapter,
  f: number,
  chapterProgress: number,
  parallax: PointerParallax
): CameraState {
  // Base camera z: FOCUS_DISTANCE - f * PLANE_SPACING
  // This keeps the focused photo at FOCUS_DISTANCE from camera
  const baseZ = FOCUS_DISTANCE - f * PLANE_SPACING;
  
  // Chapter-specific moves (small offsets)
  let offsetX = 0;
  let offsetZ = 0;
  let offsetY = 0;
  let yawOffset = 0;
  
  switch (chapter) {
    case 'weddings': {
      // Slow dolly in, up to WEDDINGS_DOLLY over the chapter
      offsetZ = -chapterProgress * WEDDINGS_DOLLY;
      break;
    }
    case 'cars': {
      // Lateral track, +/- CARS_TRACK across the chapter
      offsetX = (chapterProgress - 0.5) * 2 * CARS_TRACK;
      break;
    }
    case 'photoshoots': {
      // Gentle arc, +/- PHOTOSHOOTS_ARC radians
      const arcAngle = (chapterProgress - 0.5) * 2 * PHOTOSHOOTS_ARC;
      yawOffset = arcAngle;
      // Orbit around focused photo
      offsetX = Math.sin(arcAngle) * 0.5;
      offsetZ = (Math.cos(arcAngle) - 1) * 0.5;
      break;
    }
  }
  
  return {
    x: parallax.current.x + offsetX,
    y: parallax.current.y + offsetY,
    z: baseZ + offsetZ,
    yaw: parallax.current.yaw + yawOffset,
    pitch: 0,
  };
}


