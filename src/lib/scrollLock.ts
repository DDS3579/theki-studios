// Owner-aware scroll lock utility
// Used by Header, Archive, and ContactSheet
// Rewired to use Lenis stop/start for smooth scroll integration

import { stop, resume } from './smoothScroll';

const locks = new Set<string>();

export function lockScroll(owner: string = 'default') {
  if (locks.size === 0) {
    // Stop Lenis smooth scrolling
    stop();
    // Add scrollbar gutter to prevent layout shift
    document.documentElement.style.scrollbarGutter = 'stable';
  }
  locks.add(owner);
}

export function unlockScroll(owner: string = 'default') {
  locks.delete(owner);
  if (locks.size === 0) {
    // Resume Lenis smooth scrolling
    resume();
    document.documentElement.style.scrollbarGutter = '';
  }
}

export function getLockCount() {
  return locks.size;
}
