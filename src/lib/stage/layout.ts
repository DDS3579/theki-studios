// Layout system - compute photo sizes at FOCUS_DISTANCE
import {
  FOCUS_DISTANCE,
  STAGE_FOV,
  LANDSCAPE_MIN_ASPECT,
  LANDSCAPE_MAX_HEIGHT,
  LANDSCAPE_MAX_WIDTH,
  PORTRAIT_MAX_HEIGHT,
  PORTRAIT_MAX_WIDTH,
  PORTRAIT_SIDE_OFFSET,
} from './constants';

export interface PlaneLayout {
  x: number; // World x position
  y: number; // World y position (always 0)
  width: number; // World width
  height: number; // World height
}

// Compute visible area at a given distance
function getVisibleArea(distance: number, fov: number, aspect: number) {
  const height = 2 * distance * Math.tan(fov / 2);
  const width = height * aspect;
  return { width, height };
}

// Compute layout for all photos in a chapter
// Called once per chapter and on resize, not per frame
export function computeChapterLayout(
  photoAspects: number[], // width/height for each photo
  screenAspect: number
): PlaneLayout[] {
  // Compute visible area at FOCUS_DISTANCE
  const visible = getVisibleArea(FOCUS_DISTANCE, STAGE_FOV, screenAspect);
  
  return photoAspects.map((photoAspect, i) => {
    let width: number;
    let height: number;
    let x: number;
    
    if (photoAspect >= LANDSCAPE_MIN_ASPECT) {
      // Landscape: centered
      height = visible.height * LANDSCAPE_MAX_HEIGHT;
      width = height * photoAspect;
      
      // Constrain width
      if (width > visible.width * LANDSCAPE_MAX_WIDTH) {
        width = visible.width * LANDSCAPE_MAX_WIDTH;
        height = width / photoAspect;
      }
      
      x = 0;
    } else {
      // Portrait or square: alternate sides
      height = visible.height * PORTRAIT_MAX_HEIGHT;
      width = height * photoAspect;
      
      // Constrain width
      if (width > visible.width * PORTRAIT_MAX_WIDTH) {
        width = visible.width * PORTRAIT_MAX_WIDTH;
        height = width / photoAspect;
      }
      
      // Alternate sides
      const side = i % 2 === 0 ? -1 : 1;
      x = side * visible.width * PORTRAIT_SIDE_OFFSET;
    }
    
    return {
      x,
      y: 0,
      width,
      height,
    };
  });
}


