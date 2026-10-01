# Batch 3: Stage 3D Math and Cinematic Logic - Implementation Summary

## Overview
Batch 3 fixes critical issues in the 3D rendering system that caused photos to be invisible, distorted, or incorrectly positioned. The fixes establish a proper camera system, continuous focus transitions, and correct world-space layout calculations.

## Critical Fixes

### B3.1: Fixed Plane Positioning (CRITICAL)
**Problem**: Planes were placed behind the camera due to incorrect depth calculation. The formula `pz = -plane.z + camera.z` caused planes to render at positive Z values in view space, which are clipped by the camera's near plane.

**Solution**: 
- Implemented proper view matrix transformation in `renderer.ts`
- View matrix now correctly moves the world by `-camera` position and rotates by `-yaw` and `-pitch`
- Model matrix is now simple translate + scale (no rotation)
- Plane Z positions are now positive (in front of camera)
- Camera distance and plane depth add correctly: `viewDistance = camera.z - planeZ`

**Files Changed**:
- `src/lib/stage/renderer.ts`: Added `buildView()` method, changed `buildModel()` to remove rotation
- `src/lib/stage/camera.ts`: Camera now has `targetDepth` field

### B3.2: Camera Uses Chapter Progress (CRITICAL)
**Problem**: Camera movements restarted at each segment boundary because they used segment-local progress (0-1 within one frame) instead of chapter progress (0-1 across entire chapter).

**Solution**:
- Added `getChapterProgress()` helper in `journey.ts`
- Camera functions now receive continuous chapter progress
- Camera paths are smooth across the entire chapter with no jumps

**Files Changed**:
- `src/lib/stage/journey.ts`: Added `getChapterRange()`, `getChapterProgress()`, `getChapterAtProgress()`
- `src/lib/stage/camera.ts`: `cameraFor()` now takes `chapterProgress` parameter
- `src/components/Stage.tsx`: Computes chapter progress and passes to camera

### B3.3: Camera Follows Focus Position (CRITICAL)
**Problem**: Camera stayed at fixed distance (5 units) while planes extended deeper (0, 2.5, 5, 7.5...). This caused later photos to appear tiny and distant.

**Solution**:
- Camera base distance now follows focus: `baseDistance = focusDepth + 2.0`
- Camera always sits 2 units in front of the focused plane
- Chapter-specific movements (dolly, track, arc) are small offsets on top of base
- Planes behind camera are culled

**Files Changed**:
- `src/lib/stage/camera.ts`: All chapter movements now use `focusDepth` as base
- `src/components/Stage.tsx`: Passes `focusDepth` to camera function
- `src/lib/stage/renderer.ts`: Culls planes with `viewDistance < near`

### B3.4: Continuous Rack Focus (HIGH)
**Problem**: Focus snapped to integer frame indices with no transition. The "hunting" indicator never showed because focus was always locked.

**Solution**:
- Implemented `computeFocusState()` in `focus.ts` with hold/rack phases
- Each frame holds for 70% of its scroll range, racks to next during 30%
- Rack uses smoothstep easing for natural motion
- Focus position is continuous (can be fractional like 2.3)
- "Hunting" indicator shows during rack transitions
- Title segments focus softly on first frame (not negative value)

**Files Changed**:
- `src/lib/stage/focus.ts`: Complete rewrite with `FocusState` interface and `computeFocusState()`
- `src/components/Stage.tsx`: Uses focus state for camera and blur calculations

### B3.5: World-Space Layout (HIGH)
**Problem**: Layout returned screen-space fractions that were multiplied by 3 in the renderer, causing photos to be distorted by screen aspect ratio. A 3:2 photo on a 16:9 screen became 3:2 / 16:9 = 0.84:1 (squashed).

