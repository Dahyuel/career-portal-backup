// Landing page editor for one event: every text, picture, video, icon and colour of the
// public page, the top menu and the footer, with a live preview.
import React, { Suspense, useRef, useState } from 'react';
import { buttonClass, callSadmin, errorText, inputClass, labelClass, type Notify } from './sadminApi';
import { Badge, LoadingBlock, MIcon, Panel, Toggle } from './ui';
import { DEFAULT_LANDING, mergeLanding, safeUrl, toYouTubeEmbed, type LandingContent } from '../../lib/landingContent';
import { MAX_UPLOAD_MB, uploadEventMedia, type MediaKind } from '../../lib/eventMedia';
import { COLOUR_PRESETS, DEFAULT_THEME, isHexColour, normaliseHex, themeStyle } from '../../lib/theme';
import { LANDING_ICONS, landingIcon } from '../../lib/landingIcons';

const LandingPage = React.lazy(() => import('../../pages/Landing page/LandingPage').then((m) => ({ default: m.LandingPage })));

type Kind = 'text' | 'rich' | 'textarea' | 'lines' | 'url' | 'image' | 'images' | 'video' | 'embed'
  | 'number' | 'toggle' | 'colour' | 'accent' | 'colours' | 'icon';

interface FieldDef {
  key: string;
  label: string;
  kind: Kind;
  hint?: string;
}

interface ListDef {
  key: string;
  label: string;
  itemLabel: string;
  max: number;
  fields: FieldDef[];
  blank: Record<string, unknown>;
}

interface SectionDef {
  key: keyof LandingContent;
  title: string;
  description: string;
  fields: FieldDef[];
  lists?: ListDef[];
}

const RICH_HINT = 'Put [[words]] in double brackets to colour them, **words** in stars for bold.';

