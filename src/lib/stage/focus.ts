// Focus model: pure functions for circle of confusion and LOD mapping
// Focus distance F follows scroll progress P

export function computeFocusDistance(progress: number, totalFrames: number): number {
  // Focus distance moves through the stack as scroll progresses
  // Each frame is at a depth, focus snaps to the nearest frame
  return progress * (totalFrames - 1);
}

export function circleOfConfusion(
  planeZ: number,
  focusDistance: number,
  range: number = 1.5
): number {
  const diff = Math.abs(planeZ - focusDistance);
  return Math.min(Math.max(diff / range, 0), 1);
}

// Map CoC to blur amount (in texture-space UV offset for mip sampling)
export function cocToBlur(coc: number, maxBlur: number = 0.02): number {
  return coc * maxBlur;
}

// Determine if focus is "locked" (CoC below threshold)
export function isFocusLocked(coc: number, threshold: number = 0.15): boolean {
  return coc < threshold;
}

// LOD level from CoC (for mip chain sampling)
export function cocToLod(coc: number, maxLod: number = 4): number {
  return coc * maxLod;
}
