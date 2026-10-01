import { useEffect, useRef, useState, type FormEvent } from 'react';
import { copy, services, contact, socialLinks } from '../content';
import { useScrollReveal } from '../lib/useScrollReveal';

export default function Contact() {
  const sectionRef = useScrollReveal<HTMLDivElement>(0.1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // B9.1: Check if form can actually send
  const canSubmit = Boolean(contact.formEndpoint || contact.email);

  const validate = (formData: FormData): Record<string, string> => {
    const errs: Record<string, string> = {};
    const name = (formData.get('name') as string || '').trim();
    const emailOrPhone = (formData.get('emailOrPhone') as string || '').trim();
    const message = (formData.get('message') as string || '').trim();

    // B9.3: Better validation
    if (!name) {
      errs.name = 'Please enter your name.';
    } else if (name.length > 100) {
      errs.name = 'Name is too long.';
    }

    if (!emailOrPhone) {
      errs.emailOrPhone = 'Please enter your email or phone.';
    } else {
      // B9.3: Validate email or phone format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[\d\s\-\+\(\)]{7,}$/;
      const isEmail = emailRegex.test(emailOrPhone);
      const isPhone = phoneRegex.test(emailOrPhone);
      
      if (!isEmail && !isPhone) {
        errs.emailOrPhone = 'Please enter a valid email or phone number.';
      } else if (emailOrPhone.length > 100) {
        errs.emailOrPhone = 'Contact info is too long.';
      }
    }

    if (!message) {
      errs.message = 'Please tell us about your project.';
    } else if (message.length > 2000) {
      errs.message = 'Message is too long.';
    }

    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formRef.current || !canSubmit) return;

    const formData = new FormData(formRef.current);
    
    // Honeypot check
    if (formData.get('website')) return;

    const errs = validate(formData);
    setErrors(errs);
    setHasSubmitted(true);
    
    if (Object.keys(errs).length > 0) {
      // B9.3: Focus first error field
      const firstErrorField = formRef.current.querySelector(`[name="${Object.keys(errs)[0]}"]`) as HTMLElement;
      firstErrorField?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // B9.2: If form endpoint exists, POST to it with timeout
    if (contact.formEndpoint) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(contact.formEndpoint, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // B9.2: Check response status
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        setSubmitted(true);
        setTimeout(() => statusRef.current?.focus(), 100);
      } catch (err) {
        // B9.2: Show error with retry option
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setSubmitError(`Failed to send: ${errorMessage}. Please try again or contact us directly.`);
      }
    } else if (contact.email) {
      // B9.5: Mail-app fallback
      fallbackMailto(formData);
    }

    setSubmitting(false);
  };

  const fallbackMailto = (formData: FormData) => {
    const name = formData.get('name');
    const emailOrPhone = formData.get('emailOrPhone');
    const service = formData.get('service');
    const date = formData.get('date');
    const message = formData.get('message');
    
    const subject = encodeURIComponent(`Enquiry from ${name}`);
    // B9.5: Include date in body
    const body = encodeURIComponent(
      `Name: ${name}\nContact: ${emailOrPhone}\nService: ${service}\nDate: ${date || 'Not specified'}\n\n${message}`
    );
    
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    // B9.5: Don't claim success, show "opening email app"
    setSubmitted(true);
    setTimeout(() => statusRef.current?.focus(), 100);
  };

  const handleReset = () => {
    setSubmitted(false);
    setSubmitError(null);
    setErrors({});
    setHasSubmitted(false);
    formRef.current?.reset();
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
          {/* Left: heading, text, and contact details */}
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

            {/* B9.4: Contact details */}
            {(contact.email || contact.phone || contact.whatsapp || contact.location) && (
              <div className="mt-6 space-y-2">
                {contact.email && (
                  <p className="font-sans text-sm text-ink-soft">
                    <a href={`mailto:${contact.email}`} className="hover:text-brass transition-colors">
                      {contact.email}
                    </a>
                  </p>
                )}
                {contact.phone && (
                  <p className="font-sans text-sm text-ink-soft">
                    <a href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-brass transition-colors">
                      {contact.phone}
                    </a>
                  </p>
                )}
                {contact.location && (
                  <p className="font-sans text-sm text-ink-soft">
                    {contact.location}
                  </p>
                )}
              </div>
            )}

            {/* Social links */}
            {(socialLinks.instagram || socialLinks.facebook || socialLinks.youtube || contact.whatsapp) && (
              <div className="mt-8 pt-6 border-t border-border">
                <p className="font-mono text-[10px] text-ink-soft uppercase tracking-widest mb-3">
                  Follow us
                </p>
                <div className="flex flex-wrap gap-4">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener noreferrer">
                      Facebook
                    </a>
                  )}
                  {socialLinks.youtube && (
                    <a href={socialLinks.youtube} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener noreferrer">
                      YouTube
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, '')}`} className="font-sans text-sm text-ink hover:text-brass transition-colors" target="_blank" rel="noopener noreferrer">
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
              // B9.6: Persistent live region with focus management
              <div ref={statusRef} className="bg-card p-8 md:p-12" role="status" aria-live="polite" tabIndex={-1}>
                <p className="font-display text-2xl font-bold uppercase text-ink mb-2">
                  {contact.formEndpoint ? 'Message sent.' : 'Opening your email app...'}
                </p>
                <p className="font-sans text-ink-soft mb-4">
                  {contact.formEndpoint 
                    ? "We'll write back soon. Thank you for reaching out."
                    : `Your email client should open shortly. If it doesn't, you can email us directly at ${contact.email}`
                  }
                </p>
                {contact.email && !contact.formEndpoint && (
                  <p className="font-mono text-sm text-ink mb-4">
                    <a href={`mailto:${contact.email}`} className="hover:text-brass transition-colors underline">
                      {contact.email}
                    </a>
                  </p>
                )}
                {/* B9.6: Send another button */}
                <button
                  onClick={handleReset}
                  className="font-sans text-sm text-ink-soft hover:text-brass transition-colors underline"
                >
                  Send another message
                </button>
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

                {/* B9.1: Warning if form cannot submit */}
                {!canSubmit && (
                  <div className="bg-alert/10 border border-alert/30 p-4 mb-4">
                    <p className="font-sans text-sm text-alert">
                      {import.meta.env.DEV 
                        ? `Form not configured. Add contact.formEndpoint or contact.email to content/index.ts`
                        : 'Contact form is currently unavailable. Please email us directly or call.'
                      }
                    </p>
                  </div>
                )}

                {/* B9.2: Error message with retry */}
                {submitError && (
                  <div className="bg-alert/10 border border-alert/30 p-4 mb-4" role="alert">
                    <p className="font-sans text-sm text-alert mb-2">{submitError}</p>
                    {contact.email && (
                      <p className="font-sans text-sm text-ink-soft">
                        Or email us directly at{' '}
                        <a href={`mailto:${contact.email}`} className="text-ink hover:text-brass transition-colors underline">
                          {contact.email}
                        </a>
                      </p>
                    )}
                  </div>
                )}

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
                    maxLength={100}
                    // B9.3: Autofill hints
                    autoComplete="name"
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors"
                    aria-describedby={errors.name ? 'name-error' : undefined}
                    aria-invalid={hasSubmitted && !!errors.name}
                  />
                  {hasSubmitted && errors.name && (
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
                    maxLength={100}
                    // B9.3: Input mode for mobile keyboard
                    inputMode="email"
                    // B9.3: Autofill hints
                    autoComplete="email"
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors"
                    aria-describedby={errors.emailOrPhone ? 'email-error' : undefined}
                    aria-invalid={hasSubmitted && !!errors.emailOrPhone}
                  />
                  {hasSubmitted && errors.emailOrPhone && (
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
                  {/* B9.7: Custom select with arrow icon */}
                  <div className="relative">
                    <select
                      id="service"
                      name="service"
                      defaultValue={services[0]?.id}
                      className="w-full bg-paper border border-border px-4 py-3 pr-10 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors appearance-none"
                    >
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {/* B9.7: Arrow icon */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className="text-ink-soft">
                        <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
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
                    maxLength={2000}
                    rows={4}
                    className="w-full bg-paper border border-border px-4 py-3 font-sans text-ink text-base focus:border-brass focus:outline-none transition-colors resize-none"
                    aria-describedby={errors.message ? 'message-error' : undefined}
                    aria-invalid={hasSubmitted && !!errors.message}
                  />
                  {hasSubmitted && errors.message && (
                    <p id="message-error" className="mt-1 font-mono text-[11px] text-alert" role="alert">
                      {errors.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
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
