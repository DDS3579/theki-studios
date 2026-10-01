import { socialLinks } from '../content';

export default function Footer() {
  return (
    <footer className="bg-paper border-t border-border py-8 md:py-12">
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Copyright */}
          <div>
            <p className="font-sans text-sm text-ink-soft">
              © {new Date().getFullYear()} Theki Studios
            </p>
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

          {/* Back to top */}
          <a
            href="#top"
            className="font-mono text-[11px] text-ink-soft uppercase tracking-widest hover:text-brass transition-colors"
          >
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
