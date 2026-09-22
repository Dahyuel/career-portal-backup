// Colours of the landing page. A super admin picks them per event; every shade and
// transparent variant is derived here and published as CSS variables, so the page,
// the top menu and the footer all follow the same choice.

export interface LandingTheme {
  /** Main colour: buttons, highlights, badges, icons. */
  accent: string;
  /** Headings on light backgrounds. */
  heading: string;
  /** Normal text on light backgrounds. */
  body: string;
  /** Text over the dark hero and dark cards. */
  on_dark: string;
  /** Page background. */
  page_bg: string;
  /** Background of the alternating sections. */
  section_bg: string;
  /** "Free entry" banner (a gradient between two colours). */
  free_from: string;
  free_to: string;
  /** "Paid entry" banner. */
  paid_from: string;
  paid_to: string;
  /** The four big numbers. */
  stats: string[];
}

export interface ColourPreset {
  label: string;
  hex: string;
}

export const COLOUR_PRESETS: ColourPreset[] = [
  { label: 'Red', hex: '#dc2626' },
  { label: 'Orange', hex: '#ea580c' },
  { label: 'Amber', hex: '#d97706' },
  { label: 'Emerald', hex: '#059669' },
  { label: 'Teal', hex: '#0d9488' },
  { label: 'Blue', hex: '#2563eb' },
  { label: 'Indigo', hex: '#4f46e5' },
  { label: 'Violet', hex: '#7c3aed' },
  { label: 'Fuchsia', hex: '#c026d3' },
  { label: 'Rose', hex: '#e11d48' }
];

export const DEFAULT_ACCENT = COLOUR_PRESETS[0].hex;

export const DEFAULT_THEME: LandingTheme = {
  accent: DEFAULT_ACCENT,
  heading: '#111827',
  body: '#4b5563',
  on_dark: '#ffffff',
  page_bg: '#ffffff',
  section_bg: '#f9fafb',
  free_from: '#22c55e',
  free_to: '#059669',
  paid_from: '#f59e0b',
  paid_to: '#ea580c',
  stats: ['#b91c1c', '#1d4ed8', '#15803d', '#b45309']
};

// Accent shades follow the same curve as the original red palette, with the chosen
// colour sitting in the 600 slot.
const SHADES: Record<number, { lightness: number; saturation: number }> = {
  50: { lightness: 97, saturation: 0.55 },
  100: { lightness: 94, saturation: 0.6 },
  200: { lightness: 87, saturation: 0.7 },
  300: { lightness: 81, saturation: 0.8 },
  400: { lightness: 71, saturation: 0.9 },
  500: { lightness: 60, saturation: 0.95 },
  600: { lightness: 51, saturation: 1 },
  700: { lightness: 42, saturation: 1 },
  800: { lightness: 35, saturation: 0.95 },
  900: { lightness: 31, saturation: 0.9 },
  950: { lightness: 20, saturation: 0.85 }
};

const ALPHAS = [5, 8, 10, 20, 30, 40, 50, 60, 75, 80, 90];

export const isHexColour = (value: string): boolean => /^#[0-9a-fA-F]{6}$/.test((value ?? '').trim());

export const normaliseHex = (value: string | null | undefined, fallback = DEFAULT_ACCENT): string => {
  const v = (value ?? '').trim();
  return isHexColour(v) ? v.toLowerCase() : fallback;
};

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16)
];

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h * 360, s * 100, l * 100];
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = ln - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
};

/** Every CSS variable the landing page, menu and footer use. */
export const buildThemeVars = (theme: Partial<LandingTheme> | string | null | undefined): Record<string, string> => {
  const t: LandingTheme = typeof theme === 'string'
    ? { ...DEFAULT_THEME, accent: theme }
    : { ...DEFAULT_THEME, ...(theme ?? {}) };

  const hex = normaliseHex(t.accent);
  const [r, g, b] = hexToRgb(hex);
  const [h, s] = rgbToHsl(r, g, b);
  const vars: Record<string, string> = {};

  for (const [shade, { lightness, saturation }] of Object.entries(SHADES)) {
    const [sr, sg, sb] = hslToRgb(h, Math.min(100, s * saturation), lightness);
    vars[`--a-${shade}`] = `rgb(${sr} ${sg} ${sb})`;
    // Tailwind's <alpha-value> pattern needs raw R G B triplets separated by spaces (not commas).
    vars[`--a-${shade}-rgb`] = `${sr} ${sg} ${sb}`;
    for (const alpha of ALPHAS) {
      vars[`--a-${shade}-${alpha}`] = `rgb(${sr} ${sg} ${sb} / ${alpha / 100})`;
    }
  }

  vars['--t-heading'] = normaliseHex(t.heading, DEFAULT_THEME.heading);
  vars['--t-body'] = normaliseHex(t.body, DEFAULT_THEME.body);
  vars['--t-ondark'] = normaliseHex(t.on_dark, DEFAULT_THEME.on_dark);
  vars['--bg-page'] = normaliseHex(t.page_bg, DEFAULT_THEME.page_bg);
  vars['--bg-section'] = normaliseHex(t.section_bg, DEFAULT_THEME.section_bg);
  vars['--free-from'] = normaliseHex(t.free_from, DEFAULT_THEME.free_from);
  vars['--free-to'] = normaliseHex(t.free_to, DEFAULT_THEME.free_to);
  vars['--paid-from'] = normaliseHex(t.paid_from, DEFAULT_THEME.paid_from);
  vars['--paid-to'] = normaliseHex(t.paid_to, DEFAULT_THEME.paid_to);

  const stats = Array.isArray(t.stats) ? t.stats : DEFAULT_THEME.stats;
  for (let i = 0; i < 4; i++) {
    vars[`--stat-${i + 1}`] = normaliseHex(stats[i], DEFAULT_THEME.stats[i]);
  }

  return vars;
};

/** Applies the colours to the page (or to one element, used by the preview). */
export const applyTheme = (theme: Partial<LandingTheme> | string | null | undefined, element?: HTMLElement | null): void => {
  const target = element ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) return;
  const vars = buildThemeVars(theme);
  for (const [name, value] of Object.entries(vars)) target.style.setProperty(name, value);
};

/** The same variables as a React `style` object, for the preview container. */
export const themeStyle = (theme: Partial<LandingTheme> | string | null | undefined): React.CSSProperties =>
  buildThemeVars(theme) as unknown as React.CSSProperties;
