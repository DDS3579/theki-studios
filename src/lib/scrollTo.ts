// B12.53: Shared scroll helper module
import type { Chapter } from '../content';
import { buildJourney } from './stage/journey';

export const HEADER_HEIGHT = 80; // Shared constant for header height

// B12.53: Check if we're in stage mode
function isStageMode(): boolean {
  // Check if the work section has a data attribute indicating stage mode
  const workSection = document.getElementById('work');
  return workSection?.dataset.mode === 'stage';
}

// B12.53: Scroll to a chapter
export function scrollToChapter(chapter: Chapter, instant = false): void {
  if (isStageMode()) {
    // In stage mode, compute target from journey progress
    const journey = buildJourney();
    const chapterRange = journey.chapterRanges.find(r => r.chapter === chapter);
    if (!chapterRange) return;

    const workSection = document.getElementById('work');
    if (!workSection) return;

    const containerRect = workSection.getBoundingClientRect();
    const containerTop = containerRect.top + window.scrollY;
    const scrollableDistance = workSection.offsetHeight - window.innerHeight;
    const targetScroll = containerTop + chapterRange.startP * scrollableDistance;

    // B12.53: Use instant jump for long distances
    const distance = Math.abs(window.scrollY - targetScroll);
    const useInstant = instant || distance > window.innerHeight * 3;

    window.scrollTo({
      top: targetScroll,
      behavior: useInstant ? 'instant' : 'smooth'
    });
  } else {
    // In static mode, scroll to chapter element
    const element = document.getElementById(`chapter-${chapter}`);
    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - HEADER_HEIGHT;

    // B12.53: Use instant jump for long distances
    const distance = Math.abs(window.scrollY - offsetPosition);
    const useInstant = instant || distance > window.innerHeight * 3;

    window.scrollTo({
      top: offsetPosition,
      behavior: useInstant ? 'instant' : 'smooth'
    });
  }
}

// B12.53: Scroll to a section (archive, services, contact, etc.)
export function scrollToSection(sectionId: string, instant = false): void {
  const element = document.getElementById(sectionId);
  if (!element) return;

  const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - HEADER_HEIGHT;

  // B12.53: Use instant jump for long distances
  const distance = Math.abs(window.scrollY - offsetPosition);
  const useInstant = instant || distance > window.innerHeight * 3;

  window.scrollTo({
    top: offsetPosition,
    behavior: useInstant ? 'instant' : 'smooth'
  });
}

// B12.53: Scroll to top
export function scrollToTop(instant = true): void {
  window.scrollTo({
    top: 0,
    behavior: instant ? 'instant' : 'smooth'
  });
}
