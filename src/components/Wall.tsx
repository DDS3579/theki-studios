import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { allPhotosInDisplayOrder, chapters, copy, flags, getAspect, getPhotoSrc, getPhotoSrcSet } from '../content';
import type { Photo } from '../content';
import { WALL_FILTER_EVENT, scrollToContact } from '../lib/scrollTo';
import type { WallFilter } from '../lib/scrollTo';
import Viewer from './Viewer';

gsap.registerPlugin(ScrollTrigger);

// ─── TUNING KNOBS (change only these numbers to adjust the feel) ─────────────
const DRIFT_VH_DESKTOP = 12; // each column drifts +/- this many vh over the whole pass (bigger = livelier)
const DRIFT_VH_TABLET = 6; // same, for the 2-column tablet layout
const PAD_VH = 16; // empty space above and below the columns (must stay larger than the drift)
const DIM_OPACITY = 0.22; // photos outside the selected chapter fade to this
// ─────────────────────────────────────────────────────────────────────────────

const PHOTOS: readonly Photo[] = allPhotosInDisplayOrder.filter((p) => p.featured);

const FILTERS: { id: WallFilter; label: string; count: number }[] = [
  { id: 'all', label: 'All', count: PHOTOS.length },
  ...chapters.map((c) => ({
    id: c as WallFilter,
    label: copy.chapters[c].title,
    count: PHOTOS.filter((p) => p.chapter === c).length,
  })),
];

const SIZES: Record<number, string> = {
  4: '24vw',
  2: '46vw',
  1: '(max-width: 767px) 92vw, 80vw',
};

// ─── Column layout: spread photos over the columns so all columns end at about the same height ───
type WallItem =
  | { kind: 'photo'; key: string; order: number; weight: number; photo: Photo }
  | { kind: 'cta'; key: string; order: number; weight: number };

// weight = tile height in "column widths" (photo height / width, plus caption and gap)
function buildItems(): WallItem[] {
  const items: WallItem[] = PHOTOS.map((photo, i) => {
    const [w, h] = getAspect(photo);
    return { kind: 'photo', key: photo.id, order: i, weight: h / w + 0.25, photo };
  });
  items.push({ kind: 'cta', key: 'cta', order: items.length, weight: 1 });
  return items;
}

function columnHeight(col: WallItem[]): number {
  return col.reduce((sum, it) => sum + it.weight, 0);
}

function spread(cols: WallItem[][]): number {
  const hs = cols.map(columnHeight);
  return Math.max(...hs) - Math.min(...hs);
}

function distribute(items: readonly WallItem[], n: number): WallItem[][] {
  const cols: WallItem[][] = Array.from({ length: n }, () => []);

  // 1) place each item in the currently shortest column
  for (const it of items) {
    let best = 0;
    for (let i = 1; i < n; i++) {
      if (columnHeight(cols[i]) < columnHeight(cols[best]) - 1e-9) best = i;
    }
    cols[best].push(it);
  }

  // 2) improve by moving or swapping items while that makes the columns more equal
  let score = spread(cols);
  let improved = true;
  let guard = 0;
  while (improved && guard++ < 100) {
    improved = false;
    outer: for (let a = 0; a < n; a++) {
      for (let k = 0; k < cols[a].length; k++) {
        for (let b = 0; b < n; b++) {
          if (a === b) continue;
          const [moved] = cols[a].splice(k, 1);
          cols[b].push(moved);
          let s = spread(cols);
          if (s < score - 1e-9) {
            score = s;
            improved = true;
            break outer;
          }
          cols[b].pop();
          cols[a].splice(k, 0, moved);
          for (let m = 0; m < cols[b].length; m++) {
            const x = cols[a][k];
            const y = cols[b][m];
            cols[a][k] = y;
            cols[b][m] = x;
            s = spread(cols);
            if (s < score - 1e-9) {
              score = s;
              improved = true;
              break outer;
            }
            cols[a][k] = x;
            cols[b][m] = y;
          }
        }
      }
    }
  }

  // 3) keep reading order inside each column
  cols.forEach((c) => c.sort((p, q) => p.order - q.order));
  return cols;
}

