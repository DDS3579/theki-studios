import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Chapter, Photo } from '../../content';
import { getPhotoSrc } from '../../content';
import PhotoFrame from './PhotoFrame';
import {
  CHAPTER_OPENING_LENGTH,
  SEGMENT_LENGTH_PER_PHOTO,
  EASING,
} from '../../lib/motion';

gsap.registerPlugin(ScrollTrigger);

interface ChapterRoomProps {
  chapter: Chapter;
  title: string;
  subtitle: string;
  photos: readonly Photo[];
  chapterIndex: number;
  totalChapters: number;
}

export default function ChapterRoom({
  chapter,
  title,
  subtitle,
  photos,
  chapterIndex,
  totalChapters,
}: ChapterRoomProps) {
  const roomRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);

  // Calculate total scroll length
  const openingLength = CHAPTER_OPENING_LENGTH;
  const photosLength = photos.length * SEGMENT_LENGTH_PER_PHOTO;
  const closingHold = SEGMENT_LENGTH_PER_PHOTO * 0.5;
  const totalLength = openingLength + photosLength + closingHold;

  useGSAP(() => {
    if (!roomRef.current || !titleRef.current || !ruleRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: roomRef.current,
          start: 'top top',
          end: `+=${totalLength}vh`,
          pin: true,
          pinSpacing: true,
          scrub: true, // Use scrub: true, not a number, to avoid double smoothing with Lenis
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: () => {
            roomRef.current?.querySelectorAll('[data-animate]').forEach(el => {
              (el as HTMLElement).style.willChange = 'transform, opacity, clip-path';
            });
          },
          onLeave: () => {
            roomRef.current?.querySelectorAll('[data-animate]').forEach(el => {
              (el as HTMLElement).style.willChange = 'auto';
            });
          },
          onEnterBack: () => {
            roomRef.current?.querySelectorAll('[data-animate]').forEach(el => {
              (el as HTMLElement).style.willChange = 'transform, opacity, clip-path';
            });
          },
          onLeaveBack: () => {
            roomRef.current?.querySelectorAll('[data-animate]').forEach(el => {
              (el as HTMLElement).style.willChange = 'auto';
            });
          },
        },
      });

      // Opening: title mask rise-in
      tl.fromTo(
        titleRef.current,
        { y: '100%', opacity: 0 },
        {
          y: '0%',
          opacity: 1,
          duration: openingLength * 0.4,
          ease: EASING,
        },
        0
      );

      // Rule draws from left to right
      tl.fromTo(
        ruleRef.current,
        { scaleX: 0, transformOrigin: 'left center' },
        {
          scaleX: 1,
          duration: openingLength * 0.3,
          ease: EASING,
        },
        openingLength * 0.3
      );

      // Title lifts and fades as first photo begins
      tl.to(
        titleRef.current,
        {
          y: '-4vh',
          opacity: 0,
          duration: openingLength * 0.3,
          ease: EASING,
        },
        openingLength * 0.7
      );

      // Animate each photo
      let currentTime = openingLength;

      photos.forEach((photo, index) => {
        const photoElement = document.querySelector(`[data-photo-id="${photo.id}"]`);
        const captionElement = document.querySelector(`[data-caption-id="${photo.id}"]`);
        
        if (!photoElement) return;

        const enterWindow = SEGMENT_LENGTH_PER_PHOTO * 0.4; // 40% for enter
        const dwellTime = SEGMENT_LENGTH_PER_PHOTO * (1 / 3); // 1/3 for dwell
        const exitTime = SEGMENT_LENGTH_PER_PHOTO - enterWindow - dwellTime;

        // Photo enter: mask reveal, scale 112% → 100%, offset +6% → 0%
        tl.fromTo(
          photoElement,
          {
            clipPath: 'inset(100% 0 0 0)',
            scale: 1.12,
            y: '6%',
          },
          {
            clipPath: 'inset(0% 0 0 0)',
            scale: 1,
            y: '0%',
            duration: enterWindow,
            ease: EASING,
          },
          currentTime
        );

        // Caption fade in
        if (captionElement) {
          tl.fromTo(
            captionElement,
            { opacity: 0 },
            {
              opacity: 1,
              duration: 0.2,
              ease: EASING,
            },
            currentTime + enterWindow + 0.2
          );
        }

        // Dwell: scale 100% → 102%, offset 0% → -2%
        tl.to(
          photoElement,
          {
            scale: 1.02,
            y: '-2%',
            duration: dwellTime,
            ease: 'none',
          },
          currentTime + enterWindow
        );

        // Push back when next photo enters (if not last photo)
        if (index < photos.length - 1) {
          tl.to(
            photoElement,
            {
              opacity: 0.55,
              y: '-6vh',
              scale: 0.97,
              duration: exitTime,
              ease: EASING,
            },
            currentTime + enterWindow + dwellTime
          );

          // Caption fade out
          if (captionElement) {
            tl.to(
              captionElement,
              {
                opacity: 0,
                duration: 0.2,
                ease: EASING,
              },
              currentTime + enterWindow + dwellTime
            );
          }
        } else {
          // Last photo: dwell then fade out
          tl.to(
            photoElement,
            {
              opacity: 0,
              duration: SEGMENT_LENGTH_PER_PHOTO * 0.12,
              ease: EASING,
            },
            currentTime + enterWindow + dwellTime
          );
        }

        currentTime += SEGMENT_LENGTH_PER_PHOTO;
      });
    }, roomRef.current);

    return () => ctx.revert();
  }, [photos, totalLength, openingLength]);

  // C2: Preload next photo when current photo's enter window begins
  useEffect(() => {
    if (!roomRef.current) return;

    const handleScroll = () => {
      const rect = roomRef.current!.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Calculate which photo is currently in view
      const scrollProgress = -rect.top / (rect.height - viewportHeight);
      const photoProgress = (scrollProgress * totalLength - openingLength) / SEGMENT_LENGTH_PER_PHOTO;
      const currentPhotoIndex = Math.floor(photoProgress);
      
      // Preload next photo when current photo is at 40% through its enter window
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

  return (
    <div
      ref={roomRef}
      id={`chapter-${chapter}`}
      className="relative"
      style={{ height: `${totalLength}svh` }}
      data-chapter={chapter}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex items-center justify-center">
        {/* Chapter title */}
        <div
          ref={titleRef}
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        >
          <h2 className="font-display text-6xl md:text-8xl font-bold uppercase tracking-tight text-stage-text mb-4">
            {title}
          </h2>
          <div
            ref={ruleRef}
            className="w-24 h-px bg-brass mb-4"
          />
          <p className="font-sans text-sm text-stage-muted max-w-md text-center px-4">
            {subtitle}
          </p>
          <p className="font-mono text-xs text-stage-muted mt-4">
            {String(chapterIndex + 1).padStart(2, '0')} / {String(totalChapters).padStart(2, '0')}
          </p>
        </div>

        {/* C4: Ordered list for structure */}
        <ol className="relative w-full h-full list-none p-0 m-0">
          {photos.map((photo, photoIndex) => (
            <li key={photo.id} className="absolute inset-0">
              <PhotoFrame
                photo={photo}
                chapter={chapter}
                photoIndex={photoIndex}
                totalPhotos={photos.length}
                isFirstChapter={chapterIndex === 0}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
