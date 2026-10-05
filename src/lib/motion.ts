// Motion tuning constants for the Work section
// All values in one place for easy adjustment

// Single easing curve - soft expo-out family
export const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// One-shot text reveal duration
export const REVEAL_DURATION = 0.8; // seconds

// Scroll segment lengths
export const SEGMENT_LENGTH_PER_PHOTO = 90; // vh units
export const CHAPTER_OPENING_LENGTH = 60; // vh units

// Photo animation phases
export const ENTER_WINDOW = 0.4; // 40% of photo range before settling
export const DWELL_FRACTION = 1 / 3; // one third of range is dwell
export const PARALLAX_AMOUNT = 0.06; // 6% of frame height
export const ENTER_ZOOM = 1.12; // 112% scale on enter
export const DIM_AMOUNT = 0.55; // 55% brightness when dimmed
export const PUSH_BACK_DISTANCE = 6; // vh units up
export const PUSH_BACK_SCALE = 0.97; // 97% scale when pushed back

// Chapter transitions
export const CHAPTER_END_FADE = 0.12; // 12% of last photo range
export const CAPTION_DELAY = 0.2; // seconds after photo settles

// Lenis smooth scroll
export const LENIS_LERP = 0.09;
export const LENIS_WHEEL_SPEED = 1;

// Header offset for scroll calculations
export const HEADER_HEIGHT = 80; // pixels

// GSAP does not understand CSS cubic-bezier strings (EASING above is for CSS only).
// Use these named GSAP eases instead.
export const EASE_REVEAL = 'power3.out'; // scrubbed reveals (maps well to scroll)
export const EASE_SOFT = 'power2.out'; // small fades and drifts
export const EASE_INTRO = 'expo.out'; // one-shot, time-based intros (Hero)

// Caption fade, as a fraction of one photo segment
export const CAPTION_FADE = 0.08;

// Closing hold after the last photo, in photo segments
export const CHAPTER_CLOSING_HOLD = 0.5;

// Total scroll length of a chapter in vh units
export function chapterLength(photoCount: number): number {
  return (
    CHAPTER_OPENING_LENGTH +
    photoCount * SEGMENT_LENGTH_PER_PHOTO +
    SEGMENT_LENGTH_PER_PHOTO * CHAPTER_CLOSING_HOLD
  );
}

// Time (in the chapter timeline) at the middle of photo i's rest period
export function photoDwellMid(index: number): number {
  return (
    CHAPTER_OPENING_LENGTH +
    index * SEGMENT_LENGTH_PER_PHOTO +
    SEGMENT_LENGTH_PER_PHOTO * (ENTER_WINDOW + DWELL_FRACTION / 2)
  );
}