const ITEMS = buildItems();
const layoutCache = new Map<number, WallItem[][]>();
function getColumns(n: number): WallItem[][] {
  let cols = layoutCache.get(n);
  if (!cols) {
    cols = distribute(ITEMS, n);
    layoutCache.set(n, cols);
  }
  return cols;
}

// ─── Small hooks ─────────────────────────────────────────────────────────────
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query);
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

// true once the element has scrolled into view (never goes back to false)
function useInView(ref: RefObject<HTMLElement | null>, instant: boolean): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (instant) {
      setSeen(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [instant, ref]);
  return seen;
}

// ─── Tiles ───────────────────────────────────────────────────────────────────
const MOBILE_ALIGN = ['w-full', 'ml-auto w-[86%]', 'mr-auto w-[86%]'];

interface PhotoTileProps {
  photo: Photo;
  columns: number;
  index: number;
  dimmed: boolean;
  instant: boolean;
  onOpen: (id: string) => void;
}

function PhotoTile({ photo, columns, index, dimmed, instant, onOpen }: PhotoTileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, instant);
  const [w, h] = getAspect(photo);
  const title = photo.caption ?? photo.alt.split(',')[0];
  const c = photo.capture;
  const capture =
    flags.SHOW_CAPTURE && c
      ? [c.focal, c.aperture, c.shutter, c.iso ? `ISO ${c.iso}` : null].filter(Boolean).join(' \u00B7 ')
      : '';
  const align = columns === 1 ? MOBILE_ALIGN[index % 3] : '';

  return (
    <div
      ref={ref}
      className={`transition-opacity duration-500 ${align}`}
      style={{ opacity: dimmed ? DIM_OPACITY : 1 }}
    >
      <button
        type="button"
        onClick={() => onOpen(photo.id)}
        disabled={dimmed}
        className="wall-photo block w-full cursor-zoom-in text-left disabled:cursor-default"
        aria-label={`Open full screen: ${title}`}
      >
        <div
          className="wall-mask relative w-full overflow-hidden bg-sand-deep"
          data-in={seen ? '1' : '0'}
          style={{ aspectRatio: `${w} / ${h}` }}
        >
          <img
            className="wall-img block h-full w-full object-cover"
            src={getPhotoSrc(photo, 'thumbnail')}
            srcSet={getPhotoSrcSet(photo)}
            sizes={SIZES[columns]}
            alt={photo.alt}
            width={w}
            height={h}
            loading="lazy"
            decoding="async"
          />
        </div>
      </button>
      <div className="mt-3 flex items-baseline justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.14em]">
        <span className="min-w-0 flex-1 truncate text-ink">{title}</span>
        <span className="shrink-0 text-ink/75">{copy.chapters[photo.chapter].title}</span>
      </div>
      {capture && <p className="mt-1 hidden font-mono text-[11px] uppercase tracking-[0.12em] text-ink/75 md:block">{capture}</p>}
    </div>
  );
}

function CtaTile() {
  return (
    <div className="flex flex-col justify-between border border-ink/25 p-6 md:p-7" style={{ aspectRatio: '1 / 1' }}>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/75">Your story next</p>
      <h3 className="font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-ink md:text-4xl">
        Have a project in mind?
      </h3>
      <button
        type="button"
        onClick={() => scrollToContact()}
        className="self-start border-b border-ink pb-1 font-mono text-[12px] uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:border-brass"
      >
        Let&rsquo;s talk &rarr;
      </button>
    </div>
  );
}

