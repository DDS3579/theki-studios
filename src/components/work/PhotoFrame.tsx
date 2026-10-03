import type { Chapter, Photo } from '../../content';
import { getPhotoSrc, getPhotoSrcSet, getPhotoSizes, getAspect } from '../../content';

interface PhotoFrameProps {
  photo: Photo;
  chapter: Chapter;
  chapterIndex: number;
  totalPhotos: number;
}

export default function PhotoFrame({
  photo,
  chapter,
  chapterIndex,
  totalPhotos,
}: PhotoFrameProps) {
  const [width, height] = getAspect(photo);
  const isPortrait = height > width;

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
      <div
        className={`relative ${
          isPortrait
            ? 'w-[44vw] h-[84vh] md:w-[44vw] md:h-[84vh]'
            : 'w-[78vw] h-[80vh] md:w-[78vw] md:h-[80vh]'
        } ${isPortrait ? (chapterIndex % 2 === 0 ? 'md:mr-auto md:pl-[11vw]' : 'md:ml-auto md:pr-[11vw]') : ''}`}
      >
        <img
          src={getPhotoSrc(photo, 'large')}
          srcSet={getPhotoSrcSet(photo)}
          sizes={getPhotoSizes('large')}
          alt={photo.alt}
          className="w-full h-full object-cover"
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />

        {/* Caption */}
        <div
          data-caption-id={photo.id}
          className="absolute bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6"
          style={{ opacity: 0 }}
        >
          <p className="font-mono text-xs text-stage-text/80">
            {photo.alt}
          </p>
          <p className="font-mono text-xs text-stage-text/60 mt-1">
            {chapter} — {String(chapterIndex + 1).padStart(2, '0')} / {String(totalPhotos).padStart(2, '0')}
          </p>
        </div>
      </div>
    </div>
  );
}
