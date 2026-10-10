// One place for every scroll jump on the site.
import type { Chapter } from '../content';
import { scrollTo as smoothScrollTo, scrollToTop as smoothScrollToTop } from './smoothScroll';
import { HEADER_HEIGHT } from './motion';

export type WallFilter = 'all' | Chapter;

// The Work Wall listens for this event to change its filter.
export const WALL_FILTER_EVENT = 'theki:wall-filter';

function absoluteTop(el: HTMLElement): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

// Scroll so that the top of a section sits just under the fixed header.
export function scrollToSection(sectionId: string, immediate = false): void {
  const el = document.getElementById(sectionId);
  if (!el) return;
  smoothScrollTo(Math.max(0, absoluteTop(el) - HEADER_HEIGHT), { immediate });
}

// Show the Work Wall, optionally filtered to one chapter.
export function scrollToWork(filter: WallFilter = 'all', immediate = false): void {
  window.dispatchEvent(new CustomEvent<WallFilter>(WALL_FILTER_EVENT, { detail: filter }));
  scrollToSection('work', immediate);
}

// Kept so Hero, Header and Services keep working: a chapter now means "wall filtered to it".
export function scrollToChapter(chapter: Chapter, immediate = false): void {
  scrollToWork(chapter, immediate);
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
