// One place for every scroll jump on the site.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Chapter } from '../content';
import { getFeaturedPhotos } from '../content';
import { scrollTo as smoothScrollTo, scrollToTop as smoothScrollToTop } from './smoothScroll';
import { HEADER_HEIGHT, chapterLength, photoDwellMid } from './motion';

// Very long jumps are instant (they would otherwise fly through ten screens of animation).
function go(y: number, immediate = false): void {
  const far = Math.abs(window.scrollY - y) > window.innerHeight * 6;
  smoothScrollTo(y, { immediate: immediate || far });
}

// Exact scroll range of a chapter, read from its ScrollTrigger (falls back to the element).
function chapterRange(chapter: Chapter): { start: number; end: number } | null {
  const st = ScrollTrigger.getById(`chapter-${chapter}`);
  if (st) return { start: st.start, end: st.end };
  const el = document.getElementById(`chapter-${chapter}`);
  if (!el) return null;
  const top = el.getBoundingClientRect().top + window.scrollY;
  return { start: top, end: top + el.offsetHeight - window.innerHeight };
}

export function scrollToChapter(chapter: Chapter, immediate = false): void {
  const range = chapterRange(chapter);
  if (range) go(range.start, immediate);
}

export function scrollToPhoto(chapter: Chapter, index: number, immediate = false): void {
  const range = chapterRange(chapter);
  if (!range) return;
  const len = chapterLength(getFeaturedPhotos(chapter).length);
  go(range.start + (photoDwellMid(index) / len) * (range.end - range.start), immediate);
}

export function scrollToSection(sectionId: string, immediate = false): void {
  const el = document.getElementById(sectionId);
  if (!el) return;
  smoothScrollTo(el, { offset: -HEADER_HEIGHT, immediate });
}

// Scroll to the form and pre-select a service (service ids match chapter names).
export function scrollToContact(serviceId?: string): void {
  scrollToSection('contact');
  if (!serviceId) return;
  window.setTimeout(() => {
    const select = document.getElementById('service') as HTMLSelectElement | null;
    if (select) select.value = serviceId;
  }, 900);
}

export function scrollToTop(immediate = true): void {
  smoothScrollToTop(immediate);
}