const SECTIONS: SectionDef[] = [
  {
    key: 'theme',
    title: 'Colours',
    description: 'The accent colour, the text colours and the section backgrounds of the whole page.',
    fields: [
      { key: 'theme.accent', label: 'Accent colour', kind: 'accent', hint: 'Buttons, highlights, badges, icons and the menu.' },
      { key: 'theme.heading', label: 'Headings', kind: 'colour' },
      { key: 'theme.body', label: 'Normal text', kind: 'colour' },
      { key: 'theme.on_dark', label: 'Text over the dark top area', kind: 'colour' },
      { key: 'theme.page_bg', label: 'Page background', kind: 'colour' },
      { key: 'theme.section_bg', label: 'Alternating section background', kind: 'colour' },
      { key: 'theme.free_from', label: 'Free ticket banner: from', kind: 'colour' },
      { key: 'theme.free_to', label: 'Free ticket banner: to', kind: 'colour' },
      { key: 'theme.paid_from', label: 'Paid ticket banner: from', kind: 'colour' },
      { key: 'theme.paid_to', label: 'Paid ticket banner: to', kind: 'colour' },
      { key: 'theme.stats', label: 'The four big numbers', kind: 'colours' }
    ]
  },
  {
    key: 'seo_title',
    title: 'Browser tab title',
    description: 'Shown in the browser tab.',
    fields: [{ key: 'seo_title', label: 'Title', kind: 'text' }]
  },
  {
    key: 'navbar',
    title: 'Top menu',
    description: 'The bar at the top of every public page: logos, name and menu items.',
    fields: [
      { key: 'navbar.show', label: 'Show the top menu', kind: 'toggle' },
      { key: 'navbar.left_logo_url', label: 'Left logo', kind: 'image' },
      { key: 'navbar.org_name', label: 'Name next to the logo', kind: 'text' },
      { key: 'navbar.org_subtitle', label: 'Line under the name', kind: 'text' },
      { key: 'navbar.right_logo_url', label: 'Right logo', kind: 'image' },
      { key: 'navbar.show_partners', label: 'Show the Partners item', kind: 'toggle' },
      { key: 'navbar.partners_label', label: 'Partners label', kind: 'text' },
      { key: 'navbar.show_speakers', label: 'Show the Speakers item', kind: 'toggle' },
      { key: 'navbar.speakers_label', label: 'Speakers label', kind: 'text' },
      { key: 'navbar.show_about', label: 'Show the About item', kind: 'toggle' },
      { key: 'navbar.about_label', label: 'About label', kind: 'text' },
      { key: 'navbar.login_label', label: 'Login button', kind: 'text', hint: 'Leave empty to hide the button.' }
    ]
  },
  {
    key: 'hero',
    title: 'Top of the page',
    description: 'Event name, dates, venue, logo and background video.',
    fields: [
      { key: 'hero.title', label: 'Event title', kind: 'rich', hint: RICH_HINT },
      { key: 'hero.edition', label: 'Edition', kind: 'text', hint: 'e.g. 6th Edition. Leave empty to hide.' },
      { key: 'hero.tagline', label: 'Tagline', kind: 'text' },
      { key: 'hero.dates', label: 'Dates, as shown', kind: 'text', hint: 'e.g. October 12th - 14th, 2026' },
      { key: 'hero.venue', label: 'Venue, as shown', kind: 'text' },
      { key: 'hero.map_url', label: 'Google Maps link', kind: 'url' },
      { key: 'hero.logo_url', label: 'Event logo', kind: 'image' },
      { key: 'hero.video_url', label: 'Background video', kind: 'video' },
      { key: 'hero.slogan', label: 'Slogan', kind: 'text' }
    ],
    lists: [{
      key: 'hero.highlights', label: 'Highlight boxes', itemLabel: 'Box', max: 3, blank: { label: '', icon: 'briefcase' },
      fields: [{ key: 'label', label: 'Text', kind: 'text' }, { key: 'icon', label: 'Icon', kind: 'icon' }]
    }]
  },
  {
    key: 'ended_popup',
    title: '"Event ended" pop-up',
    description: 'Opens over the page when someone visits. Turn it on after the event is over.',
    fields: [
      { key: 'ended_popup.show', label: 'Show the pop-up', kind: 'toggle' },
      { key: 'ended_popup.logos', label: 'Logos', kind: 'images' },
      { key: 'ended_popup.title', label: 'Heading, first line', kind: 'text' },
      { key: 'ended_popup.title_highlight', label: 'Heading, highlighted line', kind: 'text' },
      { key: 'ended_popup.thanks', label: 'Thank-you message', kind: 'rich', hint: RICH_HINT },
      { key: 'ended_popup.subtext', label: 'Smaller text', kind: 'textarea' },
      { key: 'ended_popup.volunteers_label', label: 'Volunteers box: label', kind: 'text' },
      { key: 'ended_popup.volunteers_title', label: 'Volunteers box: title', kind: 'text' },
      { key: 'ended_popup.volunteers_text', label: 'Volunteers box: text', kind: 'textarea' },
      { key: 'ended_popup.badge', label: 'Badge', kind: 'rich', hint: RICH_HINT },
      { key: 'ended_popup.edition_tag', label: 'Small line at the bottom', kind: 'text' }
    ]
  },
  {
    key: 'registration',
    title: 'Registration and tickets',
    description: 'The register button, the free ASU card and the paid ticket card.',
    fields: [
      { key: 'registration.show', label: 'Show this section', kind: 'toggle' },
      { key: 'registration.badge', label: 'Badge', kind: 'text' },
      { key: 'registration.heading', label: 'Heading', kind: 'rich', hint: RICH_HINT },
      { key: 'registration.text', label: 'Text', kind: 'textarea' },
      { key: 'registration.button_label', label: 'Button label', kind: 'text' },
      { key: 'registration.register_url', label: 'Button goes to', kind: 'url', hint: 'Normally /attendee-register' },
      { key: 'registration.login_line', label: 'Line under the button', kind: 'text' },
      { key: 'registration.login_link_label', label: 'Login link text', kind: 'text', hint: 'Leave empty to hide the link.' },
      { key: 'registration.asu_banner', label: 'ASU card: banner', kind: 'text' },
      { key: 'registration.asu_title', label: 'ASU card: title', kind: 'text' },
      { key: 'registration.asu_text', label: 'ASU card: text', kind: 'rich', hint: RICH_HINT },
      { key: 'registration.note_prefix', label: 'ASU card: note prefix', kind: 'text', hint: 'The bold word before the note, e.g. Note:' },
      { key: 'registration.asu_note', label: 'ASU card: note', kind: 'textarea' },
      { key: 'registration.show_non_asu', label: 'Show the paid card for other universities', kind: 'toggle' },
      { key: 'registration.non_asu_banner', label: 'Paid card: banner', kind: 'text' },
      { key: 'registration.non_asu_title', label: 'Paid card: title', kind: 'text' },
      { key: 'registration.non_asu_text', label: 'Paid card: text', kind: 'textarea' },
      { key: 'registration.individual_label', label: 'Individual ticket: label', kind: 'text' },
      { key: 'registration.individual_price', label: 'Individual ticket: price', kind: 'text', hint: 'Leave empty to hide.' },
      { key: 'registration.individual_note', label: 'Individual ticket: note', kind: 'text' },
      { key: 'registration.group_label', label: 'Group ticket: label', kind: 'text' },
      { key: 'registration.group_price', label: 'Group ticket: price', kind: 'text', hint: 'e.g. 5 for 1100. Leave empty to hide.' },
      { key: 'registration.group_note', label: 'Group ticket: note', kind: 'text' },
      { key: 'registration.currency', label: 'Currency', kind: 'text' }
    ]
  },
  {
    key: 'about',
    title: 'About the event',
    description: 'Introduction and up to three cards.',
    fields: [
      { key: 'about.show', label: 'Show this section', kind: 'toggle' },
      { key: 'about.badge', label: 'Badge', kind: 'text' },
      { key: 'about.heading', label: 'Heading', kind: 'rich', hint: RICH_HINT },
      { key: 'about.text', label: 'Text', kind: 'textarea', hint: RICH_HINT }
    ],
    lists: [{
      key: 'about.cards', label: 'Cards', itemLabel: 'Card', max: 3, blank: { title: '', text: '', icon: 'handshake' },
      fields: [
        { key: 'title', label: 'Title', kind: 'text' },
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'text', label: 'Text', kind: 'textarea' }
      ]
    }]
  },
  {
    key: 'gains',
    title: 'What attendees gain',
    description: 'A short list and up to four animated numbers.',
    fields: [
      { key: 'gains.show', label: 'Show this section', kind: 'toggle' },
      { key: 'gains.heading', label: 'Heading', kind: 'rich', hint: RICH_HINT },
      { key: 'gains.text', label: 'Text', kind: 'textarea' },
      { key: 'gains.list_title', label: 'List title', kind: 'text' }
    ],
    lists: [
      {
        key: 'gains.items', label: 'List items', itemLabel: 'Item', max: 6, blank: { text: '', icon: 'briefcase' },
        fields: [{ key: 'text', label: 'Text', kind: 'text' }, { key: 'icon', label: 'Icon', kind: 'icon' }]
      },
      {
        key: 'gains.stats', label: 'Numbers', itemLabel: 'Number', max: 4, blank: { value: 0, suffix: '+', label: '' },
        fields: [
          { key: 'value', label: 'Number', kind: 'number' },
          { key: 'suffix', label: 'After the number', kind: 'text', hint: 'e.g. +' },
          { key: 'label', label: 'Label', kind: 'text' }
        ]
      }
    ]
  },
  {
    key: 'schedule',
    title: 'Schedule',
    description: 'One card per day, with the faculties or topics of that day.',
    fields: [
      { key: 'schedule.show', label: 'Show this section', kind: 'toggle' },
      { key: 'schedule.badge', label: 'Badge', kind: 'text' },
      { key: 'schedule.heading', label: 'Heading', kind: 'rich', hint: RICH_HINT },
      { key: 'schedule.text', label: 'Text', kind: 'textarea' }
    ],
    lists: [{
      key: 'schedule.days', label: 'Days', itemLabel: 'Day', max: 4,
      blank: { date: '', title: '', subtitle: '', items: [], hours: '', icon: 'calendar' },
      fields: [
        { key: 'date', label: 'Date', kind: 'text' },
        { key: 'title', label: 'Title', kind: 'text', hint: 'e.g. Day 1' },
        { key: 'subtitle', label: 'Subtitle', kind: 'text' },
        { key: 'icon', label: 'Icon', kind: 'icon' },
        { key: 'items', label: 'Faculties or topics (one per line)', kind: 'lines' },
        { key: 'hours', label: 'Hours', kind: 'text' }
      ]
    }]
  },
  {
    key: 'employer',
    title: 'Employers',
    description: 'Invitation for companies, with a link to the partnership form.',
    fields: [
      { key: 'employer.show', label: 'Show this section', kind: 'toggle' },
      { key: 'employer.heading', label: 'Heading', kind: 'text' },
      { key: 'employer.paragraphs', label: 'Paragraphs (one per line)', kind: 'lines' },
      { key: 'employer.button_label', label: 'Button label', kind: 'text' },
      { key: 'employer.form_url', label: 'Form link', kind: 'url' }
    ]
  },
  {
    key: 'highlights',
    title: 'Highlights video',
    description: 'A video from a previous event: upload one, or use a YouTube link.',
    fields: [
      { key: 'highlights.show', label: 'Show this section', kind: 'toggle' },
      { key: 'highlights.badge', label: 'Badge', kind: 'text' },
      { key: 'highlights.heading', label: 'Heading', kind: 'rich', hint: RICH_HINT },
      { key: 'highlights.text', label: 'Text', kind: 'textarea' },
      { key: 'highlights.video_url', label: 'Video', kind: 'embed' },
      { key: 'highlights.caption', label: 'Caption', kind: 'text' }
    ]
  },
  {
    key: 'social',
    title: 'Social media',
    description: 'Leave a link empty to hide that icon.',
    fields: [
      { key: 'social.show', label: 'Show this section', kind: 'toggle' },
      { key: 'social.heading', label: 'Heading', kind: 'text' },
      { key: 'social.text', label: 'Text', kind: 'text' },
      { key: 'social.linkedin', label: 'LinkedIn', kind: 'url' },
      { key: 'social.facebook', label: 'Facebook', kind: 'url' },
      { key: 'social.instagram', label: 'Instagram', kind: 'url' },
      { key: 'social.whatsapp', label: 'WhatsApp channel', kind: 'url' },
      { key: 'social.tiktok', label: 'TikTok', kind: 'url' }
    ]
  },
  {
    key: 'footer',
    title: 'Footer',
    description: 'The bar at the bottom of every public page.',
    fields: [
      { key: 'footer.show', label: 'Show the footer', kind: 'toggle' },
      { key: 'footer.logo_url', label: 'Logo', kind: 'image' },
      { key: 'footer.text', label: 'Text', kind: 'text' },
      { key: 'footer.show_visits', label: 'Show the visit counter', kind: 'toggle' }
    ]
  }
];

