import { useEffect, useRef, useState, type FormEvent } from 'react';
import { copy, services, contact, socialLinks } from '../content';

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const validate = (formData: FormData): Record<string, string> => {
    const errs: Record<string, string> = {};
    const name = formData.get('name') as string;
    const emailOrPhone = formData.get('emailOrPhone') as string;
    const message = formData.get('message') as string;

    if (!name?.trim()) errs.name = 'Please enter your name.';
    if (!emailOrPhone?.trim()) errs.emailOrPhone = 'Please enter your email or phone.';
    if (!message?.trim()) errs.message = 'Please tell us about your project.';

    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    
    // Honeypot check
    if (formData.get('website')) return;

    const errs = validate(formData);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);

    // If form endpoint exists, POST to it
    if (contact.formEndpoint) {
      try {
        await fetch(contact.formEndpoint, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });
        setSubmitted(true);
      } catch {
        // Fall back to mailto
        fallbackMailto(formData);
      }
    } else if (contact.email) {
      fallbackMailto(formData);
    } else {
      // No endpoint or email - just show success (demo mode)
      setSubmitted(true);
    }

    setSubmitting(false);
  };

  const fallbackMailto = (formData: FormData) => {
    const name = formData.get('name');
    const emailOrPhone = formData.get('emailOrPhone');
    const service = formData.get('service');
    const message = formData.get('message');
    
    const subject = encodeURIComponent(`Enquiry from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nContact: ${emailOrPhone}\nService: ${service}\n\n${message}`
    );
    
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <section
      ref={sectionRef}
      id="contact"
      className="bg-paper py-16 md:py-24 border-t border-border scroll-mt-20 md:scroll-mt-24"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-[1600px] mx-auto px-[clamp(1.25rem,4vw,4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16">
          {/* Left: heading and text */}
          <div className="md:col-span-5 reveal">
            <p className="font-mono text-[10px] text-ink-soft uppercase tracking-[0.2em] mb-3">
              Contact
            </p>
            <h2
              id="contact-heading"
              className="font-display font-bold uppercase tracking-[-0.02em] text-ink mb-4"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 5rem)', lineHeight: 0.9 }}
            >
              {copy.contactHeading}
            </h2>
            <p className="font-sans text-base text-ink-soft max-w-sm">
              {copy.contactText}
            </p>

            {/* Social links */}
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.youtube || contact.whatsapp) && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="font-mono text-[10px] text-ink-soft uppercase tracking-widest mb-3">
                  Find us
                </p>
                <div className="flex flex-wrap gap-4">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener">
                      Instagram
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener">
                      Facebook
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a href={socialLinks.youtube} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener">
                      YouTube
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener">
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: form */}
          <div className="md:col-span-7 reveal" style={{ transitionDelay: '0.1s' }}>
            {submitted ? (
              <div className="bg-card p-8 md:p-12" role="status" aria-live="polite">
                <p className="font-display text-2xl font-bold uppercase text-ink mb-2">
                  Message sent.
                </p>
                <p className="font-sans text-ink-soft">
                  We'll write back soon. Thank you for reaching out.
                </p>
              </div>
            ) : (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className="bg-card p-6 md:p-10 space-y-6"
                noValidate
              >
                {/* Honeypot */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                {/* Name */}
                <div>
                  <label htmlFor="name" className="block font-mono text-[11px] text-ink-soft uppercase tracking-widest mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors"
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p id="name-error" className="mt-1 font-mono text-[11px] text-alert" role="alert">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email or phone */}
                <div>
                  <label htmlFor="emailOrPhone" className="block font-mono text-[11px] text-ink-soft uppercase tracking-widest mb-2">
                    Email or phone
                  </label>
                  <input
                    type="text"
                    id="emailOrPhone"
                    name="emailOrPhone"
                    required
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors"
                    aria-describedby={errors.emailOrPhone ? 'email-error' : undefined}
                    aria-invalid={!!errors.emailOrPhone}
                  />
                  {errors.emailOrPhone && (
                    <p id="email-error" className="mt-1 font-mono text-[11px] text-alert" role="alert">
                      {errors.emailOrPhone}
                    </p>
                  )}
                </div>

                {/* Service type */}
                <div>
                  <label htmlFor="service" className="block font-mono text-[11px] text-ink-soft uppercase tracking-widest mb-2">
                    What are you looking for?
                  </label>
                  <select
                    id="service"
                    name="service"
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors appearance-none"
                  >
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date (optional) */}
                <div>
                  <label htmlFor="date" className="block font-mono text-[11px] text-ink-soft uppercase tracking-widest mb-2">
                    Date <span className="text-ink-soft/50">(optional)</span>
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block font-mono text-[11px] text-ink-soft uppercase tracking-widest mb-2">
                    Tell us more
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors resize-none"
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    aria-invalid={!!errors.message}
                  />
                  {errors.message && (
                    <p id="message-error" className="mt-1 font-mono text-[11px] text-alert" role="alert">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-ink text-paper font-sans text-sm font-medium py-4 hover:bg-ink/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Send enquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
