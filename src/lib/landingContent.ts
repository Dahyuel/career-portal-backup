// Landing page content for an event. Each event stores its own copy in `events.landing`;
// anything missing falls back to these defaults (the original ASU Career Expo 2026 page).
//
// Text fields accept two simple marks:  [[words]] are shown in the accent colour,
// **words** are shown in bold. Everything is rendered as plain text (no HTML).
import { DEFAULT_THEME, type LandingTheme } from './theme';

export interface LandingCard {
  title: string;
  text: string;
  icon: string;
}

export interface LandingStat {
  value: number;
  suffix: string;
  label: string;
}

export interface LandingDay {
  date: string;
  title: string;
  subtitle: string;
  items: string[];
  hours: string;
  icon: string;
}

export interface LandingHighlight {
  label: string;
  icon: string;
}

export interface LandingGain {
  text: string;
  icon: string;
}

export interface LandingContent {
  seo_title: string;
  theme: LandingTheme;
  navbar: {
    show: boolean;
    left_logo_url: string;
    right_logo_url: string;
    org_name: string;
    org_subtitle: string;
    show_partners: boolean;
    partners_label: string;
    show_speakers: boolean;
    speakers_label: string;
    show_about: boolean;
    about_label: string;
    login_label: string;
  };
  footer: {
    show: boolean;
    logo_url: string;
    text: string;
    show_visits: boolean;
  };
  hero: {
    title: string;
    edition: string;
    tagline: string;
    dates: string;
    venue: string;
    map_url: string;
    logo_url: string;
    video_url: string;
    highlights: LandingHighlight[];
    slogan: string;
  };
  ended_popup: {
    show: boolean;
    logos: string[];
    title: string;
    title_highlight: string;
    thanks: string;
    subtext: string;
    volunteers_label: string;
    volunteers_title: string;
    volunteers_text: string;
    badge: string;
    edition_tag: string;
  };
  registration: {
    show: boolean;
    badge: string;
    heading: string;
    text: string;
    button_label: string;
    register_url: string;
    login_line: string;
    login_link_label: string;
    asu_banner: string;
    asu_title: string;
    asu_text: string;
    note_prefix: string;
    asu_note: string;
    show_non_asu: boolean;
    non_asu_banner: string;
    non_asu_title: string;
    non_asu_text: string;
    individual_label: string;
    individual_price: string;
    individual_note: string;
    group_label: string;
    group_price: string;
    group_note: string;
    currency: string;
  };
  about: {
    show: boolean;
    badge: string;
    heading: string;
    text: string;
    cards: LandingCard[];
  };
  gains: {
    show: boolean;
    heading: string;
    text: string;
    list_title: string;
    items: LandingGain[];
    stats: LandingStat[];
  };
  schedule: {
    show: boolean;
    badge: string;
    heading: string;
    text: string;
    days: LandingDay[];
  };
  employer: {
    show: boolean;
    heading: string;
    paragraphs: string[];
    button_label: string;
    form_url: string;
  };
  highlights: {
    show: boolean;
    badge: string;
    heading: string;
    text: string;
    video_url: string;
    caption: string;
  };
  social: {
    show: boolean;
    heading: string;
    text: string;
    linkedin: string;
    facebook: string;
    instagram: string;
    whatsapp: string;
    tiktok: string;
  };
}

