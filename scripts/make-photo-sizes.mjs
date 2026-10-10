// Makes the WebP sizes the website needs from your original photographs.
//
// Setup (once):   npm install -D sharp
// Use:            1. put your original JPG / PNG files in a folder called  photos-original
//                    (name them like you want the files called, e.g. wedding-5.jpg, car-4.jpg)
//                 2. run:  node scripts/make-photo-sizes.mjs
//                 3. copy the printed lines into  src/content/morePhotos.ts
//
// Landscape photos get 800 / 1600 / 2400 px wide, portrait photos get 800 / 1600 px wide.
// Originals narrower than that are skipped with a message (they would look soft).

import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const INPUT = 'photos-original';
const OUTPUT = 'public/images';
const LANDSCAPE_WIDTHS = [800, 1600, 2400];
const PORTRAIT_WIDTHS = [800, 1600];
const QUALITY = 80;

let files;
try {
  files = (await readdir(INPUT)).filter((f) => /\.(jpe?g|png|webp|tiff?)$/i.test(f)).sort();
} catch {
  console.error(`Folder "${INPUT}" not found. Create it next to package.json and put your originals inside.`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`No images found in "${INPUT}".`);
  process.exit(1);
}

await mkdir(OUTPUT, { recursive: true });
const lines = [];

for (const file of files) {
  const source = path.join(INPUT, file);
  const baseName = path
    .parse(file)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Real size after applying the camera's rotation flag
  const meta = await sharp(source).metadata();
  const swapped = meta.orientation !== undefined && meta.orientation >= 5;
  const width = swapped ? meta.height : meta.width;
  const height = swapped ? meta.width : meta.height;
  if (!width || !height) {
    console.warn(`Skipped ${file}: could not read its size.`);
    continue;
  }

  const portrait = height > width;
  const widths = (portrait ? PORTRAIT_WIDTHS : LANDSCAPE_WIDTHS).filter((w) => w <= width);
  if (widths.length < (portrait ? PORTRAIT_WIDTHS : LANDSCAPE_WIDTHS).length) {
    const need = (portrait ? PORTRAIT_WIDTHS : LANDSCAPE_WIDTHS).at(-1);
    console.warn(`Skipped ${file}: it is ${width}px wide but at least ${need}px is needed. Use a bigger original.`);
    continue;
  }

  let largest = null;
  for (const w of widths) {
    const info = await sharp(source)
      .rotate()
      .resize({ width: w })
      .webp({ quality: QUALITY })
      .toFile(path.join(OUTPUT, `${baseName}-${w}.webp`));
    largest = info;
  }
  console.log(`OK  ${file} -> ${widths.map((w) => `${baseName}-${w}.webp`).join(', ')}`);
  lines.push(`  add('${baseName}', 'weddings', 'DESCRIBE THE PHOTO HERE', ${largest.width}, ${largest.height}),`);
}

if (lines.length) {
  console.log('\nPaste these lines into src/content/morePhotos.ts (inside extraPhotos).');
  console.log("Change 'weddings' to 'cars' or 'photoshoots' where needed and write the description:\n");
  console.log(lines.join('\n'));
}
