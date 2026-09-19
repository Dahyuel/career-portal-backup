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

  // ----- Clear all user-related cached data (full wipe, used on sign-out) -----
  const clearAllCachedData = useCallback(() => {
    // Preserve theme
    const theme = localStorage.getItem("theme");

    // Clear everything
    localStorage.clear();
    sessionStorage.clear();
    clearAllFormCaches();

    // Restore theme
    if (theme) {
      localStorage.setItem("theme", theme);
    }

    logger.log('🧹 All cached user data cleared');
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

        const shouldCache = incomingRoles.length > 0 || forceRefresh || !currentProfile;
        if (shouldCache) {
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
          // Only fetch if no cached profile for this user
          if (!profileRef.current || profileRef.current.id !== session.user.id) {
            await fetchUserProfile(session.user.id, session.user.email || "", undefined);
          }
        } else {
          setUser(null);
          setProfile(null);
          clearAllCachedData();
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
          // Same non-super-admin re-logging in: strip event_id so they must
          // re-select an event. Applies to attendee, staff and employer alike.
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

  // ----- Realtime: react to this user's role changes -----
  useEffect(() => {
    const userId = user?.id;
    const eventId = profile?.event_id;
    if (!userId || !eventId) return;

    const channel = supabase
      .channel(`role-change-${userId}-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId},event_id=eq.${eventId}`,
        },
        () => {
          logger.log('📡 Role assigned — refreshing profile');
          refreshProfile(eventId, userId, user?.email || undefined, true).catch(console.error);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',                              // ← NEW BLOCK
          schema: 'public',
          table: 'user_roles',
          filter: `user_id=eq.${userId},event_id=eq.${eventId}`,
        },
        () => {
          logger.log('📡 Role changed — refreshing profile');
          refreshProfile(eventId, userId, user?.email || undefined, true).catch(console.error);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.email, profile?.event_id, refreshProfile]);

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

  // ----- Sign out -----
  const signOut = useCallback(async () => {
    setIsLoggingOut(true);
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      clearAllCachedData(); // ← always clears localStorage on signout
    } catch (err) {
      logger.error("Error signing out:", err);
    } finally {
      setLoading(false);
      setIsLoggingOut(false);
    }
  }, [clearAllCachedData]);

  // ----- Cleanup session -----
  const cleanupSession = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
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