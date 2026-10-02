// B12.44: Owner-aware scroll lock utility
// Used by Header, Archive, and ContactSheet

const locks = new Set<string>();
let originalOverflow = '';

export function lockScroll(owner: string = 'default') {
  if (locks.size === 0) {
    originalOverflow = document.documentElement.style.overflow;
    // B12.44: Lock documentElement, not body
    document.documentElement.style.overflow = 'hidden';
    // Add scrollbar gutter to prevent layout shift
    document.documentElement.style.scrollbarGutter = 'stable';
  }
  locks.add(owner);
}

export function unlockScroll(owner: string = 'default') {
  locks.delete(owner);
  if (locks.size === 0) {
    document.documentElement.style.overflow = originalOverflow;
    document.documentElement.style.scrollbarGutter = '';
  }
}

export function getLockCount() {
  return locks.size;
}
