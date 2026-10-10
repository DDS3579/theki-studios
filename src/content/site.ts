// Text for the About, Process, Testimonials and FAQ sections.
// Edit the words freely. Sections that have no entries are hidden automatically.

export const about = {
  eyebrow: 'The studio',
  heading: 'Photography and film, made with patience.',
  paragraphs: [
    'Theki Studios is a photography and film studio. We work on weddings, cars, portraits and events, and treat every shoot as a small production: planned beforehand, directed gently on the day, and finished with care.',
    'We keep the crew small and the process simple, so you can relax in front of the camera and still end up with images that feel like you.',
  ],
  // Three short principles shown under the text
  principles: [
    { title: 'A documentary eye', text: 'We watch for real moments and let them happen.' },
    { title: 'A feel for light', text: 'Natural light first, shaped only when it helps.' },
    { title: 'Finished with care', text: 'Every image is edited by hand, never in bulk.' },
  ],
  // Optional facts, shown as a small row. Example: { label: 'Based in', value: 'Kathmandu' }
  facts: [] as { label: string; value: string }[],
  // The photo shown beside the text (id from the photo list)
  photoId: 'p1',
};

export const howWeWork = {
  eyebrow: 'Process',
  heading: 'How we work',
  steps: [
    { title: 'Enquire', text: 'Tell us the date, the place and what you have in mind. We reply personally.' },
    { title: 'Plan', text: 'We agree the look, the schedule and the details, so the day itself runs smoothly.' },
    { title: 'Shoot', text: 'A small crew, gentle direction and no rush. We make it easy to be yourself.' },
    { title: 'Deliver', text: 'Your finished photographs and films, edited with care and ready to share and print.' },
  ],
};

// Client words. Leave empty until you have real ones; the section stays hidden.
// Example: { quote: 'They made the whole day feel effortless.', name: 'A. and R.', detail: 'Wedding, 2026' }
export const testimonials: { quote: string; name: string; detail?: string }[] = [];

export const faq = {
  eyebrow: 'Questions',
  heading: 'Good to know',
  items: [
    {
      q: 'How far ahead should we book?',
      a: 'As early as you can. Weekend dates, and weddings in particular, are taken first. Send us your date and we will tell you if it is free.',
    },
    {
      q: 'Do you travel for shoots?',
      a: 'Yes. Tell us the location when you enquire and we will confirm any travel details together with your quote.',
    },
    {
      q: 'How do you price your work?',
      a: 'Every shoot is different: the date, the hours, the number of people and what you need delivered. After hearing from you we send a clear quote.',
    },
    {
      q: 'When will we receive our photographs?',
      a: 'We confirm the delivery time with you before the shoot, based on the type and size of the project.',
    },
    {
      q: 'Can you shoot both photos and video?',
      a: 'Yes. We offer wedding and event videography alongside photography, and can plan both together so they work as one story.',
    },
    {
      q: 'Can we see more work from a shoot like ours?',
      a: 'Of course. Message us what you are planning and we will share a fuller set from a similar shoot.',
    },
  ],
};
