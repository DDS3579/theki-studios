// Focus model: continuous rack focus with hold/rack phases
// B3.4: Focus holds on each frame for 70% of its scroll range, racks to next during 30%

export interface FocusState {
  focusPosition: number; // Continuous position in the stack (can be fractional)
  focusedFrameIndex: number; // Integer index of the frame being focused on
  isRacking: boolean; // True during transition between frames
  rackProgress: number; // 0-1 progress within the rack transition
}

// Compute focus state from chapter progress (0-1 within chapter)
export function computeFocusState(
  chapterProgress: number,
  totalFrames: number
): FocusState {
  if (totalFrames === 0) {
    return { focusPosition: 0, focusedFrameIndex: 0, isRacking: false, rackProgress: 0 };
  }

  // Each frame gets equal progress range
  const frameRange = 1 / totalFrames;
  
  // Within each frame's range:
  // - First 70%: hold on this frame (focus locked)
  // - Last 30%: rack to next frame
  const holdRatio = 0.7;
  const rackRatio = 0.3;
  
  // Which frame are we in?
  const rawFrameIndex = chapterProgress / frameRange;
  const frameIndex = Math.floor(rawFrameIndex);
  const clampedFrameIndex = Math.min(frameIndex, totalFrames - 1);
  
  // Progress within this frame's range
  const frameProgress = (rawFrameIndex - frameIndex);
  
  let focusPosition: number;
  let isRacking: boolean;
  let rackProgress: number;
  
  if (frameProgress < holdRatio) {
    // Holding on current frame
    focusPosition = clampedFrameIndex;
    isRacking = false;
    rackProgress = 0;
  } else {
    // Racking to next frame
    isRacking = true;
    rackProgress = (frameProgress - holdRatio) / rackRatio;
    
    // Ease the rack transition (smoothstep)
    const easedRack = rackProgress * rackProgress * (3 - 2 * rackProgress);
    
    // Interpolate between current and next frame
    const nextFrameIndex = Math.min(clampedFrameIndex + 1, totalFrames - 1);
    focusPosition = clampedFrameIndex + (nextFrameIndex - clampedFrameIndex) * easedRack;
  }
  
  return {
    focusPosition,
    focusedFrameIndex: clampedFrameIndex,
    isRacking,
    rackProgress,
  };
}

// Compute circle of confusion for a plane given focus position
// B3.12: maxBlur and range are now configurable
export function circleOfConfusion(
  planeDepth: number, // Depth of the plane in the stack (0, 1, 2, ...)
  focusPosition: number, // Continuous focus position
  maxBlur: number = 1.0, // Maximum blur amount
  range: number = 1.5 // Depth range over which blur reaches maximum
): number {
  const diff = Math.abs(planeDepth - focusPosition);
  const coc = Math.min(diff / range, 1.0);
  return coc * maxBlur;
}

// Determine if focus is "locked" (blur below threshold)
export function isFocusLocked(blur: number, threshold: number = 0.15): boolean {
  return blur < threshold;
}
