import { socialLinks, contact, copy } from '../content';

export default function Footer() {
  // B9.13: Instant jump for back-to-top
  const handleBackToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <footer className="bg-paper border-t border-border py-8 md:py-12">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* B9.12: Studio name from content */}
          <div>
            <p className="font-sans text-sm text-ink-soft">
              © {new Date().getFullYear()} {copy.studioName}
            </p>
            {/* B9.4: Contact details in footer */}
            {(contact.email || contact.phone) && (
              <div className="mt-2 space-y-1">
                {contact.email && (
                  <p className="font-sans text-xs text-ink-soft">
                    <a href={`mailto:${contact.email}`} className="hover:text-brass transition-colors">
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p className="font-sans text-xs text-ink-soft">
                    <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-brass transition-colors">
                      {contact.phone}
                    </a>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Social links */}
          {(socialLinks.instagram || socialLinks.facebook || socialLinks.youtube) && (
            <div className="flex gap-6">
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  className="font-sans text-sm text-ink-soft hover:text-brass transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on Instagram"
                >
                  Instagram
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  className="font-sans text-sm text-ink-soft hover:text-brass transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Follow on Facebook"
                >
                  Facebook
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  className="font-sans text-sm text-ink-soft hover:text-brass transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Watch on YouTube"
                >
                  YouTube
                </a>
              )}
            </div>
          )}

          {/* B9.13: Back to top with instant jump */}
          <a
            href="#top"
            onClick={handleBackToTop}
            className="font-mono text-[11px] text-ink-soft uppercase tracking-widest hover:text-brass transition-colors"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