// ---------------------------------------------------------------------------
// Path helpers ("hero.title")
// ---------------------------------------------------------------------------
const getAt = (obj: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);

const setAt = <T,>(obj: T, path: string, value: unknown): T => {
  const [head, ...rest] = path.split('.');
  const source = obj as Record<string, unknown>;
  return { ...source, [head]: rest.length ? setAt(source[head], rest.join('.'), value) : value } as T;
};

const isVideoFile = (url: string | null) => !!url && /\.(mp4|webm)(\?|$)/i.test(url);

// ---------------------------------------------------------------------------
// Upload button
// ---------------------------------------------------------------------------
const UploadButton: React.FC<{
  eventId: string;
  kind: MediaKind;
  label: string;
  onUploaded: (url: string) => void;
  notify: Notify;
}> = ({ eventId, kind, label, onUploaded, notify }) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const choose = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { url, error } = await uploadEventMedia(eventId, kind, file);
      if (error || !url) {
        notify(error ?? 'The file could not be uploaded.', 'error');
        return;
      }
      onUploaded(url);
      notify(kind === 'image' ? 'Picture uploaded.' : 'Video uploaded.', 'success');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={kind === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'video/mp4,video/webm'}
        className="hidden"
        onChange={(e) => choose(e.target.files?.[0])}
      />
      <button className={buttonClass.primary} disabled={busy} onClick={() => input.current?.click()}>
        <MIcon name={busy ? 'hourglass_top' : 'upload'} className="text-lg" />
        {busy ? 'Uploading...' : label}
      </button>
    </>
  );
};

