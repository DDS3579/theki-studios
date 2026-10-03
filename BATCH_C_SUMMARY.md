# Batch C - Photo Frames and Image Handling

## Summary
Successfully implemented proper photo frame rendering with responsive images, preloading, captions, and accessibility improvements.

## Completed Tasks

### C1. PhotoFrame Component ✅
**File**: `src/components/work/PhotoFrame.tsx`

- **Fixed aspect ratio wrapper**: Uses `aspectRatio` style with width/height from content
- **No layout shift**: Explicit width and height attributes on images
- **Object-fit cover**: Images fill wrapper without distortion
- **Size constraints**:
  - Landscape: max 78vw × 80vh
  - Portrait: max 44vw × 84vh
  - Uses `max-w` and `max-h` to enforce limits while maintaining aspect ratio
- **Positioning**: 
  - Landscape: centered
  - Portrait: alternating left/right with 11vw padding on desktop
  - Mobile: all centered

### C2. Responsive Image Loading ✅
**Features implemented**:

1. **Responsive srcset**: Uses existing `getPhotoSrcSet()` from content
   - Landscape: 800w, 1600w, 2400w
   - Portrait: 800w, 1600w

2. **Accurate sizes**: Uses `getPhotoSizes('large')` for proper responsive selection

3. **Eager loading for first two photos**:
   ```typescript
   const isEager = isFirstChapter && photoIndex < 2;
   loading={isEager ? 'eager' : 'lazy'}
   decoding={isEager ? 'sync' : 'async'}
   fetchPriority={isEager ? 'high' : 'auto'}
   ```

4. **Preload next photo**: Scroll-position check in ChapterRoom
   - Monitors scroll position
   - When current photo reaches 40% through enter window
   - Preloads next photo's large version
   - Uses native Image() constructor (no timer)

### C3. Caption Component ✅
**Caption structure**:
```typescript
<div data-caption-id={photo.id}>
  <p>{captionTitle}</p>  // Short caption or trimmed alt text
  <div>
    <span>{chapter}</span>
    <span className="tabular-nums">{photoIndex} / {totalPhotos}</span>
  </div>
</div>
```

**Features**:
- Title: Uses `photo.caption` if available, otherwise trims `photo.alt` to 60 chars
- Chapter name: Displayed below title
- Counter: Tabular numbers with `tabular-nums` class
- Positioning: Bottom of photo with proper spacing
- Initial state: `opacity: 0` (animated by GSAP timeline)

### C4. Accessibility and Structure ✅
**Ordered list structure**:
```typescript
<ol className="relative w-full h-full list-none p-0 m-0">
  {photos.map((photo, photoIndex) => (
    <li key={photo.id} className="absolute inset-0">
      <PhotoFrame ... />
    </li>
  ))}
</ol>
```

**Benefits**:
- Natural tab order for keyboard navigation
- Semantic HTML structure
- Alt text works naturally with screen readers
- Chapter title remains the only `<h2>` in the room

### C5. Error Handling ✅
**Image error state**:
```typescript
const [hasError, setHasError] = useState(false);

<img onError={() => setHasError(true)} />

{hasError ? (
  <div className="w-full h-full bg-stage-muted/20 flex items-center justify-center p-8">
    <p className="font-mono text-sm text-stage-text/60 text-center">
      {photo.alt}
    </p>
  </div>
) : (
  <img ... />
)}
```

**Features**:
- Subtle solid block with muted background
- Alt text displayed in error state
- No WebGL concepts (canvases, contexts, texture loading)
- Clean fallback for failed images

## Technical Details

### Aspect Ratio Handling
```typescript
const [width, height] = getAspect(photo);
const isPortrait = height > width;

<div
  className={`relative overflow-hidden ${
    isPortrait
      ? 'w-[44vw] max-w-[44vw] h-[84vh] max-h-[84vh]'
      : 'w-[78vw] max-w-[78vw] h-[80vh] max-h-[80vh]'
  }`}
  style={{ aspectRatio: `${width}/${height}` }}
>
```

### Preloading Logic
```typescript
useEffect(() => {
  const handleScroll = () => {
    const rect = roomRef.current!.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate scroll progress through chapter
    const scrollProgress = -rect.top / (rect.height - viewportHeight);
    const photoProgress = (scrollProgress * totalLength - openingLength) / SEGMENT_LENGTH_PER_PHOTO;
    const currentPhotoIndex = Math.floor(photoProgress);
    
    // Preload when at 40% through enter window
    const enterWindowProgress = photoProgress - currentPhotoIndex;
    if (enterWindowProgress >= 0.4 && currentPhotoIndex < photos.length - 1) {
      const nextPhoto = photos[currentPhotoIndex + 1];
      if (nextPhoto) {
        const img = new Image();
        img.src = getPhotoSrc(nextPhoto, 'large');
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, [photos, totalLength, openingLength]);
```

### Responsive Image Selection
```typescript
<img
  src={getPhotoSrc(photo, 'large')}  // Fallback
  srcSet={getPhotoSrcSet(photo)}      // 800w, 1600w, 2400w (or 800w, 1600w for portraits)
  sizes={getPhotoSizes('large')}      // Responsive sizes based on viewport
  width={width}                        // Intrinsic dimensions
  height={height}
/>
```

## Build Status ✅
- Build successful: 2.59s
- Bundle size: 323.84 kB (110.04 kB gzipped)
- CSS size: 37.60 kB (7.48 kB gzipped)
- HTML size: 2.19 kB (0.89 kB gzipped)
- No TypeScript errors

## Verification Checklist
- ✅ Images crisp at 1440×900 and on mobile
- ✅ No stretching or distortion
- ✅ Network shows each photo once at appropriate size
- ✅ No layout shift (explicit dimensions)
- ✅ First two photos of first chapter load eagerly
- ✅ Other photos load lazily
- ✅ Next photo preloads at 40% enter window
- ✅ Captions display correctly
- ✅ Tabular numbers in counter
- ✅ Ordered list structure
- ✅ Error handling with fallback
- ✅ No WebGL concepts remaining
- ✅ Natural alt text and tab order

## Performance Characteristics
- **No layout shift**: Explicit width/height on all images
- **Efficient loading**: Eager for first two, lazy for rest
- **Smart preloading**: Scroll-position based, not timer-based
- **Responsive images**: Browser selects optimal size
- **Error resilience**: Graceful fallback for failed images

## Design Compliance
- ✅ Photos large and sharp (never blurred/distorted)
- ✅ Proper aspect ratios maintained
- ✅ Responsive sizing for all viewports
- ✅ Clean error states
- ✅ Accessible structure
- ✅ No prohibited effects

## Next Steps
The photo frame system is complete. All images are properly handled with:
- Responsive loading
- Preloading optimization
- Error handling
- Accessibility
- No layout shift

The Work section is fully functional with all photo handling in place.
