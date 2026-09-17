// The active event of this project, as decided by the database
// (system_config → active_event_id, read through get_active_event_id()).
//
// The dashboards pass this id to every event-scoped function. It is loaded once at
// start-up and cached, so components can read it without waiting.
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface ActiveEvent {
  id: string;
  name: string;
  event_type: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  allow_non_asu_attendees?: boolean;
  non_asu_ticket_price?: number | null;
}

const CACHE_KEY = 'site.activeEvent';

const readCache = (): ActiveEvent | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.id === 'string' ? parsed : null;
  } catch {
    return null;
  }
};

let current: ActiveEvent | null = readCache();

/** Never throws: on failure the cached event is kept (or null when there is none yet). */
export const loadActiveEvent = async (timeoutMs = 5000): Promise<ActiveEvent | null> => {
  try {
    const request = (async () => supabase.rpc('get_current_event'))();
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs));
    const result = await Promise.race([request, timeout]);
    const data = result && !result.error ? (result.data as ActiveEvent | null) : null;
    if (data && typeof data.id === 'string') {
      current = data;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(current));
      } catch {
        /* storage unavailable */
      }
    } else if (result && result.error) {
      logger.error('[ACTIVE EVENT] could not load', result.error);
    }
  } catch {
    /* keep the cached event */
  }
  return current;
};

export const getActiveEvent = (): ActiveEvent | null => current;

/** Empty string when no event is active yet; functions then answer "no active event". */
export const getActiveEventId = (): string => current?.id ?? '';

// ---------------------------------------------------------------------------
// Landing page content of the active event
//
// v2's get_current_event() does not carry the landing page, so this reads
// get_landing_page() instead (added in v2_03). It is loaded once before the
// first render and cached, so the public pages can read it without waiting.
// ---------------------------------------------------------------------------
export interface EventTeam {
  id: string;
  team_name: string;
  description: string | null;
}

interface LandingPayload {
  landing: Record<string, unknown> | null;
  teams: EventTeam[];
  controls: Record<string, boolean> | null;
}

let landingPayload: LandingPayload | null = null;

/** Never throws: on failure the built-in default page content is used. */
export const loadLandingPage = async (timeoutMs = 5000): Promise<LandingPayload | null> => {
  try {
    const request = (async () => supabase.rpc('get_landing_page'))();
    const timeout = new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs));
    const result = await Promise.race([request, timeout]);
    const data = result && !result.error ? (result.data as LandingPayload | null) : null;
    if (data) {
      landingPayload = {
        landing: (data.landing as Record<string, unknown> | null) ?? null,
        teams: Array.isArray(data.teams) ? data.teams : [],
        controls: (data.controls as Record<string, boolean> | null) ?? null
      };
    } else if (result && result.error) {
      logger.error('[LANDING] could not load', result.error);
    }
  } catch {
    /* keep whatever is cached */
  }
  return landingPayload;
};

/** The stored landing content; null means "use the built-in defaults". */
export const getLandingContent = (): Record<string, unknown> | null => landingPayload?.landing ?? null;

/** Volunteer teams of the active event (used by the registration pages). */
export const getCurrentEventTeams = (): EventTeam[] => landingPayload?.teams ?? [];
