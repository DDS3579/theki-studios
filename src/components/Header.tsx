import { useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { socialLinks, copy } from '../content';
import { lockScroll, unlockScroll } from '../lib/scrollLock';
import { scrollToChapter, scrollToSection, scrollToTop } from '../lib/scrollTo';

gsap.registerPlugin(ScrollTrigger);

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [isOverDark, setIsOverDark] = useState(true);
  const [hasScrolled, setHasScrolled] = useState(false);

  // D2: Use ScrollTrigger to detect which section is under the header
  useGSAP(() => {
    if (!headerRef.current) return;

    const ctx = gsap.context(() => {
      // Create ScrollTrigger for hero section
      ScrollTrigger.create({
        trigger: 'section[aria-label="Introduction"]',
        start: 'top top',
        end: 'bottom top',
        onEnter: () => setIsOverDark(true),
        onLeave: () => setIsOverDark(false),
        onEnterBack: () => setIsOverDark(true),
        onLeaveBack: () => setIsOverDark(false),
      });

      // Create ScrollTrigger for work section
      ScrollTrigger.create({
        trigger: '#work',
        start: 'top top',
        end: 'bottom top',
        onEnter: () => setIsOverDark(true),
        onLeave: () => setIsOverDark(false),
        onEnterBack: () => setIsOverDark(true),
        onLeaveBack: () => setIsOverDark(false),
      });

      // Track scroll position for background
      ScrollTrigger.create({
        trigger: 'body',
        start: 'top top',
        end: '99999px top',
        onUpdate: (self) => {
          setHasScrolled(self.scroll() > 40);
        },
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (menuOpen) {
      if (dialogRef.current && !dialogRef.current.open) {
        dialogRef.current.showModal();
      }
      lockScroll('mobileMenu');
    } else {
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      unlockScroll('mobileMenu');
    }
    
    return () => {
      if (menuOpen) {
        unlockScroll('mobileMenu');
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

  const textColor = isOverDark ? 'text-stage-text' : 'text-ink';

  return (
    <>
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          hasScrolled && !isOverDark
            ? 'bg-paper border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Wordmark */}
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                scrollToTop(true);
              }}
              className={`font-display text-lg md:text-xl font-bold uppercase tracking-tight transition-colors duration-300 ${textColor}`}
            >
              {copy.studioName}
            </a>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
              <a
                href="#work"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToChapter('weddings');
                }}
                className={`font-sans text-sm transition-colors duration-200 hover:text-brass ${textColor}`}
              >
                Work
              </a>
              <a
                href="#archive"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('archive');
                }}
                className={`font-sans text-sm transition-colors duration-200 hover:text-brass ${textColor}`}
              >
                Archive
              </a>
              <a
                href="#services"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('services');
                }}
                className={`font-sans text-sm transition-colors duration-200 hover:text-brass ${textColor}`}
              >
                Services
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('contact');
                }}
                className={`font-sans text-sm transition-colors duration-200 hover:text-brass ${textColor}`}
              >
                Contact
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('contact');
                }}
                className={`font-sans text-sm border px-5 py-2.5 transition-colors duration-200 ${
                  isOverDark
                    ? 'border-stage-text/30 text-stage-text hover:border-brass hover:text-brass'
                    : 'border-ink/20 text-ink hover:border-brass hover:text-brass'
                }`}
              >
                Enquire
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              ref={menuButtonRef}
              onClick={() => setMenuOpen(true)}
              className={`md:hidden p-3 transition-colors duration-300 ${textColor}`}
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
      <dialog
        ref={dialogRef}
        id="mobile-menu"
        className="fixed inset-0 w-full h-full bg-paper z-[55] p-0 m-0"
        onClose={() => setMenuOpen(false)}
      >
        <div className="flex flex-col h-full p-6 pt-8">
          <div className="flex items-center justify-between mb-16">
            <span className="font-display text-xl font-bold uppercase tracking-tight text-ink">
              {copy.studioName}
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
            <a
              href="#work"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => scrollToChapter('weddings'), 50);
              }}
              className="font-display text-4xl font-bold uppercase tracking-tight text-ink hover:text-brass transition-colors"
            >
              Work
            </a>
            <a
              href="#archive"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => scrollToSection('archive'), 50);
              }}
              className="font-display text-4xl font-bold uppercase tracking-tight text-ink hover:text-brass transition-colors"
            >
              Archive
            </a>
            <a
              href="#services"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => scrollToSection('services'), 50);
              }}
              className="font-display text-4xl font-bold uppercase tracking-tight text-ink hover:text-brass transition-colors"
            >
              Services
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => scrollToSection('contact'), 50);
              }}
              className="font-display text-4xl font-bold uppercase tracking-tight text-ink hover:text-brass transition-colors"
            >
              Contact
            </a>
          </nav>
          <div className="mt-auto pt-8 border-t border-border">
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                setTimeout(() => scrollToSection('contact'), 50);
              }}
              className="inline-block font-sans text-sm border border-ink/20 text-ink px-6 py-3 hover:border-brass hover:text-brass transition-colors"
            >
              Enquire
            </a>
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