**Solution**:
- `computePlaneRect()` now returns world units based on camera's visible area
- Visible area computed from FOV and distance: `height = 2 * distance * tan(fov/2)`
- Plane height is fraction of visible height (70% max)
- Plane width = height × photo aspect ratio (preserves photo proportions)
- Position is fraction of visible width

**Files Changed**:
- `src/lib/stage/layout.ts`: Complete rewrite with `getVisibleArea()` and world-unit calculations
- `src/components/Stage.tsx`: Passes FOV and aspect to layout function

### B3.6: Prevent Overflow and Overlap (HIGH)
**Problem**: Landscape photos (3:2) at 72% width overflowed their half-screen area. Left and right planes overlapped by ~11% in the middle.

**Solution**:
- Limited photo width to 42% of visible width (prevents overlap)
- Limited photo height to 70% of visible height (prevents overflow)
- Landscape photos (aspect > 1.2) are centered
- Portrait photos alternate left/right sides
- Photos never stretch or distort

**Files Changed**:
- `src/lib/stage/layout.ts`: Added aspect-ratio-based positioning logic

## Medium Priority Fixes

### B3.7: Viewfinder Rectangle from WebGL (MEDIUM)
**Problem**: DOM viewfinder used separate calculation from renderer, so brass marks didn't align with photos.

**Solution**:
- Renderer caches projection and view matrices after each render
- Added `projectPlaneToScreen()` in `layout.ts` that transforms plane corners through view×projection
- Perspective divide converts to screen coordinates
- Stage uses this for viewfinder positioning

**Files Changed**:
- `src/lib/stage/renderer.ts`: Added `getLastMatrices()` method
- `src/lib/stage/layout.ts`: Added `projectPlaneToScreen()` function
- `src/components/Stage.tsx`: Uses projection for viewfinder rect

### B3.8: Yaw/Pitch in View Transform (MEDIUM)
**Problem**: Yaw was applied as per-plane rotation (planes spun like cards). Pitch was declared but never used.

**Solution**:
- Yaw and pitch now applied in view matrix (camera rotation)
- Photoshoot arc orbits around focused plane position
- Orbit radius is small (0.5 units) for subtle effect
- Yaw sign matches orbit direction

**Files Changed**:
- `src/lib/stage/renderer.ts`: `buildView()` applies yaw and pitch rotations
- `src/lib/stage/camera.ts`: Photoshoot case wrapped in block (B3.13), orbits around focus

### B3.9: Pointer Parallax Smoothing (MEDIUM)
**Problem**: Parallax only eased when pointer events arrived, not every frame. Speed depended on event rate.

**Solution**:
- Split into `setParallaxTarget()` (called on pointer move) and `easeParallax()` (called every frame)
- Easing uses frame delta time for consistent speed
- Added `resetParallax()` for when pointer leaves window
- Parallax now smooth regardless of event rate

**Files Changed**:
- `src/lib/stage/camera.ts`: Split parallax into target/ease functions
- `src/components/Stage.tsx`: Calls `easeParallax()` in ticker update

### B3.10: Container Height from Journey (MEDIUM)
**Problem**: Container used hardcoded 90svh per segment, but journey weights were 80 for titles and 90 for frames. Scroll length didn't match progress map.

**Solution**:
- Journey now exposes `totalWeight` (sum of all segment weights)
- Container height is `${totalWeight}svh`
- Weights defined once as constants in `journey.ts`

**Files Changed**:
- `src/lib/stage/journey.ts`: Exports `totalWeight`
- `src/components/Stage.tsx`: Uses `journey.totalWeight` for container height

### B3.11: Plane Culling and Fading (MEDIUM)
**Problem**: Earlier planes drawn at 50% opacity overlapped focused photo. Zero-opacity planes still drawn.

**Solution**:
- Skip planes with opacity < 0.01
- Skip planes behind camera (`viewDistance < near`)
- Fade planes as camera approaches (near cross-fade)
- Fade far planes softly (beyond 3 units from focus)
- Fade passed planes (behind focus)

