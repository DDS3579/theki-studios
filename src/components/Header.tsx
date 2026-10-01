import { useEffect, useRef, useState } from 'react';
import { contact, socialLinks } from '../content';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [onStage, setOnStage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      
      // Detect if we're over the dark stage section
      const workSection = document.getElementById('work');
      const heroSection = document.querySelector('section[aria-label="Introduction"]');
      
      let isOverDark = false;
      
      if (heroSection) {
        const heroRect = heroSection.getBoundingClientRect();
        if (heroRect.top <= 80 && heroRect.bottom > 80) {
          isOverDark = true;
        }
      }
      
      if (workSection) {
        const workRect = workSection.getBoundingClientRect();
        if (workRect.top <= 80 && workRect.bottom > 80) {
          isOverDark = true;
        }
      }
      
      setOnStage(isOverDark);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      if (dialogRef.current?.open) {
        dialogRef.current.close();
      }
      document.body.style.overflow = '';
    }
  }, [menuOpen]);

  const textColor = onStage ? 'text-stage-text' : 'text-ink';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled
            ? 'bg-paper/95 backdrop-blur-sm border-b border-border'
            : 'bg-transparent'
        }`}
        role="banner"
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
                    : onStage
                      ? 'border-stage-text/30 text-stage-text hover:border-brass hover:text-brass'
                      : 'border-ink/20 text-ink hover:border-brass hover:text-brass'
                }`}
              >
                Enquire
              </a>
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMenuOpen(true)}
              className={`md:hidden p-3 transition-colors duration-300 ${
                scrolled ? 'text-ink' : textColor
              }`}
              aria-label="Open menu"
              aria-expanded={menuOpen}
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
                onClick={() => setMenuOpen(false)}
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
            {(socialLinks.instagram || socialLinks.facebook) && (
              <div className="flex gap-6 mt-6">
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} className="text-ink-soft hover:text-brass text-sm transition-colors" aria-label="Instagram">
                    Instagram
                  </a>
                )}
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} className="text-ink-soft hover:text-brass text-sm transition-colors" aria-label="Facebook">
                    Facebook
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
