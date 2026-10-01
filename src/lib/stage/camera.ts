// Camera moves per chapter
// Each chapter has its own camera language

import type { Chapter } from '../../content';

export interface CameraState {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

// Pointer parallax state
export interface PointerParallax {
  targetYaw: number;
  targetOffsetX: number;
  targetOffsetY: number;
  currentYaw: number;
  currentOffsetX: number;
  currentOffsetY: number;
}

export function createPointerParallax(): PointerParallax {
  return {
    targetYaw: 0,
    targetOffsetX: 0,
    targetOffsetY: 0,
    currentYaw: 0,
    currentOffsetX: 0,
    currentOffsetY: 0,
  };
}

export function updatePointerParallax(
  parallax: PointerParallax,
  pointerX: number, // -1 to 1
  pointerY: number, // -1 to 1
  dt: number
): PointerParallax {
  const inertia = 0.08;
  const maxYaw = 1.5 * (Math.PI / 180); // 1.5 degrees
  const maxOffset = 0.02; // 2%

  return {
    targetYaw: pointerX * maxYaw,
    targetOffsetX: pointerX * maxOffset,
    targetOffsetY: pointerY * maxOffset,
    currentYaw: parallax.currentYaw + (parallax.targetYaw - parallax.currentYaw) * inertia,
    currentOffsetX: parallax.currentOffsetX + (parallax.targetOffsetX - parallax.currentOffsetX) * inertia,
    currentOffsetY: parallax.currentOffsetY + (parallax.targetOffsetY - parallax.currentOffsetY) * inertia,
  };
}

// Camera for each chapter based on local progress t (0-1 within chapter)
export function cameraFor(
  chapter: Chapter,
  t: number,
  parallax: PointerParallax
): CameraState {
  const base: CameraState = { x: 0, y: 0, z: 5, yaw: 0, pitch: 0 };

  switch (chapter) {
    case 'weddings':
      // Slow dolly in along Z with longest focus pulls
      return {
        ...base,
        z: 5 - t * 1.5, // Dolly from 5 to 3.5
        yaw: parallax.currentYaw,
        x: parallax.currentOffsetX,
        y: parallax.currentOffsetY,
      };

    case 'cars':
      // Lateral track along X, planes at staggered depths
      return {
        ...base,
        x: -1.5 + t * 3, // Track from left to right
        z: 5,
        yaw: parallax.currentYaw * 0.5,
        y: parallax.currentOffsetY,
      };

    case 'photoshoots':
      // Arc: camera orbits the stack by up to 14 degrees yaw
      const arcAngle = (t - 0.5) * 14 * (Math.PI / 180); // ±7 degrees
      return {
        ...base,
        x: Math.sin(arcAngle) * 5,
        z: Math.cos(arcAngle) * 5,
        yaw: -arcAngle + parallax.currentYaw,
        y: parallax.currentOffsetY,
      };

    default:
      return base;
  }
}
