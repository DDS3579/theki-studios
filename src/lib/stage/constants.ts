// Stage constants - single source of truth for all 3D math

// World coordinates
export const PLANE_SPACING = 2.5; // World units between consecutive photos
export const FOCUS_DISTANCE = 3.0; // World units from camera to focused photo
export const STAGE_FOV = Math.PI / 3.5; // ~51 degrees vertical FOV
export const NEAR_PLANE = 0.1;
export const CULL_DISTANCE = 0.3; // Planes closer than this are culled

// Focus model
export const FOCUS_HOLD_RATIO = 0.7; // Hold for 70% of segment, rack for 30%
export const FOCUS_LOCK_THRESHOLD = 0.15; // Blur below this = locked

// Photo layout (as fraction of visible area at FOCUS_DISTANCE)
export const LANDSCAPE_MIN_ASPECT = 1.2;
export const LANDSCAPE_MAX_HEIGHT = 0.72;
export const LANDSCAPE_MAX_WIDTH = 0.80;
export const PORTRAIT_MAX_HEIGHT = 0.78;
export const PORTRAIT_MAX_WIDTH = 0.40;
export const PORTRAIT_SIDE_OFFSET = 0.22; // 22% of visible width

// Opacity and blur
export const BLUR_DIVISOR = 1.5; // |s| / 1.5
export const BLUR_PASSED_MULTIPLIER = 2.0; // Passed photos blurred 2x
export const FADE_START = 1.0; // Start fading at s = 1
export const FADE_END = 3.0; // Fully faded at s = 3
export const PASSED_FADE_RATE = 1.25; // Opacity = 1 + 1.25 * s (s < 0)
export const PASSED_FADE_END = -0.8; // Gone by s = -0.8

// Group opacity (title transitions)
export const TITLE_FADE_IN_END = 0.20; // 0 to 1 over first 20%
export const TITLE_FADE_OUT_START = 0.80; // 1 to 0 over last 20%
export const GROUP_FADE_IN_END = 0.20; // 0 to 0.35 over first 20%
export const GROUP_FADE_OUT_START = 0.92; // 1 to 0 over last 8%

// Camera chapter moves (offsets on top of base)
export const WEDDINGS_DOLLY = 0.5; // Max dolly in
export const CARS_TRACK = 0.5; // Max lateral track
export const PHOTOSHOOTS_ARC = 0.15; // Max arc in radians

// Performance
export const PROGRESS_EPSILON = 0.0001; // For ticker sleep
export const PARALLAX_EPSILON = 0.001; // For parallax settle