export const DEFAULT_LANDING: LandingContent = {
  seo_title: 'ASU Career Expo 2026',
  theme: DEFAULT_THEME,
  navbar: {
    show: true,
    left_logo_url: '/images/landing/logo.png',
    right_logo_url: '/images/landing/logo_ain_shams.png',
    org_name: 'Ain Shams University',
    org_subtitle: 'Career Center',
    show_partners: true,
    partners_label: 'Partners',
    show_speakers: true,
    speakers_label: 'Speakers',
    show_about: true,
    about_label: 'About',
    login_label: 'Login'
  },
  footer: {
    show: true,
    logo_url: '/images/Ain_Shams_logoo.png',
    text: '© Powered by FCIS ASU, All rights reserved.',
    show_visits: true
  },
  hero: {
    title: 'ASU [[CAREER EXPO 2026]]',
    edition: '5th Edition',
    tagline: 'Beyond Opportunities',
    dates: 'April 7th - 8th, 2026',
    venue: 'Dar El Deyafa, ASU Campus',
    map_url: 'https://maps.app.goo.gl/SwGZ311XhHUGBCT68',
    logo_url: '/images/landing/career_expo_logo.png',
    video_url: '/images/landing/EF25.mp4',
    highlights: [
      { label: '100+ Companies', icon: 'briefcase' },
      { label: '200+ Speakers', icon: 'award' },
      { label: '2-Day Event', icon: 'calendar' }
    ],
    slogan: 'Connect . Elevate . Get Hired'
  },
  ended_popup: {
    show: true,
    logos: ['/images/landing/logo.png', '/images/cslogo.jpg'],
    title: 'ASU Career Expo 26 has',
    title_highlight: 'Officially Ended',
    thanks: 'Thank you to [[everyone]] who made this event unforgettable.',
    subtext: 'We hope you found it valuable and made meaningful connections, and most importantly, had a great time.',
    volunteers_label: 'Special Recognition',
    volunteers_title: 'To our Amazing Volunteers',
    volunteers_text: '"The backbone of this event — your presence, energy, and enthusiasm made all the difference. We are incredibly grateful for the community we\'ve built together."',
    badge: "We're coming back [[STRONGER]] next year",
    edition_tag: 'ASU Career Expo 2026 — 5th Edition'
  },
  registration: {
    show: true,
    badge: 'Open for Everyone',
    heading: "This year it's open for [[All]] Students & Alumni!",
    text: "Whether you're an ASU alumni/student or from another university, there's a path for you to join ASU Career Expo 2026.",
    button_label: 'Register Here',
    register_url: '/attendee-register',
    login_line: 'Already have an account, even from a past event?',
    login_link_label: 'Log in to join',
    asu_banner: 'Free Entry',
    asu_title: 'ASU Students & Alumni',
    asu_text: 'This event is **completely free** for Ain Shams University students and alumni.',
    note_prefix: 'Note:',
    asu_note: 'Registration is mandatory for all attendees, and be sure to upload valid enrollment proof of Ain Shams University to not get excluded.',
    show_non_asu: true,
    non_asu_banner: 'Paid Entry',
    non_asu_title: 'Non-ASU Students & Alumni',
    non_asu_text: 'Students and alumni from other universities can join us by purchasing a ticket.',
    individual_label: 'Individual ticket',
    individual_price: '275',
    individual_note: 'For one person only',
    group_label: 'Group ticket',
    group_price: '5 for 1100',
    group_note: 'Save 275 EGP!',
    currency: 'EGP'
  },
  about: {
    show: true,
    badge: 'Why Attend',
    heading: 'ASU Career Expo [[2026]]',
    text: 'ASU Career Expo 2026 is going beyond boundaries. Moving to the prestigious **Dar El Deyafa**, we are hosting the largest talent-to-industry gathering. For the first time, we open our doors to **all job seekers in Egypt** to meet **100+ global and regional giants**.',
    cards: [
      { title: 'Network', text: 'Engage with experts from Top Leading companies and expand your professional network.', icon: 'handshake' },
      { title: 'Elevate & Mentorship', text: 'Access 200+ Mentors and Speakers through "Career Talks" and one-on-one coaching sessions.', icon: 'graduation' },
      { title: 'Get Hired', text: 'Land your next role with many opportunities and exclusive job openings.', icon: 'briefcase' }
    ]
  },
  gains: {
    show: true,
    heading: 'Launch Your [[Dream Career]]',
    text: "Don't miss this opportunity to take the first step towards your dream career.",
    list_title: 'What You Will Gain?',
    items: [
      { text: 'Career guidance with experts', icon: 'briefcase' },
      { text: 'Internship Opportunities', icon: 'award' },
      { text: 'Connection with your peers', icon: 'users' }
    ],
    stats: [
      { value: 100, suffix: '+', label: 'Leading Companies' },
      { value: 15000, suffix: '+', label: 'Targeted Attendees' },
      { value: 200, suffix: '+', label: 'Industry Speakers & Mentors' },
      { value: 19, suffix: '', label: 'Faculties Covered' }
    ]
  },
  schedule: {
    show: true,
    badge: 'Event Schedule',
    heading: '2 Days of [[Opportunities]]',
    text: 'Each day is dedicated to specific faculties and industries. Find your day and join us!',
    days: [
      {
        date: 'April 7, 2026',
        title: 'Day 1',
        subtitle: 'Practical, Medical & Science Sectors',
        items: ['Engineering & Computer Science', 'Medicine, Pharmacy, Dentistry & Nursing', 'Science & Agriculture'],
        hours: '10:00 AM – 8:00 PM',
        icon: 'settings'
      },
      {
        date: 'April 8, 2026',
        title: 'Day 2',
        subtitle: 'Business, Humanities & Social Sciences',
        items: ['Business, Commerce & Management', 'Languages (Al-Alsun), Arts & Archaeology', 'Mass Communication & Law', 'Education & Human Sciences'],
        hours: '10:00 AM – 8:00 PM',
        icon: 'briefcase'
      }
    ]
  },
  employer: {
    show: true,
    heading: 'Are You an Employer?',
    paragraphs: [
      'Are you interested in participating in our events or hiring top talent from Ain Shams University?',
      'Join our network of over 500+ partners and connect with the brightest minds. We make recruitment easy, efficient, and effective.',
      'Fill out our partnership form to discuss future collaborations.'
    ],
    button_label: 'Get in touch',
    form_url: 'https://forms.gle/GcQDEVEgJPsQor2NA'
  },
  highlights: {
    show: true,
    badge: 'Highlights',
    heading: "Relive [[Last Year's]] Success",
    text: 'Watch the highlights from our previous expo and see what awaits you this year.',
    video_url: 'https://www.youtube.com/embed/l6LLgP62te0',
    caption: 'ASU Employment Fair 2025 - Official Highlights'
  },
  social: {
    show: true,
    heading: 'Join Our Social Community',
    text: 'Stay updated with the latest opportunities and events',
    linkedin: 'https://www.linkedin.com/company/asucareercenter/',
    facebook: 'https://www.facebook.com/ASUCCOFFICIAL',
    instagram: 'https://www.instagram.com/asucareercenter',
    whatsapp: 'https://whatsapp.com/channel/0029Vb7KfyxL2ATrTuGIVG0X',
    tiktok: 'https://www.tiktok.com/@asu.career.centre'
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// Keeps the shape of `base`: unknown keys are dropped, wrong types fall back to the default.
const mergeValue = (base: unknown, override: unknown): unknown => {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) out[key] = mergeValue(base[key], override[key]);
    return out;
  }
  return typeof override === typeof base ? override : base;
};

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

