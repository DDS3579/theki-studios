// Add new photographs here. One line per photo. The wall gets longer by itself.
//
// 1. Run `node scripts/make-photo-sizes.mjs` (or make the WebP sizes yourself).
//    It creates files like  public/images/wedding-5-800.webp, -1600.webp, -2400.webp
//    and prints the exact line to paste below.
// 2. Paste the line inside the list, write the alt text (what is in the photo), save.
//
// add(fileName, chapter, altText, width, height, options)
//   fileName  name of the files in public/images without the size, e.g. 'wedding-5'
//   chapter   'weddings' | 'cars' | 'photoshoots'
//   altText   one plain sentence describing the photo (used by screen readers and as caption)
//   width, height  real pixel size of the LARGEST file you made
//   options   optional: { caption, capture, featured, widths }
//             caption = short title shown under the photo (default: first part of the alt text)
//             capture = { focal: '85 mm', aperture: 'f/1.8', shutter: '1/250', iso: '200' }
//             featured: false hides a photo from the site

import type { Chapter, Photo } from './index';

interface AddOptions {
  caption?: string;
  capture?: Photo['capture'];
  featured?: boolean;
  widths?: number[];
}

let counter = 0;

function add(
  baseName: string,
  chapter: Chapter,
  alt: string,
  width: number,
  height: number,
  options: AddOptions = {}
): Photo {
  counter += 1;
  // Sizes that exist on disk: all of 800 / 1600 / 2400 that are not wider than the largest file
  const widths = options.widths ?? [800, 1600, 2400].filter((w) => w <= width);
  return {
    id: `x${counter}-${baseName}`,
    baseName,
    chapter,
    alt,
    caption: options.caption,
    featured: options.featured ?? true,
    order: 100 + counter, // always after the original photos of the same chapter
    width,
    height,
    widths: widths.length ? widths : [width],
    capture: options.capture,
  };
}

export const extraPhotos: Photo[] = [
  // Example (delete the two slashes to use it):
  // add('wedding-5', 'weddings', 'The couple laughing during the first dance', 2400, 1600),
];

// Keeps the helper used even while the list above is empty
void add;