**Files Changed**:
- `src/lib/stage/renderer.ts`: Added culling and near-fade logic
- `src/components/Stage.tsx`: Computes per-plane opacity with distance-based fading

### B3.12: Single Source of Truth for Blur (LOW)
**Problem**: Shader hardcoded blur multiplier of 5.0, Stage passed range of 4.0. Dead helpers in `focus.ts`.

**Solution**:
- Removed unused `cocToBlur()` and `cocToLod()` from `focus.ts`
- Blur multiplier (`maxBlurLod`) now passed as uniform from JS
- Range parameter configurable in `circleOfConfusion()`
- Single source of truth: JS controls blur parameters

**Files Changed**:
- `src/lib/stage/focus.ts`: Removed dead helpers, simplified API
- `src/lib/stage/renderer.ts`: Added `u_maxBlurLod` uniform
- `src/components/Stage.tsx`: Passes blur parameters to renderer

### B3.13: Lexical Declaration in Switch (LOW)
**Problem**: Photoshoots case declared `const arcAngle` without block scope, flagged by linters.

**Solution**: Wrapped photoshoots case body in block `{ }`.

**Files Changed**:
- `src/lib/stage/camera.ts`: Added block scope to photoshoots case

## Architecture Changes

### New Data Flow
```
Scroll Progress (0-1)
    ↓
Journey.getSegmentAt() → Segment + Chapter
    ↓
Journey.getChapterProgress() → Chapter Progress (0-1)
    ↓
Focus.computeFocusState() → Focus Position (continuous)
    ↓
Camera.cameraFor() → Camera State (follows focus)
    ↓
Layout.computePlaneRect() → World Units (per plane)
    ↓
Renderer.render() → WebGL (with view transform)
    ↓
Layout.projectPlaneToScreen() → Viewfinder Rect
```

### Key Interfaces

**CameraState** (camera.ts):
```typescript
{
  x, y, z: number;        // Camera position
  yaw, pitch: number;     // Camera rotation
  targetDepth: number;    // Focus position being tracked
}
```

**FocusState** (focus.ts):
```typescript
{
  focusPosition: number;      // Continuous position (can be 2.3)
  focusedFrameIndex: number;  // Integer frame being focused
  isRacking: boolean;         // True during transition
  rackProgress: number;       // 0-1 within rack
}
```

**Plane** (renderer.ts):
```typescript
{
  textureId: string;
  depth: number;        // Stack position (0, 1, 2, ...)
  x, y: number;         // World position
  width, height: number; // World size
  opacity: number;
}
```

## Build Results
- **Total size**: 197.33 kB (61.83 kB gzipped)
- **CSS**: 33.80 kB (6.88 kB gzipped)
- **Modules**: 45 transformed successfully
- **Build time**: 1.58s

## Verification Checklist
- [x] All planes visible at scroll position zero
- [x] First plane sharp in every chapter
- [x] Camera moves continuously through chapter (no jumps)
- [x] Camera follows focus position
- [x] Focus racks smoothly between frames (70% hold, 30% rack)
- [x] "Hunting" indicator shows during rack
- [x] Photos maintain correct aspect ratio (no distortion)
- [x] Landscape photos centered, portraits alternate sides
- [x] No overflow or overlap
- [x] Viewfinder brass marks align with photos
- [x] Yaw/pitch rotate camera (not individual planes)
- [x] Parallax smooths consistently
- [x] Container height matches journey weights
- [x] Planes culled when behind camera
- [x] Planes fade near/far
- [x] Blur parameters controlled from JS
- [x] No linter warnings

## Performance Impact
- View matrix computed once per frame (not per plane)
- Plane culling reduces draw calls
- No performance regression from additional calculations
- Runtime ladder still functional for quality degradation

## Backwards Compatibility
- All public APIs preserved
- New parameters have sensible defaults
- Existing content system unchanged
- Static fallback path unaffected
