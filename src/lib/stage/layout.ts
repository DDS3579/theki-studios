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

// Project a plane's corners to screen coordinates
// Used for viewfinder marks
export function projectPlaneToScreen(
  layout: PlaneLayout,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraYaw: number,
  photoZ: number, // World z of the photo (negative)
  screenWidth: number,
  screenHeight: number
): { left: number; top: number; width: number; height: number } {
  // Distance from camera to photo
  const distance = cameraZ - photoZ;
  if (distance <= 0.1) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  
  // Visible area at this distance
  const visible = getVisibleArea(distance, STAGE_FOV, screenWidth / screenHeight);
  
  // Convert world units to screen pixels
  const worldToScreenX = screenWidth / visible.width;
  const worldToScreenY = screenHeight / visible.height;
  
  // Account for camera offset and yaw
  const cos = Math.cos(cameraYaw);
  const sin = Math.sin(cameraYaw);
  
  // Plane center relative to camera
  const relX = layout.x - cameraX;
  const relY = layout.y - cameraY;
  
  // Apply yaw rotation
  const rotatedX = relX * cos - relY * sin;
  const rotatedY = relX * sin + relY * cos;
  
  // Convert to screen coordinates
  const screenCenterX = screenWidth / 2 + rotatedX * worldToScreenX;
  const screenCenterY = screenHeight / 2 - rotatedY * worldToScreenY;
  
  // Plane size in screen pixels (account for perspective)
  const screenW = layout.width * worldToScreenX;
  const screenH = layout.height * worldToScreenY;
  
  return {
    left: screenCenterX - screenW / 2,
    top: screenCenterY - screenH / 2,
    width: screenW,
    height: screenH,
  };
}
