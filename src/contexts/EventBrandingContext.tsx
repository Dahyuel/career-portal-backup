// contexts/EventBrandingContext.tsx
// The event's name and colours, shared by every dashboard.
//
// A super admin sets them per event (when creating it, or later in the landing
// editor). They live in events.landing -> 'theme', the same place the landing
// page reads, so the dashboards and the public site always match.
//
// The colours are published as CSS variables (see lib/theme.ts). Tailwind's
// red/asu palettes read those variables, so existing classes such as
// `bg-red-600` follow the event automatically.
//
// Super admins are excluded: their dashboard always shows the default palette
// so it stays neutral regardless of which event colour is active.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getActiveEventId, getLandingContent } from '../lib/currentEvent';
import { applyTheme, DEFAULT_THEME, type LandingTheme } from '../lib/theme';
import { logger } from '../utils/logger';

export interface EventBranding {
  id: string | null;
  name: string | null;
  event_type: string | null;
  theme: Partial<LandingTheme>;
}

interface EventBrandingValue extends EventBranding {
  /** The event name, or a sensible fallback for headers. */
  title: string;
  refresh: () => Promise<void>;
}

const FALLBACK_TITLE = 'ASU Career Expo';
const CACHE_PREFIX = 'event.branding.';

/** Super admins keep the default palette — their dashboard should not recolour. */
const isSuperAdmin = (role?: string | null): boolean =>
  role === 'sadmin' || role === 'super_admin';

const readCache = (eventId: string): EventBranding | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + eventId);
    return raw ? (JSON.parse(raw) as EventBranding) : null;
  } catch {
    return null;
  }
};

const writeCache = (eventId: string, branding: EventBranding) => {
  try {
    localStorage.setItem(CACHE_PREFIX + eventId, JSON.stringify(branding));
  } catch {
    /* storage unavailable */
  }
};

/** Read the event theme from the publicly-loaded landing content (loaded by main.tsx). */
const getLandingTheme = (): Partial<LandingTheme> => {
  const content = getLandingContent();
  if (content && typeof content === 'object' && 'theme' in content && content.theme) {
    return content.theme as Partial<LandingTheme>;
  }
  return {};
};

const EventBrandingContext = createContext<EventBrandingValue | undefined>(undefined);

export const EventBrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, isAuthenticated } = useAuth();
  // The event the user is working in; falls back to the site's active event.
  const eventId = profile?.event_id || getActiveEventId() || '';

  // Whether this user is a super admin — if so, we skip recolouring the page.
  const skipTheme = isSuperAdmin(profile?.role);

  const [branding, setBranding] = useState<EventBranding>(() => {
    const cached = eventId ? readCache(eventId) : null;
    return cached ?? { id: eventId || null, name: null, event_type: null, theme: {} };
  });

  // Always ensure the landing theme is applied on mount, before any RPC.
  // main.tsx already calls applyTheme once, but React re-renders can
  // race with the provider initialisation, so we re-assert here.
  useEffect(() => {
    if (skipTheme) return;
    const landingTheme = getLandingTheme();
    if (landingTheme && Object.keys(landingTheme).length > 0) {
      logger.log('[BRANDING] Applying landing theme on mount:', landingTheme.accent);
      applyTheme({ ...DEFAULT_THEME, ...landingTheme });
    }
  }, [skipTheme]);

  const load = useCallback(async () => {
    if (!isAuthenticated || !eventId) {
      // Even when not authenticated, apply the landing theme so dashboards
      // that render during auth transitions get the correct colours.
      if (!skipTheme) {
        const landingTheme = getLandingTheme();
        if (landingTheme && Object.keys(landingTheme).length > 0) {
          applyTheme({ ...DEFAULT_THEME, ...landingTheme });
        }
      }
      return;
    }

    console.log('[BRANDING] Event ID:', eventId);
    
    // Try the localStorage cache first for instant paint.
    const cached = readCache(eventId);
    console.log('[BRANDING] Cached theme:', cached?.theme);
    if (cached && cached.theme && Object.keys(cached.theme).length > 0) {
      setBranding(cached);
      if (!skipTheme) applyTheme({ ...DEFAULT_THEME, ...cached.theme });
    }

    // Try the RPC.
    const { data, error } = await supabase.rpc('get_event_branding', { p_event_id: eventId });
    if (error) {
      console.log('[BRANDING] RPC error:', error);
      logger.warn('[BRANDING] RPC failed, falling back to landing theme', error.message);

      // Fallback: use the publicly-loaded landing theme (loaded by main.tsx).
      const landingTheme = getLandingTheme();
      console.log('[BRANDING] Fallback landingTheme:', landingTheme);
      if (landingTheme && Object.keys(landingTheme).length > 0) {
        const fresh: EventBranding = {
          id: eventId,
          name: null,
          event_type: null,
          theme: landingTheme,
        };
        setBranding(fresh);
        writeCache(eventId, fresh);
        if (!skipTheme) applyTheme({ ...DEFAULT_THEME, ...fresh.theme });
      }
      return;
    }
    
    console.log('[BRANDING] RPC data:', data);

    if (!data?.found) {
      // RPC succeeded but no data found — still apply landing theme.
      const landingTheme = getLandingTheme();
      console.log('[BRANDING] No data found, landingTheme:', landingTheme);
      if (!skipTheme && landingTheme && Object.keys(landingTheme).length > 0) {
        applyTheme({ ...DEFAULT_THEME, ...landingTheme });
      }
      return;
    }

    const rpcTheme = (data.theme ?? {}) as Partial<LandingTheme>;
    const landingTheme = getLandingTheme() || {};
    console.log('[BRANDING] rpcTheme:', rpcTheme, 'landingTheme:', landingTheme);
    const finalTheme: Partial<LandingTheme> = { ...landingTheme };
    if (rpcTheme.accent) finalTheme.accent = rpcTheme.accent;
    console.log('[BRANDING] finalTheme:', finalTheme);

    const fresh: EventBranding = {
      id: data.id ?? eventId,
      name: data.name ?? null,
      event_type: data.event_type ?? null,
      theme: finalTheme,
    };
    setBranding(fresh);
    writeCache(eventId, fresh);
    if (!skipTheme) applyTheme({ ...DEFAULT_THEME, ...fresh.theme });
  }, [eventId, isAuthenticated, skipTheme]);

  useEffect(() => { load(); }, [load]);

  const value = useMemo<EventBrandingValue>(() => ({
    ...branding,
    title: branding.name || FALLBACK_TITLE,
    refresh: load,
  }), [branding, load]);

  return <EventBrandingContext.Provider value={value}>{children}</EventBrandingContext.Provider>;
};

/** The current event's name and colours. Safe outside the provider (falls back). */
export const useEventBranding = (): EventBrandingValue => {
  const ctx = useContext(EventBrandingContext);
  return ctx ?? {
    id: null, name: null, event_type: null, theme: {},
    title: FALLBACK_TITLE,
    refresh: async () => { /* no provider */ },
  };
};

