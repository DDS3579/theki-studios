import { useEffect, useRef, useState } from 'react';
import { contact, socialLinks } from '../content';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [overDarkSection, setOverDarkSection] = useState(true); // Start over hero
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // B6.1: Cache elements and use IntersectionObserver
  useEffect(() => {
    const heroSection = document.querySelector('section[aria-label="Introduction"]');
    const workSection = document.getElementById('work');
    
    if (!heroSection || !workSection) return;

    // B6.2: Three-state header using IntersectionObserver
    const observer = new IntersectionObserver(
      (entries) => {
        // Check if either dark section is intersecting with header area
        const isOverDark = entries.some(entry => entry.isIntersecting);
        setOverDarkSection(isOverDark);
      },
      {
        rootMargin: '-80px 0px 0px 0px', // Header height
        threshold: 0
      }
    );

    observer.observe(heroSection);
    observer.observe(workSection);

    return () => observer.disconnect();
  }, []);

  // B6.1: Throttled scroll check for 40px threshold
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // B6.7: Use shared scroll lock and guard showModal
  useEffect(() => {
    if (menuOpen) {
      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
      lockScroll();
    } else {
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      unlockScroll();
    }
    
    return () => {
      if (menuOpen) {
        unlockScroll();
      }
    };
  }, [menuOpen]);

  // B6.6: Close menu when window grows past mobile breakpoint
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && menuOpen) {
        setMenuOpen(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [menuOpen]);

  const textColor = overDarkSection ? 'text-stage-text' : 'text-ink';

  return (
    <>
      {/* B6.2: Three-state header - transparent over dark, solid over light */}
      {/* B6.3: No backdrop-blur over WebGL canvas */}
      {/* B6.4: Only transition colors, not layout */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled && !overDarkSection
            ? 'bg-paper border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Wordmark */}
            <a
              href="#top"
              className={`font-display text-lg md:text-xl font-bold uppercase tracking-tight transition-colors duration-300 ${
                scrolled ? 'text-ink' : textColor
              }`}
            >
              Theki Studios
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              {[
                { href: '#work', label: 'Work' },
                { href: '#archive', label: 'Archive' },
                { href: '#services', label: 'Services' },
                { href: '#contact', label: 'Contact' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`font-sans text-sm transition-colors duration-200 hover:text-brass ${
                    scrolled ? 'text-ink' : textColor
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                className={`font-sans text-sm border px-5 py-2.5 transition-colors duration-200 ${
                  scrolled
                    ? 'border-ink/20 text-ink hover:border-brass hover:text-brass'
                    : overDarkSection
                      ? 'border-stage-text/30 text-stage-text hover:border-brass hover:text-brass'
                      : 'border-ink/20 text-ink hover:border-brass hover:text-brass'
                }`}
              >
                Enquire
              </a>
            </nav>

            {/* Mobile menu button */}
            {/* B6.7: Add aria-controls */}
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(true)}
              className={`md:hidden p-3 transition-colors duration-300 ${
                scrolled && !overDarkSection ? 'text-ink' : textColor
              }`}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="2" y1="5" x2="18" y2="5" />
                <line x1="2" y1="10" x2="18" y2="10" />
                <line x1="2" y1="15" x2="18" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu dialog */}
      {/* B6.5: Solid paper background (fixed by B0.2) */}
      {/* B6.7: Add id for aria-controls */}
      <dialog
        ref={dialogRef}
        id="mobile-menu"
        className="fixed inset-0 w-full h-full bg-paper z-[55] p-0 m-0"
        onClose={() => setMenuOpen(false)}
      >
        <div className="flex flex-col h-full p-6 pt-8">
          <div className="flex items-center justify-between mb-16">
            <span className="font-display text-xl font-bold uppercase tracking-tight text-ink">
              Theki Studios
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-3 text-ink"
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col gap-8" aria-label="Mobile navigation">
            {[
              { href: '#work', label: 'Work' },
              { href: '#archive', label: 'Archive' },
              { href: '#services', label: 'Services' },
              { href: '#contact', label: 'Contact' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  // B6.10: Release lock first, then scroll
                  e.preventDefault();
                  setMenuOpen(false);
                  // Small delay to ensure menu closes and lock releases
                  setTimeout(() => {
                    const target = document.querySelector(link.href);
                    if (target) {
                      target.scrollIntoView({ behavior: 'smooth' });
                    }
                  }, 50);
                }}
                className="font-display text-4xl font-bold uppercase tracking-tight text-ink hover:text-brass transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto pt-8 border-t border-border">
            <a
              href="#contact"
              onClick={() => setMenuOpen(false)}
              className="inline-block font-sans text-sm border border-ink/20 text-ink px-6 py-3 hover:border-brass hover:text-brass transition-colors"
            >
              Enquire
            </a>
            {/* B6.9: Add target/rel, include YouTube */}
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.youtube) && (
              <div className="flex flex-wrap gap-6 mt-6">
                {socialLinks.instagram && (
                  <a 
                    href={socialLinks.instagram} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-brass text-sm transition-colors" 
                    aria-label="Instagram"
                  >
                    Instagram
                  </a>
                )}
                {socialLinks.facebook && (
                  <a 
                    href={socialLinks.facebook} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-brass text-sm transition-colors" 
                    aria-label="Facebook"
                  >
                    Facebook
                  </a>
                )}
                {socialLinks.youtube && (
                  <a 
                    href={socialLinks.youtube} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-soft hover:text-brass text-sm transition-colors" 
                    aria-label="YouTube"
                  >
                    YouTube
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
