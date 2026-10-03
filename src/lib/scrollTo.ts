// Shared scroll helper module
// Rewired to use the smooth scroll library (Lenis)
import type { Chapter } from '../content';
import { scrollTo as smoothScrollTo, scrollToChapter as smoothScrollToChapter, scrollToTop as smoothScrollToTop } from './smoothScroll';
import { HEADER_HEIGHT } from './motion';

// Scroll to a chapter
export function scrollToChapter(chapter: Chapter, instant = false): void {
  const element = document.getElementById(`chapter-${chapter}`);
  if (!element) return;

  // Use instant jump for long distances
  const distance = Math.abs(window.scrollY - element.offsetTop);
  const useInstant = instant || distance > window.innerHeight * 3;

  if (useInstant) {
    window.scrollTo({
      top: element.offsetTop - HEADER_HEIGHT,
      behavior: 'auto'
    });
  } else {
    smoothScrollToChapter(`chapter-${chapter}`);
  }
}

// Scroll to a section (archive, services, contact, etc.)
export function scrollToSection(sectionId: string, instant = false): void {
  const element = document.getElementById(sectionId);
  if (!element) return;

  // Use instant jump for long distances
  const distance = Math.abs(window.scrollY - element.offsetTop);
  const useInstant = instant || distance > window.innerHeight * 3;

  if (useInstant) {
    window.scrollTo({
      top: element.offsetTop - HEADER_HEIGHT,
      behavior: 'auto'
    });
  } else {
    smoothScrollTo(element, { offset: -HEADER_HEIGHT });
  }
}

// Scroll to top
export function scrollToTop(instant = true): void {
  smoothScrollToTop(instant);
}
