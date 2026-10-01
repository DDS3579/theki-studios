// Content system for Theki Studios
// All content lives here, never inline in components.

export type Chapter = 'weddings' | 'cars' | 'photoshoots';

export interface Photo {
  id: string;
  src: string;
  chapter: Chapter;
  alt: string;
  caption?: string;
  featured: boolean;
  order: number;
  hero?: boolean;
  aspect: [number, number]; // [width, height]
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

export interface Copy {
  heroLabel: string;
  heroHeadline: string;
  heroSupport: string;
  ctaPrimary: string;
  ctaSecondary: string;
  chapters: Record<Chapter, { title: string; subtitle: string }>;
  contactHeading: string;
  contactText: string;
}

// Feature flags
export const flags = {
  SHOW_TESTIMONIALS: false,
  SHOW_GEAR: false,
  SHOW_CAPTURE: true,
};

// [FILL] Social links - add real URLs when available
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
  heroLabel: 'Photography & film',
  heroHeadline: 'Frames worth keeping.',
  heroSupport: 'Weddings, cars and portraits, shot with patience and finished with care.',
  ctaPrimary: 'View the work',
  ctaSecondary: 'Enquire',
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

// Photos
export const photos: Photo[] = [
  // Weddings
  {
    id: 'w1',
    src: 'https://image.qwenlm.ai/generated-images/74c1b440-ca1e-430d-9aee-1c1e0faeff21/_result.png',
    chapter: 'weddings',
    alt: 'A couple standing together in golden hour light, the bride in white and the groom in a dark suit',
    featured: true,
    order: 1,
    hero: true,
    aspect: [3, 2],
    capture: { focal: '85 mm', aperture: 'f/1.4', shutter: '1/500', iso: '200' },
  },
  {
    id: 'w2',
    src: 'https://image.qwenlm.ai/generated-images/3e72a02f-065e-48e0-8bb9-5ed4f183f782/_result.png',
    chapter: 'weddings',
    alt: 'Close-up of intertwined hands wearing wedding rings in soft natural light',
    featured: true,
    order: 2,
    aspect: [3, 2],
    capture: { focal: '50 mm', aperture: 'f/1.8', shutter: '1/250', iso: '200' },
  },
  {
    id: 'w3',
    src: 'https://image.qwenlm.ai/generated-images/bef8dc31-c434-4a19-b918-0c3eb37ae08c/_result.png',
    chapter: 'weddings',
    alt: 'Bride walking down the aisle with dramatic light streaming through tall windows',
    featured: true,
    order: 3,
    aspect: [3, 2],
    capture: { focal: '35 mm', aperture: 'f/2.0', shutter: '1/160', iso: '400' },
  },
  {
    id: 'w4',
    src: 'https://image.qwenlm.ai/generated-images/17ce222a-4810-49ab-8441-c3a366397daa/_result.png',
    chapter: 'weddings',
    alt: 'Elegant wedding reception table with candles and warm ambient light',
    featured: true,
    order: 4,
    aspect: [3, 2],
    capture: { focal: '50 mm', aperture: 'f/1.4', shutter: '1/60', iso: '800' },
  },
  // Cars
  {
    id: 'c1',
    src: 'https://image.qwenlm.ai/generated-images/c280aef0-4cb6-4251-aa95-8e9b80ba205d/_result.png',
    chapter: 'cars',
    alt: 'A vintage burgundy Mercedes-Benz SL on a tree-lined road in golden hour light',
    featured: true,
    order: 1,
    hero: true,
    aspect: [3, 2],
    capture: { focal: '50 mm', aperture: 'f/4.0', shutter: '1/250', iso: '100' },
  },
  {
    id: 'c2',
    src: 'https://image.qwenlm.ai/generated-images/d956dab2-7c72-447b-bcbd-218c2402c1a1/_result.png',
    chapter: 'cars',
    alt: 'A silver Porsche 911 photographed from a low angle on a mountain road at dusk',
    featured: true,
    order: 2,
    aspect: [3, 2],
    capture: { focal: '35 mm', aperture: 'f/5.6', shutter: '1/125', iso: '200' },
  },
  {
    id: 'c3',
    src: 'https://image.qwenlm.ai/generated-images/f0910207-ef15-4f67-b98d-596e44032183/_result.png',
    chapter: 'cars',
    alt: 'Close-up of a vintage car steering wheel and dashboard with warm leather textures',
    featured: true,
    order: 3,
    aspect: [3, 2],
    capture: { focal: '85 mm', aperture: 'f/2.8', shutter: '1/60', iso: '400' },
  },
  // Photoshoots
  {
    id: 'p1',
    src: 'https://image.qwenlm.ai/generated-images/0ace7448-e61d-412b-af86-04a8385c31ec/_result.png',
    chapter: 'photoshoots',
    alt: 'Studio portrait of a woman in elegant dark clothing with dramatic Rembrandt lighting',
    featured: true,
    order: 1,
    hero: true,
    aspect: [2, 3],
    capture: { focal: '85 mm', aperture: 'f/2.0', shutter: '1/125', iso: '100' },
  },
  {
    id: 'p2',
    src: 'https://image.qwenlm.ai/generated-images/63542558-63cf-4563-a209-7636ecf6d91f/_result.png',
    chapter: 'photoshoots',
    alt: 'An editorial couple in an urban setting at golden hour, looking at each other',
    featured: true,
    order: 2,
    aspect: [3, 2],
    capture: { focal: '50 mm', aperture: 'f/1.8', shutter: '1/320', iso: '200' },
  },
  {
    id: 'p3',
    src: 'https://image.qwenlm.ai/generated-images/258cc257-abcd-4181-b81f-6293b5eb363b/_result.png',
    chapter: 'photoshoots',
    alt: 'Fashion portrait of a man in a tailored dark suit with dramatic side lighting',
    featured: true,
    order: 3,
    aspect: [2, 3],
    capture: { focal: '85 mm', aperture: 'f/2.8', shutter: '1/125', iso: '100' },
  },
];

// Get photos by chapter
export function getPhotosByChapter(chapter: Chapter): Photo[] {
  return photos
    .filter((p) => p.chapter === chapter)
    .sort((a, b) => a.order - b.order);
}

export function getFeaturedPhotos(chapter: Chapter): Photo[] {
  return getPhotosByChapter(chapter).filter((p) => p.featured);
}

export function getHeroPhoto(chapter: Chapter): Photo | undefined {
  return getPhotosByChapter(chapter).find((p) => p.hero);
}

// Chapters in order
export const chapters: Chapter[] = ['weddings', 'cars', 'photoshoots'];

// [FILL] list for dev warnings
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

// Log missing fields in development
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  if (missingFields.length > 0) {
    console.warn('[Theki Studios] Missing content fields:', missingFields.join(', '));
  }
}