const MediaPreview: React.FC<{ url: string | null; kind: MediaKind }> = ({ url, kind }) => {
  if (!url) return <p className="text-sm text-slate-500 dark:text-slate-400">Nothing yet.</p>;
  return kind === 'image' ? (
    <img src={url} alt="" className="h-20 w-20 object-contain rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700" />
  ) : (
    <video src={url} className="h-20 rounded-xl bg-slate-900 border border-slate-200 dark:border-slate-700" muted playsInline />
  );
};

const ColourInput: React.FC<{ value: string; fallback: string; onChange: (hex: string) => void; label: string }> = ({ value, fallback, onChange, label }) => (
  <div className="flex items-center gap-2">
    <input
      type="color"
      value={normaliseHex(value, fallback)}
      onChange={(e) => onChange(e.target.value)}
      className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border border-slate-200 dark:border-slate-700"
      aria-label={label}
    />
    <input
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} w-32`}
      aria-label={`${label} colour code`}
      placeholder={fallback}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------
interface FieldProps {
  def: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  idPrefix: string;
  eventId: string;
  notify: Notify;
}

const FieldInput: React.FC<FieldProps> = ({ def, value, onChange, idPrefix, eventId, notify }) => {
  const id = `${idPrefix}-${def.key}`;
  const text = typeof value === 'string' ? value : '';

  if (def.kind === 'toggle') {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">{def.label}</span>
        <Toggle checked={!!value} label={def.label} onChange={onChange} />
      </div>
    );
  }

  if (def.kind === 'icon') {
    const Icon = landingIcon(text);
    return (
      <div>
        <label htmlFor={id} className={labelClass}>{def.label}</label>
        <div className="flex items-center gap-2">
          <span className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </span>
          <select id={id} value={text} onChange={(e) => onChange(e.target.value)} className={inputClass}>
            {LANDING_ICONS.map((icon) => <option key={icon.key} value={icon.key}>{icon.label}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (def.kind === 'accent') {
    const hex = normaliseHex(text);
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>{def.label}</label>
        <div className="flex flex-wrap items-center gap-2">
          {COLOUR_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => onChange(preset.hex)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${hex === preset.hex ? 'border-slate-900 dark:border-white' : 'border-slate-200 dark:border-slate-700'}`}
            >
              <span className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.hex }} />
              {preset.label}
            </button>
          ))}
          <ColourInput value={text} fallback={DEFAULT_THEME.accent} onChange={onChange} label="Any accent colour" />
        </div>
        {!isHexColour(text) && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">Use a colour code such as #dc2626. The page falls back to red until then.</p>
        )}
        {def.hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{def.hint}</p>}
      </div>
    );
  }

  if (def.kind === 'colour') {
    const fallback = (getAt(DEFAULT_THEME, def.key.replace('theme.', '')) as string) ?? '#000000';
    return (
      <div>
        <label className={labelClass}>{def.label}</label>
        <ColourInput value={text} fallback={fallback} onChange={onChange} label={def.label} />
        {def.hint && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{def.hint}</p>}
      </div>
    );
  }

  if (def.kind === 'colours') {
    const colours = Array.isArray(value) ? (value as string[]) : DEFAULT_THEME.stats;
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>{def.label}</label>
        <div className="flex flex-wrap gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ColourInput
              key={i}
              value={colours[i] ?? DEFAULT_THEME.stats[i]}
              fallback={DEFAULT_THEME.stats[i]}
              label={`Number ${i + 1}`}
              onChange={(hex) => {
                const next = [...DEFAULT_THEME.stats].map((fallbackHex, index) => colours[index] ?? fallbackHex);
                next[i] = hex;
                onChange(next);
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (def.kind === 'image' || def.kind === 'video') {
    const kind: MediaKind = def.kind === 'image' ? 'image' : 'video';
    const url = safeUrl(text);
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>{def.label}</label>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          <MediaPreview url={url} kind={kind} />
          <div className="flex flex-wrap gap-2">
            <UploadButton eventId={eventId} kind={kind} label={url ? 'Replace' : 'Upload'} onUploaded={onChange} notify={notify} />
            {url && (
              <button className={`${buttonClass.ghost} hover:!text-red-600`} onClick={() => onChange('')}>
                <MIcon name="delete" className="text-lg" /> Remove
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {kind === 'image' ? `Pictures up to ${MAX_UPLOAD_MB.image} MB (JPG, PNG, WebP or GIF).` : `Videos up to ${MAX_UPLOAD_MB.video} MB (MP4 or WebM).`}
        </p>
      </div>
    );
  }

  if (def.kind === 'images') {
    const urls = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>{def.label}</label>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative">
              <MediaPreview url={safeUrl(url)} kind="image" />
              <button
                onClick={() => onChange(urls.filter((_, index) => index !== i))}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow"
                title="Remove"
                aria-label="Remove picture"
              >
                <MIcon name="close" className="text-base" />
              </button>
            </div>
          ))}
          <UploadButton eventId={eventId} kind="image" label="Add picture" onUploaded={(url) => onChange([...urls, url])} notify={notify} />
        </div>
      </div>
    );
  }

  if (def.kind === 'embed') {
    const url = safeUrl(text);
    const uploaded = isVideoFile(url);
    const youTube = toYouTubeEmbed(text);
    return (
      <div className="md:col-span-2">
        <label className={labelClass}>{def.label}</label>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            {uploaded ? <MediaPreview url={url} kind="video" /> : <p className="text-sm text-slate-500 dark:text-slate-400">{youTube ? 'A YouTube video is used.' : 'Nothing yet.'}</p>}
            <div className="flex flex-wrap gap-2">
              <UploadButton eventId={eventId} kind="video" label={uploaded ? 'Replace video' : 'Upload video'} onUploaded={onChange} notify={notify} />
              {text && (
                <button className={`${buttonClass.ghost} hover:!text-red-600`} onClick={() => onChange('')}>
                  <MIcon name="delete" className="text-lg" /> Remove
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor={id} className="text-xs font-semibold text-slate-500 dark:text-slate-400">Or paste a YouTube link</label>
            <input id={id} value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} placeholder="https://www.youtube.com/watch?v=..." />
            {!!text && !uploaded && !youTube && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">This is neither an uploaded video nor a YouTube link, so the section will be hidden.</p>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Videos up to {MAX_UPLOAD_MB.video} MB (MP4 or WebM).</p>
      </div>
    );
  }

  const wide = def.kind === 'textarea' || def.kind === 'lines';
  const urlProblem = def.kind === 'url' && text.trim() && !safeUrl(text)
    ? 'This link is not valid. Use https://… or a path starting with /'
    : null;

  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label htmlFor={id} className={labelClass}>{def.label}</label>
      {def.kind === 'textarea' ? (
        <textarea id={id} rows={3} value={text} onChange={(e) => onChange(e.target.value)} className={`${inputClass} resize-y`} />
      ) : def.kind === 'lines' ? (
        <textarea
          id={id}
          rows={Math.max(3, Array.isArray(value) ? value.length + 1 : 3)}
          value={Array.isArray(value) ? value.join('\n') : ''}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          className={`${inputClass} resize-y`}
        />
      ) : def.kind === 'number' ? (
        <input id={id} type="number" min={0} value={typeof value === 'number' ? value : 0} onChange={(e) => onChange(Number(e.target.value) || 0)} className={inputClass} />
      ) : (
        <input id={id} type="text" value={text} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      )}
      {urlProblem ? (
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{urlProblem}</p>
      ) : def.hint ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{def.hint}</p>
      ) : null}
    </div>
  );
};

