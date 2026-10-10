// Content system for Theki Studios
// All content lives here, never inline in components.
// B1.1–B1.7: local images, real dimensions, purpose-based helpers, pre-computed lists.

import { extraPhotos } from './morePhotos';

export type Chapter = 'weddings' | 'cars' | 'photoshoots';

// B1.3: image purposes — each requested only where needed
export type ImagePurpose = 'hero' | 'texture' | 'thumbnail' | 'large';

const PURPOSE_WIDTH: Record<ImagePurpose, number> = {
  hero: 1600,
  texture: 1600,
  thumbnail: 800,
  large: 2400,
};

export interface Photo {
  id: string;
  // B1.1: base name matches the file in public/images (e.g. 'wedding-1')
  // Available files: {baseName}-{width}.webp for each width in `widths`
  baseName: string;
  chapter: Chapter;
  alt: string;
  caption?: string;
  featured: boolean;
  order: number;
  hero?: boolean;
  // B1.2: real pixel dimensions at the largest available size
  width: number;
  height: number;
  // B1.1: available widths (must match files on disk)
  widths: number[];
  capture?: {
    focal?: string;
    aperture?: string;
    shutter?: string;
    iso?: string;
  };
}

export interface Service {
  id: string;
  name: string;
  description: string;
  chapter?: Chapter;
}

