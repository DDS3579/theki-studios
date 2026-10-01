# Theki Studios — Build Plan

## Overview
A photography and film studio website built with React, Vite, and Tailwind CSS v4. The site presents work through a scroll-driven "pull focus" WebGL stage on desktop, with a complete static editorial path for mobile and reduced-motion users.

## Architecture

### File Structure
```
src/
├── App.tsx                    # Main app shell
├── main.tsx                   # Entry point
├── index.css                  # Design system (Tailwind v4 tokens)
├── vite-env.d.ts              # Vite type declarations
├── content/
│   └── index.ts               # All content: photos, copy, services, flags
├── components/
│   ├── Header.tsx             # Fixed header with theme detection
│   ├── Hero.tsx               # Hero with cold open animation
│   ├── Stage.tsx              # WebGL pull-focus stage + viewfinder
│   ├── WorksStatic.tsx        # Static path for mobile/reduced-motion
│   ├── Archive.tsx            # Justified photo grid + lightbox
│   ├── Services.tsx           # Editorial service index
│   ├── Contact.tsx            # Contact form with validation
│   └── Footer.tsx             # Minimal footer
├── lib/
│   ├── ticker.ts              # Shared rAF loop
│   ├── gate.ts                # Capability detection + runtime ladder
│   ├── useScrollReveal.ts     # IntersectionObserver hook
│   └── stage/
│       ├── focus.ts           # Circle of confusion math
│       ├── camera.ts          # Per-chapter camera moves
│       ├── layout.ts          # Plane sizing and positioning
│       ├── journey.ts         # Scroll progress → segment mapping
│       └── renderer.ts        # WebGL2 renderer
```

## Design System

### Colors (Tailwind v4 @theme)
- Paper: #F0E8D1 (background)
- Ink: #433021 (primary text)
- Ink-soft: #695748 (secondary text)
- Brass: #A07F3E (marks only — viewfinder, focus lock, progress ticks)
- Stage: #241A12 (dark background for works section)
- Stage-text: #F0E8D1 (text on stage)

### Typography
- Display: Big Shoulders Display (condensed heavy grotesque)
- Sans: Inter (calm humanist)
- Mono: JetBrains Mono (data only)

### Key Rules
- Brass is primarily a mark (viewfinder, focus lock, progress ticks), used sparingly for hover states
- Gradients used minimally: hero overlay for text legibility, dark-to-light transition strip
- No custom cursor, particles, film grain, or scroll-jacking
- Text on stage uses opacity fade to avoid overlapping focused photo

## Signature Systems

### 1. Pull Focus (WebGL Stage)
- Scroll-scrubbed 3D photo stack with rack focus
- Per-chapter camera language:
  - Weddings: slow dolly in along Z
  - Cars: lateral track along X
  - Photoshoots: arc orbit (±7°)
- Focus model: CoC from mip-level bias in shader
- Viewfinder overlay: brass corner marks, frame counter, focus-lock indicator, capture settings

### 2. The Viewfinder
- Persistent DOM overlay bound to stage state
- Brass corner marks animate between planes' rects
- Focus-lock indicator hunts (animated) then locks (solid brass)
- Frame counter in mono: "WEDDINGS 03/04"
- Capture settings shown when available

### 3. The Pull-Back (Contact Sheet)
- Button in viewfinder band opens overlay
- Shows all featured frames of current chapter in a grid
- Keyboard accessible (Escape to close)

## Capability Gate

| Mode | Conditions | Rendering |
|------|-----------|-----------|
| A0 | Desktop, fine pointer, WebGL2, ≥4 cores, no reduced motion | Full WebGL with mip-blur, DPR ≤ 1.5 |
| A1 | Desktop with higher DPR or fewer cores | WebGL with mip-blur, DPR ≤ 1.25 |
| A2 | Desktop with lower specs | WebGL without blur, DPR = 1 |
| Static | Mobile, tablet, coarse pointer, reduced motion, saveData, no WebGL2, or WebGL failure | DOM images with scroll reveals |

Runtime ladder automatically downgrades tier based on frame times (p75 > 20ms).

## Performance Budgets
- Route JS: ~65KB gzipped (target ≤120KB) ✓
- CSS: ~7.3KB gzipped (target ≤20KB) ✓
- Fonts: loaded from Google Fonts CDN
- Initial transfer: ~72KB excluding images ✓
- Zero per-frame allocations in WebGL renderer
- Dirty flag system prevents unnecessary renders
- Shared ticker with intelligent sleep/wake

## Accessibility
- WCAG AA contrast on all text (minimum 11px font size)
- Skip link to main content
- Semantic landmarks (header, nav, main, section, footer)
- Visible focus rings (2px brass, offset 2px) on all interactive elements
- aria-live regions for form status and chapter announcements
- All photos have meaningful alt text
- Canvas and viewfinder marks are aria-hidden
- Reduced motion: full static path, no animations, immediate content display
- All interactive elements have minimum 24x24px hit areas
- Proper heading hierarchy (one h1, h2 per section, h3 below)
- Keyboard navigation throughout (arrow keys in lightbox, Escape to close)
- Form validation with focus management to first error

## Content Management

### Adding Photos
1. Convert images to WebP at 800px, 1600px, and 2400px widths
2. Place in `public/images/` with naming: `{baseName}-{width}.webp`
3. Add entries to `src/content/index.ts` in the `photos` array
4. Required fields: `id`, `baseName`, `chapter`, `alt`, `width`, `height`, `widths`, `featured`, `order`
5. Optional: `caption`, `hero`, `capture` (focal, aperture, shutter, iso)
6. Images automatically served with responsive srcset and proper sizing

### Adding a Chapter
1. Add the chapter to the `Chapter` type union
2. Add it to the `chapters` array
3. Add copy in `copy.chapters`
4. Add photos with that chapter value

### Editing Copy
All text lives in `src/content/index.ts`:
- `copy` — hero, chapter titles, contact section
- `services` — service list
- `flags` — feature toggles

## [FILL] List (Missing Content)
The following fields need real content from the client:
- `socialLinks.instagram` — Instagram URL
- `socialLinks.facebook` — Facebook URL
- `socialLinks.youtube` — YouTube URL
- `contact.email` — Studio email
- `contact.phone` — Phone number
- `contact.whatsapp` — WhatsApp number
- `contact.location` — Studio location
- `contact.formEndpoint` — Form submission endpoint (Formspree/Web3Forms)
- Photo alt text — specific descriptions for each photograph
- Photo captions — optional captions for archive display

## Deployment
1. Build: `npm run build`
2. Deploy `dist/` to Vercel
3. Set environment variable for form endpoint if using one
4. Add custom domain in Vercel dashboard

## Assumptions
1. **Derived stage color**: #241A12 is derived from ink (#433021) at lower lightness
2. **Font choices**: Big Shoulders Display (condensed heavy grotesque), Inter (humanist sans), JetBrains Mono (clean mono) — all available via Google Fonts
3. **No real client photos**: Using AI-generated placeholder images that represent the studio's aesthetic
4. **Form handling**: Falls back to mailto: when no endpoint is configured
5. **No films section**: No film entries exist, so the Films section is omitted
6. **No About section**: No About content exists, so the section is omitted
7. **No testimonials**: SHOW_TESTIMONIALS defaults to false
8. **Static hosting**: Site is fully static, no server-side rendering needed