const ListEditor: React.FC<{
  def: ListDef;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  eventId: string;
  notify: Notify;
}> = ({ def, items, onChange, eventId, notify }) => {
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="md:col-span-2 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{def.label}</p>
        <button className={buttonClass.ghost} disabled={items.length >= def.max} onClick={() => onChange([...items, { ...def.blank }])}>
          <MIcon name="add" className="text-lg" /> Add {def.itemLabel.toLowerCase()}
        </button>
      </div>
      {items.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">None. This part is hidden.</p>}
      {items.map((item, index) => (
        <div key={index} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <Badge>{def.itemLabel} {index + 1}</Badge>
            <div className="flex gap-0.5">
              <button className={buttonClass.ghost} disabled={index === 0} onClick={() => move(index, index - 1)} title="Move up"><MIcon name="arrow_upward" className="text-lg" /></button>
              <button className={buttonClass.ghost} disabled={index === items.length - 1} onClick={() => move(index, index + 1)} title="Move down"><MIcon name="arrow_downward" className="text-lg" /></button>
              <button className={`${buttonClass.ghost} hover:!text-red-600`} onClick={() => onChange(items.filter((_, i) => i !== index))} title="Remove"><MIcon name="delete" className="text-lg" /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {def.fields.map((field) => (
              <FieldInput
                key={field.key}
                def={field}
                idPrefix={`${def.key}-${index}`}
                eventId={eventId}
                notify={notify}
                value={item[field.key]}
                onChange={(value) => onChange(items.map((it, i) => (i === index ? { ...it, [field.key]: value } : it)))}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
interface Props {
  eventId: string;
  stored: Record<string, unknown> | null;
  isCurrent: boolean;
  notify: Notify;
  onSaved: () => void;
}

const LandingEditor: React.FC<Props> = ({ eventId, stored, isCurrent, notify, onSaved }) => {
  const [saved, setSaved] = useState<LandingContent>(() => mergeLanding(stored));
  const [draft, setDraft] = useState<LandingContent>(saved);
  const [open, setOpen] = useState<string>('theme');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = async () => {
    setBusy(true);
    try {
      await callSadmin('sadmin_update_landing', { _event_id: eventId, _landing: draft }, 'Could not save the landing page.');
      setSaved(draft);
      notify(isCurrent ? 'Landing page saved. Visitors see it the next time they open the site.' : 'Landing page saved.', 'success');
      onSaved();
    } catch (err) {
      notify(errorText(err, 'Could not save the landing page.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const resetSection = (key: keyof LandingContent) => setDraft({ ...draft, [key]: DEFAULT_LANDING[key] });

  return (
    <div className="space-y-4">
      <Panel
        title="Landing page"
        subtitle={isCurrent ? 'This is the live page visitors see.' : 'Visitors see this page once the event is made current.'}
        actions={
          <div className="flex flex-wrap gap-2">
            {dirty && <Badge tone="amber">Unsaved changes</Badge>}
            <button className={buttonClass.ghost} onClick={() => setPreview(true)}>
              <MIcon name="visibility" className="text-lg" /> Preview
            </button>
            <button className={buttonClass.ghost} disabled={!dirty || busy} onClick={() => setDraft(saved)}>Discard</button>
            <button className={buttonClass.primary} disabled={!dirty || busy} onClick={save}>
              <MIcon name="save" className="text-lg" /> Save page
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Open a section to edit it. Pictures and videos are uploaded here and saved with the page.
          In headings, put <code className="font-mono">[[words]]</code> in double brackets to colour them and <code className="font-mono">**words**</code> in stars for bold.
          Partners and speakers are not here: they come from the admin dashboard.
        </p>
      </Panel>

      {SECTIONS.map((section) => {
        const isOpen = open === section.key;
        const showKey = section.fields.find((f) => f.kind === 'toggle' && (f.key.endsWith('.show')))?.key;
        const hidden = showKey ? !getAt(draft, showKey) : false;
        return (
          <section key={section.key} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <button
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? '' : section.key)}
              aria-expanded={isOpen}
            >
              <div className="min-w-0">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {section.title}
                  {hidden && <Badge>Hidden</Badge>}
                  {section.key === 'theme' && (
                    <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600" style={{ backgroundColor: normaliseHex(draft.theme.accent) }} />
                  )}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
              <MIcon name={isOpen ? 'expand_less' : 'expand_more'} className="text-2xl text-slate-400" />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <FieldInput
                      key={field.key}
                      def={field}
                      idPrefix="landing"
                      eventId={eventId}
                      notify={notify}
                      value={getAt(draft, field.key)}
                      onChange={(value) => setDraft(setAt(draft, field.key, value))}
                    />
                  ))}
                  {section.lists?.map((list) => (
                    <ListEditor
                      key={list.key}
                      def={list}
                      eventId={eventId}
                      notify={notify}
                      items={(getAt(draft, list.key) as Record<string, unknown>[]) ?? []}
                      onChange={(items) => setDraft(setAt(draft, list.key, items))}
                    />
                  ))}
                </div>
                <div className="flex justify-end mt-4">
                  <button className={buttonClass.ghost} onClick={() => resetSection(section.key)}>
                    <MIcon name="restart_alt" className="text-lg" /> Reset this section to the original
                  </button>
                </div>
              </div>
            )}
          </section>
        );
      })}

      {preview && (
        <div className="fixed inset-0 z-[120] bg-black/70 p-2 sm:p-6 flex flex-col" role="dialog" aria-modal="true" aria-label="Landing page preview">
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-t-xl px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Preview{dirty ? ' (includes unsaved changes)' : ''}
            </p>
            <button className={buttonClass.primary} onClick={() => setPreview(false)}>
              <MIcon name="close" className="text-lg" /> Close preview
            </button>
          </div>
          {/* The colours are set on this box, so the preview does not recolour the dashboard. */}
          <div className="flex-1 overflow-y-auto rounded-b-xl bg-white dark:bg-gray-950" style={themeStyle(draft.theme)}>
            <Suspense fallback={<LoadingBlock label="Loading preview..." />}>
              <LandingPage content={draft} preview />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingEditor;