// B1.4: hero copy — headline stored as lines so Hero can render them without parsing
export interface HeroCopy {
  label: string;
  headlineLines: string[];
  support: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface Copy {
  studioName: string;
  hero: HeroCopy;
  chapters: Record<Chapter, { title: string; subtitle: string }>;
  contactHeading: string;
  contactText: string;
}

// Feature flags — only flags that are actually wired up
export const flags = {
  SHOW_CAPTURE: true,
};

// [FILL] Social links — add real URLs when available
export const socialLinks = {
  instagram: '', // [FILL]
  facebook: '', // [FILL]
  youtube: '', // [FILL]
};

// [FILL] Contact info
export const contact = {
  email: '', // [FILL]
  phone: '', // [FILL]
  whatsapp: '', // [FILL]
  location: '', // [FILL]
  formEndpoint: '', // [FILL] Formspree or Web3Forms URL
};

// Copy
export const copy: Copy = {
  studioName: 'Theki Studios',
  hero: {
    label: 'Photography & film',
    headlineLines: ['Frames', 'worth', 'keeping.'],
    support: 'Weddings, cars and portraits, shot with patience and finished with care.',
    ctaPrimary: 'View the work',
    ctaSecondary: 'Enquire',
  },
  chapters: {
    weddings: {
      title: 'Weddings',
      subtitle: 'The day held in frames that still feel warm years later.',
    },
    cars: {
      title: 'Cars',
      subtitle: 'Metal, light and the patience to let a machine speak.',
    },
    photoshoots: {
      title: 'Photoshoots',
      subtitle: 'Portraits, couples and editorials made to last.',
    },
  },
  contactHeading: 'Tell us what you\u2019re planning.',
  contactText: 'Share the date, the place and the mood. We\u2019ll write back.',
};

// Services
export const services: Service[] = [
  { id: 'weddings', name: 'Weddings', description: 'Full-day coverage with a documentary eye and a feel for light.', chapter: 'weddings' },
  { id: 'cars', name: 'Cars', description: 'Still and motion work for collectors, dealers and enthusiasts.', chapter: 'cars' },
  { id: 'photoshoots', name: 'Photoshoots', description: 'Portraits, couples, pre-wedding and fashion.', chapter: 'photoshoots' },
  { id: 'films', name: 'Films', description: 'Wedding and event videography with a cinematic approach.' },
  { id: 'events', name: 'Events', description: 'Documentary coverage of launches, dinners and gatherings.' },
];

// B1.1–B1.2: photos with real dimensions and local file names.
// File naming: public/images/{baseName}-{width}.webp
// Widths available: 800, 1600, 2400 (long edge). User converts originals to these.
const ALL_WIDTHS = [800, 1600, 2400];

export const photos: Photo[] = [
  // Weddings (all 3:2 → 2400×1600)
  {
    id: 'w1',
    baseName: 'wedding-1',
    chapter: 'weddings',
    alt: 'A couple standing together in golden hour light, the bride in white and the groom in a dark suit',
    featured: true,
    order: 1,
    hero: true,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '85 mm', aperture: 'f/1.4', shutter: '1/500', iso: '200' },
  },
  {
    id: 'w2',
    baseName: 'wedding-2',
    chapter: 'weddings',
    alt: 'Close-up of intertwined hands wearing wedding rings in soft natural light',
    featured: true,
    order: 2,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '50 mm', aperture: 'f/1.8', shutter: '1/250', iso: '200' },
  },
  {
    id: 'w3',
    baseName: 'wedding-3',
    chapter: 'weddings',
    alt: 'Bride walking down the aisle with dramatic light streaming through tall windows',
    featured: true,
    order: 3,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '35 mm', aperture: 'f/2.0', shutter: '1/160', iso: '400' },
  },
  {
    id: 'w4',
    baseName: 'wedding-4',
    chapter: 'weddings',
    alt: 'Elegant wedding reception table with candles and warm ambient light',
    featured: true,
    order: 4,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '50 mm', aperture: 'f/1.4', shutter: '1/60', iso: '800' },
  },
  // Cars (all 3:2 → 2400×1600)
  {
    id: 'c1',
    baseName: 'car-1',
    chapter: 'cars',
    alt: 'A vintage burgundy Mercedes-Benz SL on a tree-lined road in golden hour light',
    featured: true,
    order: 1,
    hero: true,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '50 mm', aperture: 'f/4.0', shutter: '1/250', iso: '100' },
  },
  {
    id: 'c2',
    baseName: 'car-2',
    chapter: 'cars',
    alt: 'A silver Porsche 911 photographed from a low angle on a mountain road at dusk',
    featured: true,
    order: 2,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '35 mm', aperture: 'f/5.6', shutter: '1/125', iso: '200' },
  },
  {
    id: 'c3',
    baseName: 'car-3',
    chapter: 'cars',
    alt: 'Close-up of a vintage car steering wheel and dashboard with warm leather textures',
    featured: true,
    order: 3,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '85 mm', aperture: 'f/2.8', shutter: '1/60', iso: '400' },
  },
  // Photoshoots (p1 and p3 are 2:3 portraits; p2 is 3:2)
  {
    id: 'p1',
    baseName: 'photoshoot-1',
    chapter: 'photoshoots',
    alt: 'Studio portrait of a woman in elegant dark clothing with dramatic Rembrandt lighting',
    featured: true,
    order: 1,
    hero: true,
    width: 1600,
    height: 2400,
    widths: [800, 1600], // B12.65: Portrait files only have 800 and 1600 widths
    capture: { focal: '85 mm', aperture: 'f/2.0', shutter: '1/125', iso: '100' },
  },
  {
    id: 'p2',
    baseName: 'photoshoot-2',
    chapter: 'photoshoots',
    alt: 'An editorial couple in an urban setting at golden hour, looking at each other',
    featured: true,
    order: 2,
    width: 2400,
    height: 1600,
    widths: ALL_WIDTHS,
    capture: { focal: '50 mm', aperture: 'f/1.8', shutter: '1/320', iso: '200' },
  },
  {
    id: 'p3',
    baseName: 'photoshoot-3',
    chapter: 'photoshoots',
    alt: 'Fashion portrait of a man in a tailored dark suit with dramatic side lighting',
    featured: true,
    order: 3,
    width: 1600,
    height: 2400,
    widths: [800, 1600], // B12.65: Portrait files only have 800 and 1600 widths
    capture: { focal: '85 mm', aperture: 'f/2.8', shutter: '1/125', iso: '100' },
  },
];

// ─── B1.2: derive aspect from real dimensions ────────────────────────────────
export function getAspect(photo: Photo): [number, number] {
  return [photo.width, photo.height];
}

