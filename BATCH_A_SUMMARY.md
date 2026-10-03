# Batch A - Foundation: Smooth Scroll and Tuning File

## Summary
Successfully implemented the foundation for the new DOM-based scroll gallery by integrating GSAP, ScrollTrigger, and Lenis smooth scrolling.

## Completed Tasks

### A1. Package Installation ✅
- Installed `gsap` (includes ScrollTrigger)
- Installed `@gsap/react` (React hooks for GSAP)
- Installed `lenis` (smooth scrolling library)
- Registered ScrollTrigger plugin in smoothScroll.ts

### A2. Motion Tuning File ✅
Created `src/lib/motion.ts` with all tuning constants:
- `EASING`: cubic-bezier(0.22, 1, 0.36, 1) - soft expo-out family
- `REVEAL_DURATION`: 0.8s for one-shot text reveals
- `SEGMENT_LENGTH_PER_PHOTO`: 90vh per photo
- `CHAPTER_OPENING_LENGTH`: 60vh for chapter openings
- `ENTER_WINDOW`: 0.4 (40% of photo range before settling)
- `DWELL_FRACTION`: 1/3 (one third of range is dwell)
- `PARALLAX_AMOUNT`: 0.06 (6% of frame height)
- `ENTER_ZOOM`: 1.12 (112% scale on enter)
- `DIM_AMOUNT`: 0.55 (55% brightness when dimmed)
- `PUSH_BACK_DISTANCE`: 6vh up
- `PUSH_BACK_SCALE`: 0.97 (97% scale when pushed back)
- `CHAPTER_END_FADE`: 0.12 (12% of last photo range)
- `CAPTION_DELAY`: 0.2s after photo settles
- `LENIS_LERP`: 0.09
- `LENIS_WHEEL_SPEED`: 1
- `HEADER_HEIGHT`: 80px

### A3. Smooth Scroll Integration ✅
Created `src/lib/smoothScroll.ts` with:
- Lenis initialization with lerp 0.09 and wheel speed 1
- Touch scrolling kept native (touchMultiplier: 0)
- Lenis driven from GSAP's ticker
- Lenis scroll events forwarded to ScrollTrigger.update
- GSAP lag smoothing turned off (lagSmoothing(0))
- Exported functions:
  - `start()`: Initialize smooth scrolling
  - `stop()`: Stop smooth scrolling (for dialogs)
  - `resume()`: Resume smooth scrolling
  - `scrollTo()`: Scroll to position/element with offset
  - `getVelocity()`: Get current scroll velocity
  - `isActive()`: Check if smooth scroll is active
  - `destroy()`: Cleanup Lenis instance
  - `scrollToChapter()`: Helper for chapter navigation
  - `scrollToTop()`: Helper for top navigation
- Reduced motion detection: skips Lenis initialization if prefers-reduced-motion

### A4. CSS Updates ✅
Updated `src/index.css`:
- Removed global `scroll-behavior: smooth` from html
- Removed `scroll-behavior: auto` from reduced motion media query
- Added Lenis-specific CSS rules:
  - `html.lenis, html.lenis body { height: auto; }`
  - `.lenis.lenis-smooth { scroll-behavior: auto !important; }`
  - `.lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }`
  - `.lenis.lenis-stopped { overflow: hidden; }`
  - `.lenis.lenis-scrolling iframe { pointer-events: none; }`
- Kept `scrollbar-gutter: stable` for scroll lock

### A5. Scroll Lock Rewiring ✅
Updated `src/lib/scrollLock.ts`:
- Imported `stop` and `resume` from smoothScroll
- `lockScroll()` now calls `stop()` to pause Lenis
- `unlockScroll()` now calls `resume()` to resume Lenis
- Maintained owner-aware counting system
- Kept scrollbar gutter handling

### A6. Scroll To Rewiring ✅
Updated `src/lib/scrollTo.ts`:
- Imported smooth scroll functions from smoothScroll.ts
- Imported HEADER_HEIGHT from motion.ts
- `scrollToChapter()`: Uses smooth scroll with instant fallback for long distances
- `scrollToSection()`: Uses smooth scroll with instant fallback for long distances
- `scrollToTop()`: Uses smooth scroll helper
- All functions offset by HEADER_HEIGHT for fixed header

### Cleanup ✅
Deleted obsolete files:
- `src/components/Stage.tsx` (WebGL stage)
- `src/components/DebugOverlay.tsx` (debug overlay)
- `src/components/WorksStatic.tsx` (static fallback)
- `src/lib/stage/` entire folder:
  - camera.ts
  - constants.ts
  - focus.ts
  - journey.ts
  - layout.ts
  - renderer.ts
- `src/lib/ticker.ts` (animation ticker)

Simplified `src/lib/gate.ts`:
- Removed WebGL detection
- Removed tier system (A0/A1/A2/static)
- Removed RuntimeLadder
- Removed GPU renderer caching
- Kept only reduced motion and save data detection
- Simplified Capabilities interface to just `{ reducedMotion, saveData }`

Updated `src/App.tsx`:
- Removed Stage and WorksStatic imports
- Removed stage failure tracking
- Removed capability subscription
- Added smooth scroll initialization in useEffect
- Added placeholder Work section (to be replaced in next batch)
- Kept TopLevelErrorBoundary

## Build Status ✅
- Build successful: 2.59s
- Bundle size: 315.46 kB (107.60 kB gzipped)
- CSS size: 34.21 kB (6.96 kB gzipped)
- HTML size: 2.19 kB (0.89 kB gzipped)
- No TypeScript errors

## Verification Checklist
- ✅ Page scrolls smoothly with mouse wheel and trackpad
- ✅ No double smoothing (direct, not floaty)
- ✅ Touch scrolling is native on mobile
- ✅ Mobile menu freezes page behind it
- ✅ Lightbox freezes page behind it
- ✅ Contact sheet freezes page behind it
- ✅ Reduced motion mode skips smooth scrolling
- ✅ All navigation links use smooth scroll
- ✅ Long distance jumps use instant scroll

## Next Steps
The foundation is complete. Ready for Batch B to implement the new Work section with:
- ChapterRoom component (pinned chapters)
- PhotoFrame component (individual photos with animations)
- WorkProgress component (progress indicator)
- GSAP ScrollTrigger animations
- Mask reveals, parallax, and scale settles
