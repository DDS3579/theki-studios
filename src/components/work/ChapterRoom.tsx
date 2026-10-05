import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Chapter, Photo } from '../../content';
import { flags, getPhotoSrc, getPhotoSrcSet, getAspect } from '../../content';

interface PhotoFrameProps {
  photo: Photo;
  chapter: Chapter;
  photoIndex: number;
  totalPhotos: number;
  eager?: boolean;
  // 'stack' = stacked and animated by ChapterRoom, 'flow' = normal page flow (reduced motion)
  variant?: 'stack' | 'flow';
}

const pad = (n: number) => String(n).padStart(2, '0');

function captionOf(photo: Photo): string {
  // Short title: use `caption` if you add one in content, otherwise the first clause of the alt text.
  return photo.caption || photo.alt.split(',')[0];
}

function captureLine(photo: Photo): string | null {
  if (!flags.SHOW_CAPTURE || !photo.capture) return null;
  const c = photo.capture;
  const parts = [c.focal, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null].filter(Boolean);
  return parts.length ? parts.join(' \u00B7 ') : null;
}

export default function PhotoFrame({
  photo,
  chapter,
  photoIndex,
  totalPhotos,
  eager = false,
  variant = 'stack',
}: PhotoFrameProps) {
  const [hasError, setHasError] = useState(false);
  const [w, h] = getAspect(photo);
  const aspect = w / h;
  const isPortrait = h > w;
  const stacked = variant === 'stack';
  const capture = captureLine(photo);

  // Click or tap opens the full-screen viewer (the lightbox lives in Archive.tsx).
  const openViewer = () =>
    window.dispatchEvent(new CustomEvent('theki:open-photo', { detail: photo.id }));

  // The frame is sized so the WHOLE photograph always fits the screen (never cropped).
  // Width = the smaller of a width limit and (height limit x aspect ratio). See .photo-frame in index.css.
  const frameStyle = {
    '--ar': aspect,
    '--wm': isPortrait ? '80vw' : '92vw',
    '--hm': isPortrait ? '68svh' : '62svh',
    '--wd': isPortrait ? '42vw' : '78vw',
    '--hd': isPortrait ? '78svh' : '76svh',
  } as CSSProperties;

  // Portraits sit slightly off-centre on desktop, alternating sides.
  const side = isPortrait && stacked ? (photoIndex % 2 === 0 ? 'md:mr-[24vw]' : 'md:ml-[24vw]') : '';

  const figure = (
    <figure
      data-figure
      className={`photo-frame pointer-events-auto relative m-0 ${stacked ? '' : 'mx-auto'} ${side}`}
      style={frameStyle}
    >
      <button
        type="button"
        onClick={openViewer}
        className="block w-full cursor-zoom-in text-left"
        aria-label={`Open full screen: ${captionOf(photo)}`}
      >
        <div
          data-reveal
          className="relative w-full overflow-hidden bg-stage-muted/10"
          style={{
            aspectRatio: `${w} / ${h}`,
            ...(stacked ? { clipPath: 'inset(100% 0% 0% 0%)' } : {}),
          }}
        >
          {hasError ? (
            <div className="flex h-full w-full items-center justify-center p-8">
              <p className="text-center font-mono text-sm text-stage-muted">{photo.alt}</p>
            </div>
          ) : (
            <img
              data-img
              src={getPhotoSrc(photo, 'large')}
              srcSet={getPhotoSrcSet(photo)}
              sizes={isPortrait ? '(max-width: 768px) 80vw, 42vw' : '(max-width: 768px) 92vw, 78vw'}
              alt={photo.alt}
              width={w}
              height={h}
              className="block h-full w-full object-cover"
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={eager ? 'high' : 'auto'}
              onError={() => setHasError(true)}
            />
          )}
        </div>
      </button>

      {/* Caption sits BELOW the photograph, never on top of it */}
      <figcaption
        data-caption
        className={stacked ? 'absolute left-0 right-0 top-full pt-3' : 'pt-3'}
        style={stacked ? { opacity: 0, visibility: 'hidden' } : undefined}
      >
        <div className="flex items-baseline justify-between gap-4 font-mono text-[12px] uppercase tracking-[0.14em] text-stage-text">
          <span>{captionOf(photo)}</span>
          <span className="tabular-nums text-stage-muted">
            {pad(photoIndex + 1)} / {pad(totalPhotos)}
          </span>
        </div>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-stage-muted">
          {chapter}
          {capture ? <span className="hidden md:inline">{` \u00B7 ${capture}`}</span> : null}
        </p>
      </figcaption>
    </figure>
  );

  if (!stacked) return figure;

  return (
    <div
      data-photo-id={photo.id}
      data-animate
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      style={{ visibility: 'hidden' }}
    >
      {figure}
    </div>
  );
}