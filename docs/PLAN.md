# Theki Studios - Quiet Gallery

A calm, professional photography portfolio built with Vite, React 18, TypeScript, and Tailwind CSS v4. The site presents work through a scroll-driven DOM gallery with GSAP animations, prioritizing the photographs themselves over technical effects.

## Design Philosophy

**The Quiet Gallery**: A restrained, editorial approach where photographs are the interface. Motion is slow, tied directly to scroll position, and uses a single easing family. No film grain, particles, lens flares, or tech-demo effects. The work speaks for itself.

### Core Principles

1. **Photos are large and sharp** - Never blurred, filtered, or distorted
2. **Motion is calm** - Slow reveals, gentle parallax (≤6%), subtle scale settles (≤12%)
3. **Scroll-linked** - All animation tied to scroll position, no timers racing the scroll
4. **Universal** - Identical behavior on desktop and mobile, no separate fallbacks needed
5. **Accessible** - Full keyboard navigation, screen reader support, reduced motion respect

## Motion Language

One restrained motion vocabulary:

- **Slide**: Elements move vertically or horizontally
- **Reveal**: Mask-based reveals using scaled wrappers (Safari-compatible)
- **Scale settle**: Images settle from 112% to 100% on enter
- **Gentle parallax**: Maximum 6% of frame height
- **Dim**: Previous photos dim to 55% brightness as next arrives

### Prohibited Effects

- No film grain, glitch, chromatic split, flicker, noise, scanlines
- No particles, dust, bokeh, lens flares, glow, neon
- No REC dots, timecodes, fake camera HUD
- No blur filters on photos
- No 3D tilt or rotation
- No looping or idle animations
- No custom cursor, text scramble, typewriter effects

## Architecture

### Technology Stack

- **Vite** - Build tooling
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **GSAP + ScrollTrigger** - Scroll-driven animations
- **Lenis** - Smooth scrolling (desktop only)

### File Structure

```
src/
├── components/
│   ├── Header.tsx           # Fixed header with theme switching
│   ├── Hero.tsx             # Hero with GSAP intro
│   ├── Work.tsx             # Main work section
│   ├── work/
│   │   ├── ChapterRoom.tsx  # Pinned chapter container
│   │   ├── PhotoFrame.tsx   # Individual photo with animations
│   │   └── WorkProgress.tsx # Progress indicator
│   ├── Archive.tsx          # Justified grid with lightbox
│   ├── Services.tsx         # Service list
│   ├── Contact.tsx          # Contact form
│   └── Footer.tsx           # Footer
├── lib/
│   ├── motion.ts            # All tuning constants
│   ├── smoothScroll.ts      # Lenis integration
│   ├── scrollLock.ts        # Dialog scroll locking
│   ├── scrollTo.ts          # Navigation helpers
│   ├── gate.ts              # Capability detection
│   └── useScrollReveal.ts   # Reveal hook
└── content/
    └── index.ts             # All content (photos, copy, services)
```

### Key Components

#### Work Section

The Work section is a scroll-driven gallery with three chapters (Weddings, Cars, Photoshoots). Each chapter is a "room" that pins while the visitor scrolls through it.

**Chapter Structure**:
- **Opening** (60vh): Chapter title rises in, rule draws, subtitle appears
- **Photos** (90vh each): Mask reveal, scale settle, gentle parallax
- **Dwell** (33% of photo): Photo rests with subtle 2% scale drift
- **Transition**: Previous photo dims and pushes back as next arrives

**Animation Timeline** (per photo):
1. **Enter** (40%): Wrapper scales from 0 to 1 (reveal), image scales 112% → 100%, offset +6% → 0%
2. **Dwell** (33%): Scale 100% → 102%, offset 0% → -2%
3. **Exit** (27%): Opacity 100% → 55%, offset 0% → -6vh, scale 102% → 97%

#### PhotoFrame

Each photo uses a Safari-compatible reveal technique:
- Outer wrapper: Handles scale and position animations
- Inner wrapper: `overflow-hidden` with `scaleY` animation (0 → 1)
- Image: Fills wrapper with `object-fit: cover`

This avoids `clip-path` which can be choppy in Safari.

#### Header

The header switches between light text (over dark sections) and dark text (over light sections) using ScrollTrigger to detect which section is under the header. No blur effects.

#### Progress Indicator

A thin vertical line on the right edge shows overall progress through the Work section. Three chapter ticks with 24px hit areas allow navigation. A counter shows "03 / 10" format.

## Tuning Constants

All motion values are centralized in `src/lib/motion.ts`:

```typescript
// Easing
export const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Durations
export const REVEAL_DURATION = 0.8; // seconds
export const CHAPTER_OPENING_LENGTH = 60; // vh
export const SEGMENT_LENGTH_PER_PHOTO = 90; // vh

// Animation phases
export const ENTER_WINDOW = 0.4; // 40% of photo range
export const DWELL_FRACTION = 1 / 3; // 33% of photo range
export const PARALLAX_AMOUNT = 0.06; // 6% of frame height
export const ENTER_ZOOM = 1.12; // 112% scale on enter
export const DIM_AMOUNT = 0.55; // 55% brightness when dimmed
export const PUSH_BACK_DISTANCE = 6; // vh units
export const PUSH_BACK_SCALE = 0.97; // 97% scale

// Chapter transitions
export const CHAPTER_END_FADE = 0.12; // 12% of last photo range
export const CAPTION_DELAY = 0.2; // seconds

// Smooth scroll
export const LENIS_LERP = 0.09;
export const LENIS_WHEEL_SPEED = 1;
export const HEADER_HEIGHT = 80; // pixels
```

## Performance

### Bundle Size

- **Total JavaScript**: ~110 KB gzipped
- **CSS**: ~7.5 KB gzipped
- **HTML**: ~0.9 KB gzipped
- **Total**: ~118 KB gzipped

### Performance Targets

- **Lighthouse Performance**: 90+ on desktop
- **Largest Contentful Paint**: < 2.5s on fast connection
- **Frame Rate**: 55-60 fps through Work section
- **Long Tasks**: None over 50ms while scrolling
- **Idle**: Main thread quiet when not scrolling

### Optimization Techniques

1. **GPU-accelerated properties only** - transform, opacity, clip-path
2. **Will-change management** - Applied via ScrollTrigger callbacks, removed when not needed
3. **Lazy loading** - Photos load on demand with priority hints
4. **Responsive images** - srcSet with multiple sizes (800, 1600, 2400px)
5. **Efficient scroll handling** - Lenis with GSAP ticker integration
6. **No layout thrashing** - All animations use composite-only properties

## Accessibility

### Keyboard Navigation

- All links and buttons focusable with visible focus rings
- Page scrolls with keyboard (Page Up/Down, Home/End, Space)
- Dialogs trap focus and return it on close
- Chapter ticks are buttons with descriptive labels

### Screen Readers

- Semantic HTML structure
- One heading per chapter (`<h2>`)
- Photos in ordered lists with alt text
- Progress rail is a navigation landmark
- Counter marked as decorative (`aria-hidden`)

### Reduced Motion

When `prefers-reduced-motion` is enabled:
- No pinning or scrubbing
- No Lenis smooth scrolling
- Simple fade-in animations only
- Each photo fades in once (opacity 0 → 1)
- Title fades in with 20px upward movement

### Contrast

- Minimum 12px text size for all captions
- Drop shadow for better contrast on photos
- High contrast color choices (WCAG AA compliant)

## Content Management

### Adding Photos

1. Convert images to WebP at 800/1600/2400px widths
2. Place in `public/images/{baseName}-{width}.webp`
3. Add entry to `src/content/index.ts`:

```typescript
{
  id: 'unique-id',
  baseName: 'photo-name',
  chapter: 'weddings' | 'cars' | 'photoshoots',
  alt: 'Descriptive alt text',
  caption: 'Optional caption',
  featured: true,
  order: 1,
  width: 2400,
  height: 1600,
  widths: [800, 1600, 2400],
  capture: {
    focal: '50 mm',
    aperture: 'f/2.8',
    shutter: '1/250',
    iso: '200'
  }
}
```

### Editing Copy

All text is in `src/content/index.ts`:
- `copy.studioName` - Studio name
- `copy.hero` - Hero section
- `copy.chapters` - Chapter titles and subtitles
- `services` - Service list
- `socialLinks` - Social media URLs
- `contact` - Contact information

## Browser Support

### Desktop

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Mobile

- iOS Safari 14+
- Android Chrome 90+
- Samsung Internet 14+

### Features

- Smooth scrolling (Lenis) on desktop
- Native touch scrolling on mobile
- Safari-compatible reveal animations (no clip-path)
- Responsive design (320px to 2560px+)

## Development

### Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Type Check

```bash
npm run typecheck
```

## Deployment

### Vercel

1. Push to GitHub
2. Import project in Vercel
3. Deploy (automatic on push)

### Environment Variables

Optional:
- `VITE_FORMSPREE_ENDPOINT` - Contact form endpoint

## Design Tokens

### Colors

```css
--color-paper: #F0E8D1        /* Background */
--color-ink: #433021           /* Primary text */
--color-ink-soft: #695748      /* Secondary text */
--color-brass: #A07F3E         /* Accents */
--color-stage: #241A12         /* Dark sections */
--color-stage-text: #F0E8D1    /* Text on dark */
--color-stage-muted: #B7AE9B   /* Muted text on dark */
```

### Typography

- **Display**: Big Shoulders Display (condensed heavy grotesque)
- **Sans**: Inter (humanist sans)
- **Mono**: JetBrains Mono (monospace for data)

### Spacing

- **Max width**: 1600px
- **Side padding**: clamp(1.25rem, 4vw, 4rem)
- **Section padding**: 4rem to 7rem vertical

## License

Proprietary - All rights reserved to Theki Studios

---

**Built with care. Designed for the photographs.**
