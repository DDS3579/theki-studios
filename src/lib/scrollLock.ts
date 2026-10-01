// Shared scroll lock utility with counter
// Used by Header, Archive, and ContactSheet

let lockCount = 0;
let originalOverflow = '';

export function lockScroll() {
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Add scrollbar gutter to prevent layout shift
    document.documentElement.style.scrollbarGutter = 'stable';
  }
  lockCount++;
}

export function unlockScroll() {
  if (lockCount > 0) {
    lockCount--;
    if (lockCount === 0) {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.scrollbarGutter = '';
    }
  }
}

export function getLockCount() {
  return lockCount;
}
