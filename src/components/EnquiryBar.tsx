import { useEffect, useState } from 'react';
import { contact } from '../content';
import { scrollToContact } from '../lib/scrollTo';

// Phones only: a quiet bar with Enquire (and WhatsApp when set) after the hero,
// hidden again once the contact form or the footer is on screen.
export default function EnquiryBar() {
  const [pastHero, setPastHero] = useState(false);
  const [covered, setCovered] = useState(false);
  const [inContact, setInContact] = useState(false);
  const [inFooter, setInFooter] = useState(false);

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.9);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const contactEl = document.getElementById('contact');
    const footerEl = document.querySelector('footer');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.target === contactEl) setInContact(e.isIntersecting);
          else setInFooter(e.isIntersecting);
        });
      },
      { threshold: 0.05 }
    );
    if (contactEl) io.observe(contactEl);
    if (footerEl) io.observe(footerEl);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setCovered(inContact || inFooter);
  }, [inContact, inFooter]);

  const show = pastHero && !covered;
  const wa = contact.whatsapp.replace(/[^0-9]/g, '');
  const tab = show ? 0 : -1;

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 bg-border transition-[transform,opacity] duration-300 md:hidden ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex gap-px border-t border-border">
        <button
          type="button"
          tabIndex={tab}
          onClick={() => scrollToContact()}
          className="flex-1 bg-ink py-4 font-mono text-[12px] uppercase tracking-[0.2em] text-paper"
        >
          Enquire
        </button>
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={tab}
            className="flex-1 bg-paper py-4 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink"
          >
            WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
