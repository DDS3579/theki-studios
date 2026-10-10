import { useCallback, useEffect, useRef } from 'react';
import { copy, flags, getAspect, getPhotoSrc } from '../content';
import type { Photo } from '../content';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

interface ViewerProps {
  photos: readonly Photo[]; // the photos the visitor can step through (respects the wall filter)
  openId: string | null; // id of the open photo, or null when closed
  onChange: (id: string | null) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

function captionOf(photo: Photo): string {
  return photo.caption ?? photo.alt.split(',')[0];
}

function captureOf(photo: Photo): string | null {
  if (!flags.SHOW_CAPTURE || !photo.capture) return null;
  const c = photo.capture;
  const parts = [c.focal, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null].filter(Boolean);
  return parts.length ? parts.join(' \u00B7 ') : null;
}

export default function Viewer({ photos, openId, onChange }: ViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);

  const count = photos.length;
  const index = openId ? photos.findIndex((p) => p.id === openId) : -1;
  const photo = index >= 0 ? photos[index] : null;
  const isOpen = photo !== null;

  const go = useCallback(
    (delta: number) => {
      if (index < 0 || count === 0) return;
      onChange(photos[(index + delta + count) % count].id);
    },
    [index, count, photos, onChange]
  );

  // Open and close the native dialog, and lock page scrolling while it is open
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    if (!dialog.open) dialog.showModal();
    lockScroll('viewer');
    return () => {
      unlockScroll('viewer');
      if (dialog.open) dialog.close();
    };
  }, [isOpen]);

  // Arrow keys (Escape is handled by the dialog itself)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, go]);

  // Load the neighbouring photos ahead of time so stepping feels instant
  useEffect(() => {
    if (!isOpen || count < 2) return;
    [1, -1].forEach((d) => {
      const next = photos[(index + d + count) % count];
      const img = new Image();
      img.src = getPhotoSrc(next, 'large');
    });
  }, [isOpen, index, count, photos]);

  const [w, h] = photo ? getAspect(photo) : [3, 2];
  const capture = photo ? captureOf(photo) : null;

  return (
    <dialog
      ref={dialogRef}
      onClose={() => onChange(null)}
      aria-label="Photograph viewer"
      className="fixed inset-0 m-0 h-dvh w-full max-h-none max-w-none bg-transparent p-0"
    >
      {photo && (
        <div className="flex h-full w-full flex-col bg-stage/95 text-stage-text">
          <div className="flex items-center justify-between px-5 py-3 md:px-10 md:py-4">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="-ml-2 px-2 py-2 font-mono text-[12px] uppercase tracking-[0.18em] text-stage-text transition-colors duration-200 hover:text-brass"
            >
              Close
            </button>
            <span className="font-mono text-[12px] tabular-nums text-stage-muted">
              {pad(index + 1)} / {pad(count)}
            </span>
          </div>

          <div
            className="flex min-h-0 flex-1 items-center justify-center px-4 md:px-16"
            onClick={(e) => {
              if (e.target === e.currentTarget) onChange(null);
            }}
            onPointerDown={(e) => {
              touchStartX.current = e.pointerType === 'touch' ? e.clientX : null;
            }}
            onPointerUp={(e) => {
              if (touchStartX.current === null) return;
              const dx = e.clientX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
            }}
          >
            <img
              key={photo.id}
              src={getPhotoSrc(photo, 'large')}
              alt={photo.alt}
              width={w}
              height={h}
              className="max-h-[calc(100dvh-10rem)] max-w-full object-contain"
            />
          </div>

          <div className="flex items-end justify-between gap-6 px-5 py-4 md:px-10 md:py-6">
            <div className="min-w-0">
              <p className="truncate font-mono text-[12px] uppercase tracking-[0.14em] text-stage-text">
                {captionOf(photo)}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-stage-muted">
                {copy.chapters[photo.chapter].title}
                {capture ? ` \u00B7 ${capture}` : ''}
              </p>
            </div>
            {count > 1 && (
              <div className="flex shrink-0 gap-2 font-mono text-[12px] uppercase tracking-[0.18em]">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="px-3 py-2 text-stage-text transition-colors duration-200 hover:text-brass"
                  aria-label="Previous photograph"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="px-3 py-2 text-stage-text transition-colors duration-200 hover:text-brass"
                  aria-label="Next photograph"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
