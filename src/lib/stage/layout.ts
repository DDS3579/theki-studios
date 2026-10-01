// Layout: plane sizing in world units, matching the 3D camera
// B3.5: Layout uses world units based on camera's visible area
// B3.6: Prevents overflow and overlap

export interface PlaneRect {
  x: number; // World X position
  y: number; // World Y position
  width: number; // World width
  height: number; // World height
  side: 'left' | 'right' | 'center';
}

// B3.5: Compute visible area at a given distance from camera
export function getVisibleArea(
  distance: number,
  fov: number, // Vertical FOV in radians
  aspect: number // Screen aspect ratio (width/height)
): { width: number; height: number } {
  const height = 2 * distance * Math.tan(fov / 2);
  const width = height * aspect;
  return { width, height };
}

// B3.5 & B3.6: Compute plane rect in world units
export function computePlaneRect(
  photoAspect: number, // width / height of the photo
  distance: number, // Distance from camera to plane
  fov: number, // Vertical FOV in radians
  screenAspect: number, // Screen aspect ratio
  frameIndex: number,
  totalFrames: number
): PlaneRect {
  const visible = getVisibleArea(distance, fov, screenAspect);
  
  // B3.6: Limit photo size to prevent overflow
  // Max height: 70% of visible height (leaves margin)
  // Max width: 42% of visible width (prevents overlap when alternating sides)
  const maxHeightRatio = 0.70;
  const maxWidthRatio = 0.42;
  
  let height = visible.height * maxHeightRatio;
  let width = height * photoAspect;
  
  // If width exceeds limit, constrain by width instead
  if (width > visible.width * maxWidthRatio) {
    width = visible.width * maxWidthRatio;
    height = width / photoAspect;
  }
  
  // B3.6: Position based on aspect ratio
  // Landscape photos (wide): center them
  // Portrait photos (tall): alternate sides
  let x: number;
  let side: 'left' | 'right' | 'center';
  
  if (photoAspect > 1.2) {
    // Landscape: center the photo
    x = 0;
    side = 'center';
  } else {
    // Portrait or square: alternate sides
    side = frameIndex % 2 === 0 ? 'left' : 'right';
    const xOffset = visible.width * 0.25; // 25% from center
    x = side === 'left' ? -xOffset : xOffset;
  }
  
  const y = 0; // Center vertically
  
  return { x, y, width, height, side };
}

// B3.7: Project plane corners to screen coordinates
export function projectPlaneToScreen(
  planeRect: PlaneRect,
  cameraZ: number, // Camera distance from origin
  planeZ: number, // Plane distance from origin
  fov: number,
  screenAspect: number,
  screenWidth: number,
  screenHeight: number
): { left: number; top: number; width: number; height: number } {
  // Distance from camera to plane
  const distance = cameraZ - planeZ;
  if (distance <= 0) {
    // Plane is behind or at camera, return zero rect
    return { left: 0, top: 0, width: 0, height: 0 };
  }
  
  // Visible area at this distance
  const visible = getVisibleArea(distance, fov, screenAspect);
  
  // Convert world units to screen pixels
  const worldToScreenX = screenWidth / visible.width;
  const worldToScreenY = screenHeight / visible.height;
  
  // Plane center in world units
  const centerX = planeRect.x;
  const centerY = planeRect.y;
  
  // Plane size in world units
  const planeWidth = planeRect.width;
  const planeHeight = planeRect.height;
  
  // Convert to screen coordinates
  const screenCenterX = screenWidth / 2 + centerX * worldToScreenX;
  const screenCenterY = screenHeight / 2 - centerY * worldToScreenY; // Y is flipped
  
  const screenW = planeWidth * worldToScreenX;
  const screenH = planeHeight * worldToScreenY;
  
  return {
    left: screenCenterX - screenW / 2,
    top: screenCenterY - screenH / 2,
    width: screenW,
    height: screenH,
  };
}
