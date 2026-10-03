import { useState } from 'react';
import type { Chapter, Photo } from '../../content';
import { getPhotoSrc, getPhotoSrcSet, getPhotoSizes, getAspect } from '../../content';

interface PhotoFrameProps {
  photo: Photo;
  chapter: Chapter;
  photoIndex: number;
  totalPhotos: number;
  isFirstChapter: boolean;
}

export default function PhotoFrame({
  photo,
  chapter,
  photoIndex,
  totalPhotos,
  isFirstChapter,
}: PhotoFrameProps) {
  const [hasError, setHasError] = useState(false);
  const [width, height] = getAspect(photo);
  const isPortrait = height > width;
  
  // C2: First two photos of first chapter load eagerly with high priority
  const isEager = isFirstChapter && photoIndex < 2;
  
  // C3: Use caption if available, otherwise trim alt text to first 60 chars
  const captionTitle = photo.caption || (photo.alt.length > 60 ? photo.alt.slice(0, 57) + '...' : photo.alt);

  return (
    <div
      data-photo-id={photo.id}
      data-animate
      className="absolute inset-0 flex items-center justify-center"
      style={{
        // Initial state for GSAP animation
        clipPath: 'inset(100% 0 0 0)',
        transform: 'scale(1.12) translateY(6%)',
      }}
    >
      {/* C1: Clipping wrapper with fixed aspect ratio */}
      <div
        className={`relative overflow-hidden ${
          isPortrait
            ? 'w-[44vw] max-w-[44vw] h-[84vh] max-h-[84vh]'
            : 'w-[78vw] max-w-[78vw] h-[80vh] max-h-[80vh]'
        } ${isPortrait ? (photoIndex % 2 === 0 ? 'md:mr-auto md:pl-[11vw]' : 'md:ml-auto md:pr-[11vw]') : ''}`}
        style={{
          aspectRatio: `${width}/${height}`,
        }}
      >
        {hasError ? (
          // C5: Error placeholder
          <div className="w-full h-full bg-stage-muted/20 flex items-center justify-center p-8">
            <p className="font-mono text-sm text-stage-text/60 text-center">
              {photo.alt}
            </p>
          </div>
        ) : (
          <img
            src={getPhotoSrc(photo, 'large')}
            srcSet={getPhotoSrcSet(photo)}
            sizes={getPhotoSizes('large')}
            alt={photo.alt}
            className="w-full h-full object-cover"
            width={width}
            height={height}
            loading={isEager ? 'eager' : 'lazy'}
            decoding={isEager ? 'sync' : 'async'}
            fetchPriority={isEager ? 'high' : 'auto'}
            onError={() => setHasError(true)}
          />
        )}

        {/* C3: Caption component */}
        <div
          data-caption-id={photo.id}
          className={`absolute ${
            isPortrait
              ? 'bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8'
              : 'bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8'
          }`}
          style={{ opacity: 0 }}
        >
          <p className="font-mono text-xs text-stage-text/80 mb-1">
            {captionTitle}
          </p>
          <div className="flex items-center justify-between font-mono text-xs text-stage-text/60">
            <span>{chapter}</span>
            <span className="tabular-nums">
              {String(photoIndex + 1).padStart(2, '0')} / {String(totalPhotos).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
