// AuthContext with optimized session handling and proper RPC response parsing
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { supabase, signOutUser, getCurrentSession } from "../lib/supabase";
import { clearAllFormCaches } from "../utils/formCache";
import type { User } from "@supabase/supabase-js";
import { logger } from '../utils/logger';

// ----- RPC Response Interface (matches actual get_my_profile return) -----
interface GetMyProfileResponse {
  profile: {
    id: string;
    full_name: string;
    phone: string;
    personal_id: string;
    email: string;
    score: number;
    preferred_language: string;
    created_at: string;
    updated_at: string;
    nationality?: string | null;
  } | null;
  attendee: {
    user_id: string;
    is_asu_student: boolean;
    university: string;
    faculty: string;
    department: string;
    registration_status: string;
    payment_status: string;
    cv_url: string;
    enrollment_proof_url: string;
    registered_at: string;
    year?: number | null;
    allow_non_asu_attendees?: boolean;
  } | null;
  volunteer: {
    user_id: string;
    team_id: string;
    full_name: string;
    volunteer_id: string;
    total_points: number;
    hours_volunteered: number;
  } | null;
  employer: {
    company_id: string;
    user_id: string;
    job_title: string;
  } | null;
  company: {
    id: string;
    company_name: string;
    industry: string;
    booth_number: string;
    logo_url: string;
    partner_type: string;
    website: string;
    description: string;
    faculties: string[] | null;
  } | null;
  roles: string[];
  isVolunteer: boolean;
  nationality: string | null;
}

// ----- User profile type -----
type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  personal_id: string;
  score: number;
  preferred_language: string;
  nationality?: string | null;

  role: string;
  roles: string[];
  isVolunteer: boolean;

  attendee?: GetMyProfileResponse['attendee'];
  volunteer?: GetMyProfileResponse['volunteer'];
  employer?: GetMyProfileResponse['employer'];
  company?: GetMyProfileResponse['company'];

  profile_complete: boolean;
  created_at: string;
  event_id?: string;
  target_faculties?: string[] | null;
};