// Pages saved before icons existed stored plain lines; upgrade them so nothing breaks.
const upgradeLists = (content: LandingContent): LandingContent => {
  const defaults = DEFAULT_LANDING;

  content.hero.highlights = (content.hero.highlights as unknown[]).map((item, i) =>
    isPlainObject(item)
      ? { label: str(item.label), icon: str(item.icon, defaults.hero.highlights[i % 3]?.icon ?? 'briefcase') }
      : { label: str(item), icon: defaults.hero.highlights[i % 3]?.icon ?? 'briefcase' }
  );

  content.about.cards = (content.about.cards as unknown[]).map((item, i) => {
    const card = isPlainObject(item) ? item : {};
    return {
      title: str(card.title),
      text: str(card.text),
      icon: str(card.icon, defaults.about.cards[i % 3]?.icon ?? 'handshake')
    };
  });

  content.gains.items = (content.gains.items as unknown[]).map((item, i) =>
    isPlainObject(item)
      ? { text: str(item.text), icon: str(item.icon, defaults.gains.items[i % 3]?.icon ?? 'briefcase') }
      : { text: str(item), icon: defaults.gains.items[i % 3]?.icon ?? 'briefcase' }
  );

  content.schedule.days = (content.schedule.days as unknown[]).map((item, i) => {
    const day = isPlainObject(item) ? item : {};
    return {
      date: str(day.date),
      title: str(day.title),
      subtitle: str(day.subtitle),
      items: Array.isArray(day.items) ? day.items.map((line) => str(line)) : [],
      hours: str(day.hours),
      icon: str(day.icon, defaults.schedule.days[i % 2]?.icon ?? 'calendar')
    };
  });

  content.ended_popup.logos = (content.ended_popup.logos as unknown[]).map((logo) => str(logo));
  content.employer.paragraphs = (content.employer.paragraphs as unknown[]).map((line) => str(line));

  return content;
};

export const mergeLanding = (stored: unknown): LandingContent =>
  upgradeLists(mergeValue(DEFAULT_LANDING, stored) as LandingContent);

/** Only same-site paths and http(s) links; anything else (e.g. `javascript:`) is dropped. */
export const safeUrl = (url: string | null | undefined): string | null => {
  const value = (url ?? '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
};

/** Accepts any YouTube link (watch, share, shorts or embed) and returns the embed address. */
export const toYouTubeEmbed = (url: string | null | undefined): string | null => {
  const safe = safeUrl(url);
  if (!safe || safe.startsWith('/')) return null;
  const parsed = new URL(safe);
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = parsed.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parsed.pathname === '/watch') id = parsed.searchParams.get('v');
    else if (/^\/(embed|shorts)\//.test(parsed.pathname)) id = parsed.pathname.split('/')[2] ?? null;
  }
  return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube.com/embed/${id}` : null;
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  career_fair: 'Career Expo',
  career_week: 'Career Week'
};
