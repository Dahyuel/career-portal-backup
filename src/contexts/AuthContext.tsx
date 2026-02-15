// AuthContext with optimized session handling and proper RPC response parsing
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase, signOutUser, getCurrentSession } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

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
  } | null;
  attendee: {
    user_id: string;
    is_asu_student: boolean;
    student_id: string;
    university: string;
    faculty: string;
    department: string;
    registration_status: string;
    payment_status: string;
    cv_url: string;
    enrollment_proof_url: string;
    registered_at: string;
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
  } | null;
  roles: string[];
  isVolunteer: boolean;
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

  // Role information
  role: string; // primary/effective role
  roles: string[]; // all roles for this event
  isVolunteer: boolean;

  // Type-specific data
  attendee?: GetMyProfileResponse['attendee'];
  volunteer?: GetMyProfileResponse['volunteer'];
  employer?: GetMyProfileResponse['employer'];
  company?: GetMyProfileResponse['company'];

  // Metadata
  profile_complete: boolean;
  created_at: string;
  event_id?: string; // cache key
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

// ----- Helper: Determine effective role from roles array -----
const getEffectiveRole = (roles: string[]): string => {
  if (!roles || roles.length === 0) return "attendee";

  // Priority order
  const priority = ["sadmin", "super_admin", "admin", "team_leader", "employer",
    "volunteer", "building", "registration", "info_desk", "verification", "attendee"];

  for (const role of priority) {
    if (roles.includes(role)) return role;
  }

  return roles[0] || "attendee";
};

// ----- Helper: Restore from localStorage -----
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

    const profile: UserProfile = parsed;
    return { user, profile };
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

  // ----- Fetch profile from RPC (authoritative) -----
  const fetchUserProfile = useCallback(
    async (userId: string, userEmail: string, eventId?: string, forceRefresh = false): Promise<UserProfile | null> => {
      try {
        // Skip fetch if profile already cached for this event (unless force refresh)
        if (!forceRefresh && profile && profile.event_id === eventId && profile.id === userId) {
          console.log('📦 Using cached profile for event:', eventId);
          return profile;
        }

        console.log('🔍 Fetching profile from database...', { userId, eventId, forceRefresh });

        // RPC call to get_my_profile
        const { data, error } = await supabase
          .rpc("get_my_profile", { _event_id: eventId })
          .single();

        if (error) {
          console.error("❌ RPC Error fetching user profile:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          return null;
        }

        if (!data) {
          console.warn("⚠️ RPC returned no data");
          return null;
        }

        // Parse the RPC response
        const rpcData = data as unknown as GetMyProfileResponse;

        console.log('📥 RPC Response:', {
          hasProfile: !!rpcData.profile,
          hasRoles: !!rpcData.roles,
          rolesCount: rpcData.roles?.length || 0,
          isVolunteer: rpcData.isVolunteer,
          hasCompany: !!rpcData.company,
          companyName: rpcData.company?.company_name
        });

        if (!rpcData.profile) {
          console.warn("⚠️ No profile data in RPC response");
          return null;
        }

        // Determine effective role
        const effectiveRole = getEffectiveRole(rpcData.roles || []);

        console.log('✅ Effective role determined:', effectiveRole, 'from roles:', rpcData.roles);

        // Build UserProfile
        const userProfile: UserProfile = {
          id: userId,
          email: userEmail,
          full_name: rpcData.profile.full_name || "",
          phone: rpcData.profile.phone || "",
          personal_id: rpcData.profile.personal_id || "",
          score: rpcData.profile.score || 0,
          preferred_language: rpcData.profile.preferred_language || "en",

          role: effectiveRole,
          roles: rpcData.roles || [],
          isVolunteer: rpcData.isVolunteer || false,

          attendee: rpcData.attendee,
          volunteer: rpcData.volunteer,
          employer: rpcData.employer,
          company: rpcData.company,

          profile_complete: !!(rpcData.profile.full_name && rpcData.profile.phone && rpcData.profile.personal_id),
          created_at: rpcData.profile.created_at,
          event_id: eventId
        };

        // Update state
        setProfile(userProfile);

        // Update localStorage cache
        localStorage.setItem("currentUser", JSON.stringify(userProfile));

        console.log('✅ Profile fetched and cached successfully', forceRefresh ? '(forced refresh)' : '');

        return userProfile;
      } catch (err) {
        console.error("💥 Exception fetching user profile:", err);
        if (err instanceof Error) {
          console.error("Error details:", {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
        }
        return null;
      }
    },
    [profile]
  );

  // Add this to your AuthContext.tsx - Updated refreshProfile function

  // ----- Refresh profile -----
  const refreshProfile = useCallback(
    async (eventId?: string, userId?: string, userEmail?: string, forceRefresh: boolean = false): Promise<UserProfile | null> => {
      // Use provided userId/email or fall back to current user state
      let targetUserId = userId || user?.id;
      let targetUserEmail = userEmail || user?.email || "";

      // If no userId available, try to get it from current session
      if (!targetUserId) {
        console.warn('⚠️ refreshProfile: No user ID in state, checking session...');

        try {
          const session = await getCurrentSession();
          if (session?.user) {
            console.log('✅ Found user from session:', session.user.id);
            targetUserId = session.user.id;
            targetUserEmail = session.user.email || "";

            // Update the user state for future calls
            setUser(session.user);
          } else {
            console.error('❌ No session found');
            return null;
          }
        } catch (err) {
          console.error('❌ Error getting current session:', err);
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
        // Show cached profile immediately if available
        if (initialSession.user) setSessionLoaded(true);

        const session = await getCurrentSession();
        if (session?.user) {
          setUser(session.user);
          // Only fetch if no cached profile
          if (!profile || profile.id !== session.user.id) {
            await fetchUserProfile(session.user.id, session.user.email || "");
          }
        } else {
          setUser(null);
          setProfile(null);
          localStorage.removeItem("currentUser");
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
        setSessionLoaded(true);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("currentUser");
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

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
        employer: "/employer",
        volunteer: "/volunteer",
        building: "/building",
        registration: "/registration",
        info_desk: "/info-desk",
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
      localStorage.removeItem("currentUser");
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      setLoading(false);
      setIsLoggingOut(false);
    }
  }, []);

  // ----- Cleanup session -----
  const cleanupSession = useCallback(async () => {
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      localStorage.removeItem("currentUser");
    } catch (err) {
      console.error("Error cleaning up session:", err);
    }
  }, []);

  // ----- Handle auth errors -----
  const handleAuthError = useCallback(async (error: any) => {
    const isSessionExpired =
      error?.code === "PGRST303" ||
      error?.message?.includes("JWT expired") ||
      error?.status === 401 ||
      error?.status === 403;

    if (isSessionExpired) {
      localStorage.removeItem("currentUser");
      setUser(null);
      setProfile(null);
      await signOutUser().catch(console.error);
      window.location.href = "/login";
    }
  }, []);

  // ----- Context value -----
  const contextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      sessionLoaded,
      isAuthenticated: !!user,
      isLoggingOut,
      signOut,
      cleanupSession,
      hasRole,
      hasAnyRole,
      getRoleBasedRedirect,
      refreshProfile,
      handleAuthError
    }),
    [user, profile, loading, sessionLoaded, isLoggingOut, signOut, cleanupSession,
      hasRole, hasAnyRole, getRoleBasedRedirect, refreshProfile, handleAuthError]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// ----- Hook -----
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};