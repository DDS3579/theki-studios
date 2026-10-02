// Focus model - segment-based, not chapter-based
import { FOCUS_HOLD_RATIO, FOCUS_LOCK_THRESHOLD, BLUR_DIVISOR, BLUR_PASSED_MULTIPLIER } from './constants';

export interface FocusState {
  f: number; // Continuous focus position in photo-index units
  isRacking: boolean;
  isLocked: boolean;
}

// Smoothstep easing function
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

// Compute focus state from segment info
export function computeFocusFromSegment(
  segmentType: 'title' | 'frame',
  frameIndex: number,
  localProgress: number,
  isLastFrame: boolean
): FocusState {
  let f: number;
  let isRacking: boolean;

  if (segmentType === 'title') {
    // Title segment: focus on first photo
    f = 0;
    isRacking = false;
  } else {
    // Frame segment
    if (localProgress < FOCUS_HOLD_RATIO) {
      // Hold phase: stay on current frame
      f = frameIndex;
      isRacking = false;
    } else if (isLastFrame) {
      // Last frame: hold for entire segment
      f = frameIndex;
      isRacking = false;
    } else {
      // Rack phase: transition to next frame
      const rackProgress = (localProgress - FOCUS_HOLD_RATIO) / (1 - FOCUS_HOLD_RATIO);
      const eased = smoothstep(rackProgress);
      f = frameIndex + eased;
      isRacking = true;
    }
  }

  return {
    f,
    isRacking,
    isLocked: !isRacking,
  };
}

// Compute blur for a photo at index i given focus position f
// s = i - f (positive = ahead, negative = behind)
export function computeBlur(i: number, f: number): number {
  const s = i - f;
  const absS = Math.abs(s);
  let blur = absS / BLUR_DIVISOR;
  
  // Passed photos (s < 0) are blurred twice as strongly
  if (s < 0) {
    blur *= BLUR_PASSED_MULTIPLIER;
  }
  
  return blur;
}

// Check if focus is locked (blur below threshold)
export function isFocusLocked(blur: number): boolean {
  return blur < FOCUS_LOCK_THRESHOLD;
}