// ─── The wall ────────────────────────────────────────────────────────────────
export default function Wall() {
  const sectionRef = useRef<HTMLElement>(null);
  const [filter, setFilter] = useState<WallFilter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const wide = useMediaQuery('(min-width: 1024px)');
  const mid = useMediaQuery('(min-width: 768px)');
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
  const columns = wide ? 4 : mid ? 2 : 1;

  const cols = useMemo(() => getColumns(columns), [columns]);
  const visiblePhotos = useMemo(
    () => (filter === 'all' ? PHOTOS : PHOTOS.filter((p) => p.chapter === filter)),
    [filter]
  );

  // Other parts of the site (Services, header, hero) can ask the wall to filter
  useEffect(() => {
    const onFilter = (e: Event) => setFilter((e as CustomEvent<WallFilter>).detail);
    window.addEventListener(WALL_FILTER_EVENT, onFilter);
    return () => window.removeEventListener(WALL_FILTER_EVENT, onFilter);
  }, []);

  // Fonts change the height of the heading, so re-measure once they are ready
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  // Column drift: even columns run ahead of the page, odd columns lag behind it
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || reduced || columns < 2) return;
      const drift = columns >= 4 ? DRIFT_VH_DESKTOP : DRIFT_VH_TABLET;
      const vh = () => window.innerHeight / 100;

      Array.from(section.querySelectorAll<HTMLElement>('[data-col]')).forEach((col, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.fromTo(
          col,
          { y: () => dir * drift * vh() },
          {
            y: () => -dir * drift * vh(),
            ease: 'none',
            scrollTrigger: {
              trigger: section,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          }
        );
      });
    },
    { scope: sectionRef, dependencies: [reduced, columns] }
  );

  const padVh = columns > 1 ? PAD_VH : 4;

  return (
    <section
      ref={sectionRef}
      id="work"
      aria-labelledby="work-heading"
      className="relative z-10 overflow-clip bg-sand text-ink shadow-[0_-30px_80px_-20px_rgba(36,26,18,0.35)]"
    >
      <div className="mx-auto max-w-[1600px] px-[clamp(1.25rem,4vw,4rem)]">
        {/* Intro */}
        <div className="pt-20 md:pt-32">
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-ink/75">Selected work</p>
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-12">
            <h2
              id="work-heading"
              className="font-display font-bold uppercase tracking-[-0.02em] text-ink"
              style={{ fontSize: 'clamp(2.75rem, 7vw, 7rem)', lineHeight: 0.9 }}
            >
              Weddings, cars
              <br />
              &amp; portraits
            </h2>
            <p className="max-w-sm font-sans text-[15px] leading-relaxed text-ink/80">
              A selection from our recent shoots. Choose a photograph to see it full screen.
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="sticky top-16 z-20 -mx-[clamp(1.25rem,4vw,4rem)] mt-10 bg-sand px-[clamp(1.25rem,4vw,4rem)] py-3 md:static md:mx-0 md:mt-12 md:bg-transparent md:p-0">
          <div role="group" aria-label="Filter by chapter" className="flex flex-wrap gap-2 md:gap-3">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(f.id)}
                  className={`border px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.16em] transition-colors duration-200 ${
                    active ? 'border-ink bg-ink text-sand' : 'border-ink/30 text-ink hover:border-ink'
                  }`}
                >
                  {f.label} <span className="tabular-nums">{f.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Columns */}
        <div
          className="grid items-start gap-x-[2vw]"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            paddingTop: `${padVh}vh`,
            paddingBottom: `${padVh}vh`,
          }}
        >
          {cols.map((col, ci) => (
            <div
              key={`${columns}-${ci}`}
              data-col
              className="flex flex-col gap-[7vw] md:gap-[2.4vw]"
              style={columns > 1 && !reduced ? { willChange: 'transform' } : undefined}
            >
              {col.map((it, k) =>
                it.kind === 'photo' ? (
                  <PhotoTile
                    key={it.key}
                    photo={it.photo}
                    columns={columns}
                    index={k}
                    dimmed={filter !== 'all' && it.photo.chapter !== filter}
                    instant={reduced}
                    onOpen={setOpenId}
                  />
                ) : (
                  <CtaTile key={it.key} />
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <Viewer photos={visiblePhotos} openId={openId} onChange={setOpenId} />
    </section>
  );
}