// ─── B1.1 / B1.3: image URL helpers by purpose ──────────────────────────────
function pickWidth(photo: Photo, targetWidth: number): number {
  // Choose the smallest available width that is >= targetWidth.
  // Falls back to the largest available if all are smaller.
  const sorted = [...photo.widths].sort((a, b) => a - b);
  for (const w of sorted) {
    if (w >= targetWidth) return w;
  }
  return sorted[sorted.length - 1];
}

export function getPhotoSrc(photo: Photo, purpose: ImagePurpose): string {
  const w = pickWidth(photo, PURPOSE_WIDTH[purpose]);
  return `/images/${photo.baseName}-${w}.webp`;
}

export function getPhotoSrcSet(photo: Photo): string {
  return photo.widths
    .map((w) => `/images/${photo.baseName}-${w}.webp ${w}w`)
    .join(', ');
}

export function getPhotoSizes(purpose: ImagePurpose): string {
  switch (purpose) {
    case 'hero':
      return '100vw';
    case 'large':
      return '100vw';
    case 'texture':
      return '100vw';
    case 'thumbnail':
      return '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
  }
}

// ─── B1.6: pre-computed, frozen lists ────────────────────────────────────────
// Computed once at module load; same array references every call.

type ChapterMap<T> = Record<Chapter, T>;

function buildChapterMap<T>(fn: (ch: Chapter) => T): ChapterMap<T> {
  return {
    weddings: fn('weddings'),
    cars: fn('cars'),
    photoshoots: fn('photoshoots'),
  };
}

export const photosByChapter: ChapterMap<readonly Photo[]> = Object.freeze(
  buildChapterMap((ch) =>
    Object.freeze(
      [...photos, ...extraPhotos].filter((p) => p.chapter === ch).sort((a, b) => a.order - b.order)
    )
  )
);

export const featuredByChapter: ChapterMap<readonly Photo[]> = Object.freeze(
  buildChapterMap((ch) =>
    Object.freeze(photosByChapter[ch].filter((p) => p.featured))
  )
);

// Backwards-compatible accessors that return the frozen arrays
export function getPhotosByChapter(chapter: Chapter): readonly Photo[] {
  return photosByChapter[chapter];
}

export function getFeaturedPhotos(chapter: Chapter): readonly Photo[] {
  return featuredByChapter[chapter];
}

export function getHeroPhoto(chapter: Chapter): Photo | undefined {
  return photosByChapter[chapter].find((p) => p.hero);
}

// Chapters in order — declared here so helpers below can reference it
export const chapters: Chapter[] = ['weddings', 'cars', 'photoshoots'];

// ─── B1.5: global display order ──────────────────────────────────────────────
// Chapters in declared order, then photo order within each chapter.

export const allPhotosInDisplayOrder: readonly Photo[] = Object.freeze(
  chapters.flatMap((ch) => [...photosByChapter[ch]])
);

// id → index in allPhotosInDisplayOrder (for lightbox prev/next)
const indexById = new Map<string, number>();
allPhotosInDisplayOrder.forEach((p, i) => indexById.set(p.id, i));

export function getPhotoDisplayIndex(photoId: string): number {
  return indexById.get(photoId) ?? -1;
}

export function getPhotoAtDisplayIndex(index: number): Photo | undefined {
  return allPhotosInDisplayOrder[index];
}

// ─── B1.7: dev warnings for missing fields ───────────────────────────────────
export const missingFields: string[] = [
  ...(!socialLinks.instagram ? ['socialLinks.instagram'] : []),
  ...(!socialLinks.facebook ? ['socialLinks.facebook'] : []),
  ...(!socialLinks.youtube ? ['socialLinks.youtube'] : []),
  ...(!contact.email ? ['contact.email'] : []),
  ...(!contact.phone ? ['contact.phone'] : []),
  ...(!contact.whatsapp ? ['contact.whatsapp'] : []),
  ...(!contact.location ? ['contact.location'] : []),
  ...(!contact.formEndpoint ? ['contact.formEndpoint'] : []),
];

if (typeof window !== 'undefined' && import.meta.env.DEV) {
  if (missingFields.length > 0) {
    console.warn('[Theki Studios] Missing content fields:', missingFields.join(', '));
  }
}
