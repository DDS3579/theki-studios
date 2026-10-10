# Theki Studios Website

A fast, calm, photography-first website for a photography and film studio: a full-screen hero, a four-column scrolling "Work Wall" of photographs, About, Services, Process, FAQ and an enquiry form.

Built with React 18, TypeScript, Tailwind CSS 4, Vite 6, GSAP (ScrollTrigger) and Lenis (smooth scrolling).

---

## Contents

1. [Quick start](#1-quick-start)
2. [What the page contains](#2-what-the-page-contains)
3. [Project structure](#3-project-structure)
4. [Images: sizes, names and weights](#4-images-sizes-names-and-weights)
5. [Adding photos](#5-adding-photos)
6. [Editing text and details](#6-editing-text-and-details)
7. [Contact form](#7-contact-form)
8. [Adjusting the look and the motion](#8-adjusting-the-look-and-the-motion)
9. [SEO setup](#9-seo-setup)
10. [Deploying](#10-deploying)
11. [Pre-launch checklist](#11-pre-launch-checklist)
12. [After launch](#12-after-launch)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Quick start

You need **Node.js 20 or newer** (check with `node -v`).

```bash
npm install            # install dependencies (first time only)
npm run dev            # start the site at http://localhost:3000
```

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | Development server with live reload |
| `npm run typecheck` | Checks the TypeScript code for errors |
| `npm run build` | Makes the production version in the `dist` folder |
| `npm run preview` | Serves the production version locally. **Test here before launching.** |

Run `npm run typecheck` and `npm run build` before every deploy. Both must finish with no errors.

---

## 2. What the page contains

Sections, in order:

| Section | What it is | Edited in |
|---|---|---|
| Header | Fixed top bar with Work, About, Services, Contact and Enquire. On phones a full-screen menu. | `components/Header.tsx` |
| Hero | Full-screen photograph with headline. Stays in place while the wall slides over it. | `components/Hero.tsx`, text in `content/index.ts` |
| Work Wall | Sand-coloured wall of photographs in 4 columns (desktop), 2 (tablet), 1 (phone). Columns drift against each other as you scroll. Click a photo to open it full screen. Filter chips: All, Weddings, Cars, Photoshoots. | `components/Wall.tsx`, photos in `content/` |
| About | The studio story, three principles, a portrait | `content/site.ts` |
| Services | Weddings, Cars, Photoshoots, Films, Events. Each links to the matching part of the wall or the form. | `content/index.ts` |
| Process | Four steps: Enquire, Plan, Shoot, Deliver | `content/site.ts` |
| Testimonials | Client quotes. **Hidden until you add some.** | `content/site.ts` |
| FAQ | Six questions that open and close | `content/site.ts` |
| Contact | Enquiry form, contact details, social links | `content/index.ts` |
| Footer | Copyright, contact, social links, back to top | `components/Footer.tsx` |
| Enquire bar | Phones only: a bottom bar with Enquire (and WhatsApp when set). Appears after the hero, hides at the form. | `components/EnquiryBar.tsx` |
| Full-screen viewer | Opens when you click a photo: arrow keys, swipe on touch, Escape or click outside to close | `components/Viewer.tsx` |

Responsive behaviour:

| Screen width | Wall layout |
|---|---|
| Under 768 px (phones) | One column. Photos alternate full width, 86% right, 86% left. Filter chips stick under the header. |
| 768 to 1023 px (tablets) | Two columns, gentle drift |
| 1024 px and up | Four columns |
| Over 1700 px | Content stops at 1600 px wide and stays centred |

If a visitor has "Reduce motion" turned on in their device, the drifting and sliding are switched off and photos simply appear.

---

## 3. Project structure

```
├── index.html                  Page head: title, SEO tags, share preview, structured data
├── vercel.json                 Caching and security headers for Vercel
├── package.json
├── scripts/
│   └── make-photo-sizes.mjs    Makes all the image sizes from your original photos
├── photos-original/            (you create this) your full-size originals. Not uploaded to git.
├── public/                     Files served as they are
│   ├── images/                 All photographs (WebP, in several sizes)
│   ├── og-image.jpg            Picture shown when the link is shared (you add this)
│   ├── favicon.svg / .ico      Browser tab icon
│   ├── apple-touch-icon.png    iPhone home-screen icon
│   ├── robots.txt              Instructions for search engines
│   ├── sitemap.xml             List of your page and photos for Google
│   └── 404.html                "Page not found" page
└── src/
    ├── App.tsx                 Order of the sections
    ├── index.css               Colours, fonts and shared styles
    ├── components/             One file per section (see section 2)
    ├── content/
    │   ├── index.ts            Original photos, hero text, services, contact details, social links
    │   ├── morePhotos.ts       WHERE YOU ADD NEW PHOTOS (one line each)
    │   └── site.ts             Text for About, Process, Testimonials, FAQ
    └── lib/
        ├── motion.ts           Timing and smooth-scroll settings
        ├── smoothScroll.ts     Smooth scrolling (Lenis)
        ├── scrollTo.ts         Every "jump to section" in one place
        ├── scrollLock.ts       Freezes the page behind menus and the viewer
        ├── useScrollReveal.ts  Fade-in of sections as they appear
        └── gate.ts             Device and motion preferences
```

---

## 4. Images: sizes, names and weights

All photographs are **WebP** files in `public/images/`.

### The rule for every photograph

Each photo needs the same picture in several widths, named like this:

```
{name}-{width}.webp
```

| Photo shape | Files to make | Pixel sizes (width x height, for a 3:2 or 2:3 photo) |
|---|---|---|
| Landscape (wider than tall) | `-800`, `-1600`, `-2400` | 800 x 533, 1600 x 1067, 2400 x 1600 |
| Portrait (taller than wide) | `-800`, `-1600` | 800 x 1200, 1600 x 2400 |

Example: `wedding-5-800.webp`, `wedding-5-1600.webp`, `wedding-5-2400.webp`.

- **Names:** lowercase letters, numbers and dashes only. No spaces. The name before the width must match what you write in `morePhotos.ts`.
- **Ratio:** any ratio works, because the site reads each photo's real size. 3:2 (landscape) and 2:3 (portrait) make the neatest columns.
- **Quality and weight:** WebP quality about 80. Aim for roughly 60 to 120 KB for the 800 file, 200 to 400 KB for the 1600 file, and 400 to 800 KB for the 2400 file.
- **Originals:** keep your full-size originals. Landscape originals should be at least 2400 px wide, portrait originals at least 1600 px wide.

### Where each size is used

| Size | Used for |
|---|---|
| 800 | Wall thumbnails on desktop and tablet, About portrait |
| 1600 | The hero photograph, and phone-size photos on the wall (browsers choose automatically) |
| 2400 | Full-screen viewer on landscape photos, and the hero on very large or high-resolution screens |
| (largest available) | Full-screen viewer for portraits |

The browser automatically picks the smallest file that looks sharp, so phones do not download the big ones.

### The hero photograph

The hero uses the weddings photo marked `hero: true` in `content/index.ts` (currently `wedding-1`). It should be landscape and at least 2400 px wide. If you ever change which photo is the hero, also update the preload lines in `index.html` (they mention `wedding-1`).

### Other image files

| File | Size | Notes |
|---|---|---|
| `public/og-image.jpg` | **1200 x 630 px**, JPG, under 300 KB | The picture people see when your link is shared on WhatsApp, Facebook, LinkedIn or X. Crop one of your best photographs, with the important part in the centre. |
| `public/favicon.svg` | vector | Browser tab icon (included) |
| `public/favicon.ico` | 16, 32 and 48 px | Tab icon for older browsers (included) |
| `public/apple-touch-icon.png` | 180 x 180 px | iPhone home-screen icon (included). Replace later with your real logo. |

---

## 5. Adding photos

The wall gets longer by itself. Photos you add appear everywhere: the wall, the filter counts, the hero's "frames" count and the viewer.

### The easy way (with the script)

One-time setup:

```bash
npm install -D sharp
```

Then for every new batch of photos:

1. Create a folder called `photos-original` next to `package.json` (it is already ignored by git). Put your original JPG or PNG files in it, named as you want the files called, for example `wedding-5.jpg`, `car-4.jpg`, `portrait-4.jpg`.
2. Run:
   ```bash
   node scripts/make-photo-sizes.mjs
   ```
   It creates the WebP sizes in `public/images` and prints one line per photo, like:
   ```
   add('wedding-5', 'weddings', 'DESCRIBE THE PHOTO HERE', 2400, 1600),
   ```
3. Open `src/content/morePhotos.ts` and paste each line inside the `extraPhotos` list. Write the description (what is in the photo), and change `'weddings'` to `'cars'` or `'photoshoots'` where needed.
4. Save. Done.

### Optional extras on any line

```ts
add('car-4', 'cars', 'A black coupe at dusk', 2400, 1600, {
  caption: 'Dusk run',
  capture: { focal: '50 mm', aperture: 'f/2.0', shutter: '1/200', iso: '400' },
}),
```

- `caption`: short title shown under the photo (default: the first part of the description)
- `capture`: camera settings shown under the photo on desktop
- `featured: false`: keeps a photo in the project but hides it from the site

### Writing good descriptions (alt text)

Describe what is in the photo, in one plain sentence. This helps people using screen readers and also helps Google Images. Good: "Bride and groom exchanging rings at a garden wedding". Not good: "IMG_2043" or "wedding photo".

### Doing it without the script

Make the WebP files yourself (see section 4), put them in `public/images`, and add the line to `morePhotos.ts` using the real pixel size of the largest file you made.

### How many photos?

Around **24 to 40** makes the wall feel like a real portfolio. With more than 16 photos, choosing a chapter (for example Cars) rebuilds the wall with only that chapter. With 16 or fewer, the other photos fade instead (change this with `FILTER_REFLOW_ABOVE` in `components/Wall.tsx`).

When you add photos, also add them to `public/sitemap.xml` (see section 9).

---

## 6. Editing text and details

| What | File | How |
|---|---|---|
| Hero headline, support text, service descriptions, section headings | `src/content/index.ts` (the `copy` and `services` parts) | Change the words between the quotes |
| Contact email, phone, WhatsApp, location, form address | `src/content/index.ts` (`contact`) | See below |
| Instagram, Facebook, YouTube links | `src/content/index.ts` (`socialLinks`) | Full profile addresses |
| About text, principles, optional facts | `src/content/site.ts` (`about`) | Change the words |
| Which photo appears beside the About text | `src/content/site.ts` (`about.photoId`) | Use another photo's id |
| Process steps | `src/content/site.ts` (`howWeWork`) | Change the words |
| FAQ questions and answers | `src/content/site.ts` (`faq`) | Add, remove or edit entries |
| Client quotes | `src/content/site.ts` (`testimonials`) | Add entries, the section appears automatically |

Contact details example:

```ts
export const contact = {
  email: 'hello@yourdomain.com',
  phone: '+977 98XXXXXXXX',
  whatsapp: '+977 98XXXXXXXX',  // with country code; spaces and symbols are removed
  location: 'Your city, Nepal',
  formEndpoint: 'https://formspree.io/f/xxxxxxxx',
};
```

Leave any value as `''` and it is simply not shown. Only write true things on the site: do not add prices, years of experience or client counts unless they are accurate.

A testimonial entry looks like:

```ts
{ quote: 'They made the whole day feel effortless.', name: 'A. and R.', detail: 'Wedding, 2026' }
```

---

## 7. Contact form

The form needs somewhere to send messages.

1. Create a free account at **formspree.io**, make a new form, and copy its address (it looks like `https://formspree.io/f/abcdwxyz`).
2. Paste it into `formEndpoint` in `src/content/index.ts`. Messages arrive in your email.
3. After deploying, send yourself a test enquiry.

What the form does depending on your settings:

| Settings | Result |
|---|---|
| `formEndpoint` filled | The message is sent in the background, a success message shows |
| Only `email` filled | The visitor's email app opens with the message written |
| Neither | The form is switched off and says so, so no message is ever lost silently |

The form has a hidden spam trap and checks the email or phone number before sending.

---

## 8. Adjusting the look and the motion

### Colours (`src/index.css`, near the top)

| Name | Where it is used |
|---|---|
| `--color-stage` | Dark brown: hero, viewer |
| `--color-sand` | Soft light brown: the Work Wall. For a deeper tone try `#CDB993`. |
| `--color-paper` | Cream: most sections |
| `--color-brass` | Thin lines and small marks only, never text |

### The Work Wall (`src/components/Wall.tsx`, top of the file)

| Setting | What it does |
|---|---|
| `DRIFT_VH_DESKTOP` | How far columns drift against each other. Grows automatically with the number of photos (12 to 24). Make the number bigger for livelier, smaller for calmer. |
| `DIM_OPACITY` | How faded the other chapters look when you filter (small walls) |
| `FILTER_REFLOW_ABOVE` | Number of photos above which filtering rebuilds the wall |

The photo reveal (the curtain effect and the slow settle) is in `src/index.css` under `.wall-mask` and `.wall-img`.

### Smooth scrolling (`src/lib/motion.ts`)

`LENIS_LERP` is how smooth the scroll feels (lower is smoother and slower, around 0.09 is calm). `LENIS_WHEEL_SPEED` is how fast the mouse wheel scrolls.

---

## 9. SEO setup

Do these once, before launch.

### 9.1 Your real web address

The files contain the placeholder `https://thestudio.co`. Use "Find and Replace in all files" in your editor to change it to your real address (with `https://`, no slash at the end). It appears in:

- `index.html` (canonical link, share-preview tags, structured data)
- `public/robots.txt`
- `public/sitemap.xml`

### 9.2 Title and description

In `index.html`, the title is "Theki Studios — Wedding, Car & Portrait Photography". If you work from a specific city, add it **(only if true)**, for example "Theki Studios — Wedding, Car & Portrait Photography in Kathmandu" (keep under about 65 characters), and add the city to the description too. This is the single biggest local-search improvement.

### 9.3 Share-preview picture

Create `public/og-image.jpg` (1200 x 630, under 300 KB). Test it after deploying by pasting your link into Facebook's Sharing Debugger (developers.facebook.com/tools/debug) and clicking "Scrape Again". Then send the link to yourself on WhatsApp to see the preview.

### 9.4 Structured data

`index.html` already tells Google what the business is. When you have them, add `telephone`, `sameAs` (your Instagram and Facebook addresses) and, if clients visit you, an `address` inside the business block. Only add things that are true. Test at search.google.com/test/rich-results.

### 9.5 Sitemap and robots

`public/robots.txt` lets search engines in and points to the sitemap. `public/sitemap.xml` lists your page and your photographs (this helps Google Images). **When you add photos**, add one line for each inside the `<url>` block, using the `-1600` file:

```xml
<image:image><image:loc>https://yourdomain.com/images/wedding-5-1600.webp</image:loc></image:image>
```

and update the `<lastmod>` date.

### 9.6 Google Search Console

1. Go to search.google.com/search-console and add your site (the "Domain" option with a DNS record is easiest).
2. Open **Sitemaps** and add `sitemap.xml`.
3. Inspect your home address and click **Request indexing**.

(Alternative verification: in `index.html`, remove the comment marks around the `google-site-verification` line and paste your code.)

### 9.7 Google Business Profile (important for local studios)

At business.google.com create a profile named exactly "Theki Studios". Choose the category "Photographer" (add "Wedding photographer" and "Videographer" if offered). Add your website, phone number, service area and at least 10 of your best photographs. Keep your name, phone number and website identical everywhere (Instagram, Facebook, directories). Ask 3 to 5 happy clients for Google reviews.

### 9.8 Analytics (optional)

In `index.html` there is a commented-out Google Analytics block. Remove the comment marks and replace both `G-XXXXXXXXXX` with your ID. Skip this if you do not need statistics.

### 9.9 Good habits

- Give every photo a descriptive description (alt text).
- Link your website in your Instagram, Facebook and YouTube profiles and in any wedding-vendor directories.
- Later, add one page per service (`/weddings`, `/cars`, `/portraits`) to rank for searches like "wedding photographer in your city". This is the biggest next step for search traffic.

---

## 10. Deploying

The project is set up for **Vercel** (free plan works).

1. Put the project on GitHub (a private repository is fine).
2. At vercel.com choose **Add New, Project**, and import the repository. Vercel detects Vite automatically (build command `npm run build`, output folder `dist`). Click **Deploy**.
3. Open the preview link and run the pre-launch checklist below.
4. In the project's **Settings, Domains**, add your domain and the `www` version, and follow the DNS instructions shown at your domain registrar. Choose one version to redirect to the other (the one you used in section 9.1). HTTPS is automatic.
5. If you changed the web address after the first deploy, redeploy.

`vercel.json` already sets long-term caching for code and photos and basic security headers.

Hosting somewhere else (Netlify, Cloudflare Pages)? The same `dist` folder works. You would need the equivalent headers file for that host.

---

## 11. Pre-launch checklist

Run on the **live address** (not localhost):

- [ ] `npm run typecheck` and `npm run build` pass with no errors
- [ ] `/robots.txt` and `/sitemap.xml` open and show your real domain
- [ ] A wrong address such as `/xyz` shows the branded 404 page
- [ ] All photographs load (browser network tab, nothing red)
- [ ] Test enquiry arrives in your email and the success message shows
- [ ] Real phone test (iPhone Safari and Android Chrome): hero, wall, About, Services, Process, FAQ, Contact; the Enquire bar appears after the hero and hides at the form
- [ ] WhatsApp preview shows your photo, title and description
- [ ] Lighthouse (Chrome DevTools, mobile): Performance 90+, Accessibility 95+, Best Practices 95+, SEO 100
- [ ] Rich Results Test reads the business data with no errors
- [ ] Keyboard only: Tab reaches everything, the focus ring is visible, Escape closes the viewer and the menu
- [ ] Browser console shows no red errors
- [ ] "Reduce motion" turned on in the device: no drifting, photos still appear
- [ ] Sizes checked: 390 x 844 (phone), 820 x 1180 (tablet), 1440 x 900 (laptop), 1920 x 1080 (desktop), and a phone held sideways (844 x 390)

---

## 12. After launch

**First week**

1. Google Search Console: add the site, submit the sitemap, request indexing (section 9.6).
2. Google Business Profile (section 9.7).
3. Bing Webmaster Tools: sign in and import your site from Search Console (one click).
4. Put the website address in every social profile and anywhere you are listed.

**Every month (10 minutes)**

1. Add new photographs (section 5).
2. Update `sitemap.xml` (new photo lines and the date).
3. Look at Search Console's Performance page to see which searches bring people.

---

## 13. Troubleshooting

| What you see | What to check |
|---|---|
| A photo is missing or shows a grey box | The files are not in `public/images`, or the name does not match. A photo called `wedding-5` needs `wedding-5-800.webp`, `wedding-5-1600.webp` (and `-2400` for landscape). Names are case-sensitive on the live site. |
| New photo does not appear | Is its line inside the `extraPhotos` list in `morePhotos.ts`, ending with a comma, with `featured` not set to `false`? Did you save? |
| Photo looks cropped or the wrong shape on the wall | The width and height in its `add(...)` line must be the real pixel size of the largest file |
| Viewer shows a blurry photo | The largest file is too small; use a bigger original |
| Form is greyed out | Set `formEndpoint` or `email` in `src/content/index.ts` |
| Contact details, social links or WhatsApp button are missing | They only appear once filled in (section 6) |
| Testimonials section is not there | Expected: it appears when `testimonials` has entries |
| Link preview on WhatsApp or Facebook is old or empty | Check `og-image.jpg` exists at your real address, then use Facebook's Sharing Debugger and click "Scrape Again" |
| The hero shows through the sections below the wall | `App.tsx` must wrap `<Hero />` and `<Wall />` together in one `<div className="relative">` |
| Header text is hard to read | The header switches to dark text once the light wall passes under it; this needs the `Hero` section to keep its `aria-label="Introduction"` |
| Scrolling feels too floaty or too fast | Change `LENIS_LERP` and `LENIS_WHEEL_SPEED` in `src/lib/motion.ts` |
| Page height jumps on phones | Make sure your browser is up to date; the site uses modern viewport units that all current phones support |
| `npm run build` fails | Run `npm run typecheck` first; it names the file and line. Fix that, then build again. |
| Port 3000 already in use | Close the other program, or change `port` in `vite.config.js` |

---

## Credits

Typefaces: Big Shoulders Display, Inter and JetBrains Mono (Google Fonts, open licence). Motion: GSAP and Lenis.