// ----- Context type -----
type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  sessionLoaded: boolean;
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (eventId?: string, userId?: string, userEmail?: string, forceRefresh?: boolean) => Promise<UserProfile | null>;
  hasRole: (roles: string | string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  getRoleBasedRedirect: (role?: string) => string;
  cleanupSession: () => Promise<void>;
  handleAuthError: (error: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role priority for downgrade protection
const ROLE_PRIORITY: Record<string, number> = {
  sadmin: 10, super_admin: 9, admin: 8, team_leader: 7, tech_support: 6,
  employer: 5, volunteer: 4, building: 3, registration: 3,
  verification: 2, attendee: 0
};

const getRolePriority = (role: string): number => ROLE_PRIORITY[role] ?? 0;

// Super admins are exempt from event selection: they keep their admin scope.
const isSuperAdminRole = (role?: string | null): boolean =>
  role === 'sadmin' || role === 'super_admin';

// ----- Helper: Determine effective role from roles array -----
const getEffectiveRole = (roles: string[]): string => {
  if (!roles || roles.length === 0) return "attendee";
  const priority = ["sadmin", "super_admin", "admin", "team_leader", "tech_support", "employer",
    "volunteer", "building", "registration", "verification", "attendee"];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return roles[0] || "attendee";
};


// ----- Helper: Read the last event_id the user picked -----
// Persisted in a dedicated key so it survives even if `currentUser` is
// cleared or the RPC fails. Used only as the input to get_my_profile —
// never for role-based routing.
const getStoredEventId = (): string | undefined => {
  try {
    // Preferred source: dedicated key written when the user picks an event.
    const dedicated = localStorage.getItem("selected_event_id");
    if (dedicated && dedicated.length > 0) return dedicated;

    // Fallback: the event_id nested inside currentUser.
    const stored = localStorage.getItem("currentUser");
    if (!stored) return undefined;
    const parsed = JSON.parse(stored);
    const id = parsed?.event_id;
    return typeof id === "string" && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
};

// ----- Helper: Restore ONLY the signed-in user's identity from storage -----
// Role/event data is intentionally NOT restored here. Routing decisions are made
// exclusively from the authoritative profile returned by the live `get_my_profile`
// RPC; localStorage must never be a source of role-based routing (a stale or
// tampered cache could otherwise grant/deny access).
const getInitialSessionFromStorage = (): { user: User | null; profile: UserProfile | null } => {
  try {
    const stored = localStorage.getItem("currentUser");
    if (!stored) return { user: null, profile: null };
    const parsed = JSON.parse(stored);
    if (!parsed?.id || !parsed?.email) return { user: null, profile: null };

    const user: User = {
      id: parsed.id,
      email: parsed.email,
      aud: "authenticated",
      role: "",
      created_at: "",
      app_metadata: {},
      user_metadata: {}
    } as User;

    // No profile: it must be fetched fresh from the RPC before any routing.
    return { user, profile: null };
  } catch {
    return { user: null, profile: null };
  }
};

// ----- AuthProvider -----
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialSession = getInitialSessionFromStorage();

  const [user, setUser] = useState<User | null>(initialSession.user);
  const [profile, setProfile] = useState<UserProfile | null>(initialSession.profile);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const clearAllCachedData = useCallback(() => {
    const theme = localStorage.getItem("theme");
    const selectedEventId = localStorage.getItem("selected_event_id");

    localStorage.clear();
    sessionStorage.clear();
    clearAllFormCaches();

    if (theme) localStorage.setItem("theme", theme);
    if (selectedEventId) localStorage.setItem("selected_event_id", selectedEventId);

    logger.log('🧹 All cached user data cleared (selected event preserved)');
  }, []);

  // ----- Lighter wipe used on fresh sign-in: keeps `currentUser` in
  // localStorage so ProtectedRoute's pre-load fallback still works. -----
  const clearSessionScopedData = useCallback(() => {
    try {
      sessionStorage.clear();
      clearAllFormCaches();
      logger.log('🧹 Session-scoped caches cleared (kept currentUser)');
    } catch (err) {
      logger.warn('clearSessionScopedData failed:', err);
    }
  }, []);

  const profileRef = useRef<UserProfile | null>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const fetchUserProfile = useCallback(
    async (userId: string, userEmail: string, eventId?: string, forceRefresh = false): Promise<UserProfile | null> => {
      try {
        const currentProfile = profileRef.current;

        // ── No event selected yet ────────────────────────────────────────
        // get_my_profile is event-scoped and raises 'Event is required' when
        // called with a null event_id. During the "logged in but hasn't
        // picked an event" phase we must not call it at all. Routing is
        // driven by EventSelection, which passes a real event id when the
        // user clicks one. Keep any already-event-scoped profile if it
        // matches this user.
        if (!eventId) {
          if (currentProfile?.id === userId && currentProfile.event_id) {
            logger.log('📦 No event selected — keeping existing event-scoped profile');
            return currentProfile;
          }
          logger.log('⏭️ No event selected yet — skipping get_my_profile');
          return null;
        }

        // Return cache if same event and same user (unless forced)
        if (!forceRefresh && currentProfile && currentProfile.event_id === eventId && currentProfile.id === userId) {
          logger.log('📦 Using cached profile for event:', eventId);
          return currentProfile;
        }

        // Event selection is the single source of truth for event_id.
        // No system_config auto-resolve: every non-sadmin user must pick an
        // event after login (see EventSelection).
        const effectiveEventId = eventId;

        logger.log('🔍 Fetching profile from database...', {
          userId,
          eventId: effectiveEventId,
          forceRefresh,
        });

        const { data, error } = await supabase
          .rpc("get_my_profile", { _event_id: effectiveEventId || null })
          .single();

        if (error) {
          logger.error("❌ RPC Error fetching user profile:", {
            code: error.code, message: error.message,
            details: error.details, hint: error.hint,
          });
          return null;
        }

        if (!data) {
          logger.warn("⚠️ RPC returned no data");
          return null;
        }

        const rpcData = data as unknown as GetMyProfileResponse;

        logger.log('📥 RPC Response:', {
          hasProfile: !!rpcData.profile,
          hasRoles: !!(rpcData.roles?.length),
          rolesCount: rpcData.roles?.length || 0,
          isVolunteer: rpcData.isVolunteer,
          hasCompany: !!rpcData.company,
        });

        if (!rpcData.profile) {
          logger.warn("⚠️ No profile data in RPC response");
          return null;
        }

        const incomingRoles: string[] = rpcData.roles || [];
        const effectiveRole = getEffectiveRole(incomingRoles);

        // ── DOWNGRADE PROTECTION (post-fetch) ─────────────────────────────
        // Only protect WITHIN the same event. Across events the roles array
        // legitimately changes: a volunteer in event A is just an attendee in
        // event B, and we must accept that switch.
        if (
          !forceRefresh &&
          incomingRoles.length === 0 &&
          currentProfile?.id === userId &&
          currentProfile.event_id === effectiveEventId &&
          getRolePriority(currentProfile.role) > getRolePriority("attendee")
        ) {
          logger.log('⚠️ No roles returned (same event) — keeping existing role:', currentProfile.role);
          return currentProfile;
        }

        logger.log('✅ Effective role determined:', effectiveRole, 'from roles:', incomingRoles);

        const userProfile: UserProfile = {
          id: userId,
          email: userEmail,
          full_name: rpcData.profile.full_name || "",
          phone: rpcData.profile.phone || "",
          personal_id: rpcData.profile.personal_id || "",
          score: rpcData.profile.score || 0,
          preferred_language: rpcData.profile.preferred_language || "en",
          nationality: rpcData.nationality || null,
          role: effectiveRole,
          roles: incomingRoles,
          isVolunteer: rpcData.isVolunteer || false,
          attendee: rpcData.attendee,
          volunteer: rpcData.volunteer,
          employer: rpcData.employer,
          company: rpcData.company,
          profile_complete: !!(rpcData.profile.full_name && rpcData.profile.phone && rpcData.profile.personal_id),
          created_at: rpcData.profile.created_at,
          event_id: effectiveEventId,        // ← use the resolved id, not the raw param
          target_faculties: rpcData.company?.faculties || null,
        };

        setProfile(userProfile);

        // Persist the selected event separately so it survives even if
        // `currentUser` is cleared or the RPC fails on next refresh.
        if (userProfile.event_id) {
          try {
            localStorage.setItem("selected_event_id", userProfile.event_id);
          } catch { /* storage quota — ignore */ }
        }

        const shouldCache = incomingRoles.length > 0 || forceRefresh || !currentProfile; if (shouldCache) {
          localStorage.setItem("currentUser", JSON.stringify({
            id: userProfile.id,
            email: userProfile.email,
            full_name: userProfile.full_name,
            phone: userProfile.phone,
            personal_id: userProfile.personal_id,
            score: userProfile.score,
            preferred_language: userProfile.preferred_language,
            nationality: userProfile.nationality,
            role: userProfile.role,
            roles: userProfile.roles,
            isVolunteer: userProfile.isVolunteer,
            attendee: userProfile.attendee,
            volunteer: userProfile.volunteer,
            employer: userProfile.employer,
            company: userProfile.company,
            profile_complete: userProfile.profile_complete,
            created_at: userProfile.created_at,
            event_id: userProfile.event_id,
            target_faculties: userProfile.target_faculties,
          }));
          logger.log('✅ Profile fetched and cached successfully', forceRefresh ? '(forced refresh)' : '');
        } else {
          logger.log('✅ Profile fetched (not cached — no roles returned)');
        }

        return userProfile;
      } catch (err) {
        logger.error("💥 Exception fetching user profile:", err);
        return null;
      }
    },
    []
  );

  // ----- Refresh profile -----
  const refreshProfile = useCallback(
    async (eventId?: string, userId?: string, userEmail?: string, forceRefresh: boolean = false): Promise<UserProfile | null> => {
      // No event → nothing to fetch; get_my_profile would raise.
      if (!eventId) {
        const cached = profileRef.current;
        if (cached && (!userId || cached.id === userId) && cached.event_id) {
          return cached;
        }
        logger.log('⏭️ refreshProfile skipped — no eventId');
        return null;
      }

      let targetUserId = userId || user?.id;
      let targetUserEmail = userEmail || user?.email || "";

      if (!targetUserId) {
        logger.warn('⚠️ refreshProfile: No user ID in state, checking session...');
        try {
          const session = await getCurrentSession();
          if (session?.user) {
            targetUserId = session.user.id;
            targetUserEmail = session.user.email || "";
            setUser(session.user);
          } else {
            logger.error('❌ No session found');
            return null;
          }
        } catch (err) {
          logger.error('❌ Error getting current session:', err);
          return null;
        }
      }

      return fetchUserProfile(targetUserId, targetUserEmail, eventId, forceRefresh);
    },
    [user, fetchUserProfile]
  );

  // ----- Initialize auth -----
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (initialSession.user) setSessionLoaded(true);

        const session = await getCurrentSession();
        if (session?.user) {
          setUser(session.user);

          // Look up the event_id the user last had bound. If we have one,
          // fetch the profile for that event. Otherwise, skip the RPC —
          // ProtectedRoute will route to /select-event.
          const cachedEventId = getStoredEventId();

          if (cachedEventId) {
            logger.log('🔁 Refresh detected — restoring event:', cachedEventId);
            await fetchUserProfile(
              session.user.id,
              session.user.email || "",
              cachedEventId,
              true
            );
          } else {
            logger.log('⏭️ No stored event — user must pick one');
          }
        } else {
          // Before wiping, verify the Supabase auth token is genuinely gone.
          // getCurrentSession() can return null during the initial mount
          // before Supabase has rehydrated the token from localStorage.
          const hasAuthToken = Object.keys(localStorage).some(k =>
            k.startsWith('sb-') && k.endsWith('-auth-token')
          );

          if (!hasAuthToken) {
            logger.log('🚪 No auth token — clearing cache');
            setUser(null);
            setProfile(null);
            clearAllCachedData();
          } else {
            logger.log('⏳ Auth token present — waiting for session recovery');
            // Don't clear; the onAuthStateChange listener will fire SIGNED_IN
            // once the session is restored.
          }
        }
      } catch (err) {
        logger.error("Error initializing auth:", err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
        setSessionLoaded(true);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);

        const current = profileRef.current;
        const isDifferentUser = !current || current.id !== session.user.id;

        if (isDifferentUser) {
          // New user: clear session-scoped caches only.
          // IMPORTANT: we do NOT call clearAllCachedData() here — that would
          // wipe `currentUser` from localStorage and break ProtectedRoute's
          // pre-load fallback (causing a 5s force-logout loop).
          clearSessionScopedData();

          // Seed a minimal `currentUser` so ProtectedRoute can route
          // immediately while the RPC resolves.
          localStorage.setItem("currentUser", JSON.stringify({
            id: session.user.id,
            email: session.user.email || "",
          }));
        } else if (!isSuperAdminRole(current?.role)) {
          // Only strip event_id if there's no remembered event for this user.
          // Otherwise, token refresh / session recovery on page reload would
          // wipe the selected event and force the user back to the picker
          // (or worse, trigger the ProtectedRoute logout timeout).
          const rememberedEventId = getStoredEventId();

          if (!rememberedEventId) {
            logger.log('🔄 Fresh sign-in with no remembered event — stripping event_id');
            const clearedProfile = { ...current, event_id: undefined };
            setProfile(clearedProfile);

            try {
              const stored = localStorage.getItem('currentUser');
              if (stored) {
                const parsed = JSON.parse(stored);
                delete parsed.event_id;
                localStorage.setItem('currentUser', JSON.stringify(parsed));
              }
            } catch { /* ignore */ }
          } else {
            logger.log('🔄 Refresh — keeping remembered event:', rememberedEventId);
          }
        }

        // Fetch fresh profile. Without an event_id this comes back with
        // roles: [] until the user picks an event.
        fetchUserProfile(session.user.id, session.user.email || "", undefined)
          .catch(console.error);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        clearAllCachedData();
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, clearAllCachedData, clearSessionScopedData]);
  // ─────────────────────────────────────────────────────────────────────────
  // Shared revalidation: refetch profile for the current event and react if
  // the server says we no longer have access.
  // ─────────────────────────────────────────────────────────────────────────
  const revalidateAccess = useCallback(async (reason: string) => {
    const current = profileRef.current;
    if (!current?.id) return;

    // No event yet → nothing to validate; ProtectedRoute handles the picker flow.
    if (!current.event_id) return;

    logger.log(`🔁 Revalidating access (${reason})`);

    try {
      const fresh = await fetchUserProfile(
        current.id,
        current.email,
        current.event_id,
        true,  // forceRefresh — bypass cache
      );

      if (!fresh) {
        // Either the event was deleted, the user was removed from it, or the
        // RPC threw. In all cases the user no longer has a valid scope.
        logger.warn(`🚪 Access lost (${reason}) — routing to event selection`);

        // Keep auth session but clear event scope so ProtectedRoute sends the
        // user to /select-event. If the account itself is gone, the next RPC
        // will 401 and signOut() will fire from handleAuthError.
        try {
          localStorage.removeItem('selected_event_id');
          const stored = localStorage.getItem('currentUser');
          if (stored) {
            const parsed = JSON.parse(stored);
            delete parsed.event_id;
            localStorage.setItem('currentUser', JSON.stringify(parsed));
          }
        } catch { /* ignore */ }

        setProfile(prev => prev
          ? { ...prev, event_id: undefined, roles: [], role: 'attendee' }
          : prev
        );
        window.location.href = '/select-event';
      }
    } catch (err) {
      logger.warn(`Revalidation error (${reason}):`, err);
    }
  }, [fetchUserProfile]);

  // ─────────────────────────────────────────────────────────────────────────
  // Realtime — watch events, event_registrations, and user_roles (INSERT /
  // UPDATE / DELETE) for the current user + event.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const userId = user?.id;
    const eventId = profile?.event_id;
    if (!userId) return;

    const channel = supabase
      .channel(`access-watch-${userId}-${eventId ?? 'none'}`)

      // ── 1) Our event changed ──────────────────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', schema: 'public', table: 'events',
          filter: eventId ? `id=eq.${eventId}` : undefined
        },
        () => revalidateAccess('event-updated'),
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', schema: 'public', table: 'events',
          filter: eventId ? `id=eq.${eventId}` : undefined
        },
        () => revalidateAccess('event-deleted'),
      )

      // ── 2) Our roles for this event changed ───────────────────────────────
      .on(
        'postgres_changes',
        {
          event: 'INSERT', schema: 'public', table: 'user_roles',
          filter: eventId
            ? `user_id=eq.${userId},event_id=eq.${eventId}`
            : `user_id=eq.${userId}`
        },
        () => revalidateAccess('role-inserted'),
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', schema: 'public', table: 'user_roles',
          filter: eventId
            ? `user_id=eq.${userId},event_id=eq.${eventId}`
            : `user_id=eq.${userId}`
        },
        () => revalidateAccess('role-updated'),
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE', schema: 'public', table: 'user_roles',
          filter: eventId
            ? `user_id=eq.${userId},event_id=eq.${eventId}`
            : `user_id=eq.${userId}`
        },
        () => revalidateAccess('role-deleted'),
      )

      // ── 3) Our registration status changed ────────────────────────────────
      .on(
        'postgres_changes',
        {
          event: '*', schema: 'public', table: 'event_registrations',
          filter: eventId
            ? `user_id=eq.${userId},event_id=eq.${eventId}`
            : `user_id=eq.${userId}`
        },
        () => revalidateAccess('registration-changed'),
      )

      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, profile?.event_id, revalidateAccess]);
  // ----- Role helpers -----
  const hasRole = useCallback(
    (roles: string | string[]): boolean => {
      if (!profile?.role) return false;
      const roleArray = Array.isArray(roles) ? roles : [roles];
      return roleArray.includes(profile.role);
    },
    [profile?.role]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      if (!profile?.roles || profile.roles.length === 0) return false;
      return roles.some(role => profile.roles.includes(role));
    },
    [profile?.roles]
  );

  const getRoleBasedRedirect = useCallback(
    (role?: string): string => {
      const r = role || profile?.role || "attendee";
      const roleMap: Record<string, string> = {
        sadmin: "/super-ctrl-92k1x",
        super_admin: "/super-ctrl-92k1x",
        admin: "/secure-9821panel",
        team_leader: "/team-leader",
        tech_support: "/tech-support",
        employer: "/employer",
        volunteer: "/volunteer",
        building: "/building",
        registration: "/registration",
        verification: "/verification",
        attendee: "/attendee"
      };
      return roleMap[r] || "/";
    },
    [profile?.role]
  );

  const signOut = useCallback(async () => {
    setIsLoggingOut(true);
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      // Full wipe — including the selected event, since this is an explicit logout
      localStorage.removeItem("selected_event_id");
      clearAllCachedData();
    } catch (err) {
      logger.error("Error signing out:", err);
    } finally {
      setLoading(false);
      setIsLoggingOut(false);
    }
  }, [clearAllCachedData]);
  const cleanupSession = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      localStorage.removeItem("selected_event_id");
      clearAllCachedData();
    } catch (err) {
      logger.error("Error cleaning up session:", err);
    }
  }, [clearAllCachedData]);

  // ----- Handle auth errors -----
  const handleAuthError = useCallback(async (error: any) => {
    const isSessionExpired =
      error?.code === "PGRST303" ||
      error?.message?.includes("JWT expired") ||
      error?.status === 401 ||
      error?.status === 403;

    if (isSessionExpired) {
      clearAllCachedData();
      setUser(null);
      setProfile(null);
      await signOutUser().catch(console.error);
      window.location.href = "/login";
    }
  }, [clearAllCachedData]);

  const contextValue = useMemo(
    () => ({
      user, profile, loading, sessionLoaded,
      isAuthenticated: !!user,
      isLoggingOut, signOut, cleanupSession,
      hasRole, hasAnyRole, getRoleBasedRedirect,
      refreshProfile, handleAuthError
    }),
    [user, profile, loading, sessionLoaded, isLoggingOut, signOut, cleanupSession,
      hasRole, hasAnyRole, getRoleBasedRedirect, refreshProfile, handleAuthError]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};