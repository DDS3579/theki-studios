// Layout: plane sizing, side alternation, rect output
// Every plane keeps its true aspect ratio

export interface PlaneRect {
  x: number; // Normalized 0-1
  y: number;
  width: number;
  height: number;
  side: 'left' | 'right';
}

export function computePlaneRect(
  aspect: [number, number], // [width, height]
  stageAspect: number, // width / height
  frameIndex: number,
  totalFrames: number
): PlaneRect {
  const [pw, ph] = aspect;
  const photoAspect = pw / ph;

  // Long edge at most 72% of stage's long dimension
  const maxLongEdge = 0.72;
  
  let width: number, height: number;
  
  if (stageAspect > photoAspect) {
    // Stage is wider than photo: height is the constraint
    height = maxLongEdge;
    width = height * photoAspect / stageAspect;
  } else {
    // Stage is taller than photo: width is the constraint
    width = maxLongEdge;
    height = width * stageAspect / photoAspect;
  }

  // Alternate sides per frame
  const side: 'left' | 'right' = frameIndex % 2 === 0 ? 'left' : 'right';
  
  // Position: center vertically, offset horizontally to the assigned side
  const x = side === 'left' ? 0.25 : 0.75;
  const y = 0.5;

  return { x, y, width, height, side };
}

// Get screen rect for viewfinder overlay
export function getScreenRect(
  planeRect: PlaneRect,
  stageWidth: number,
  stageHeight: number
): { left: number; top: number; width: number; height: number } {
  const w = planeRect.width * stageWidth;
  const h = planeRect.height * stageHeight;
  const left = planeRect.x * stageWidth - w / 2;
  const top = planeRect.y * stageHeight - h / 2;
  return { left, top, width: w, height: h };
}
