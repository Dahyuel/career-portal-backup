// AuthContext with Supabase authentication
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { supabase, signOutUser, getCurrentSession } from "../lib/supabase";
import type { User } from "@supabase/supabase-js";

// User profile type matching Supabase schema
type UserProfile = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  personal_id?: string;
  role: string;
  profile_complete?: boolean;
  created_at?: string;
  team_name?: string; // Added for volunteer team redirection
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionLoaded: boolean;
  isLoggingOut: boolean;
  signOut: () => Promise<void>;
  cleanupSession: () => Promise<void>; // Clean session without clearing form data
  hasRole: (roles: string | string[]) => boolean;
  getRoleBasedRedirect: (role?: string) => string;
  refreshProfile: () => Promise<void>;
  handleAuthError: (error: any) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to restore session from localStorage IMMEDIATELY (synchronous)
const getInitialSessionFromStorage = () => {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return { user: null, profile: null };

    const parsed = JSON.parse(stored);
    // Create minimal user object from localStorage
    const user: User | null = parsed.id ? {
      id: parsed.id,
      email: parsed.email,
      aud: 'authenticated',
      role: '',
      created_at: '',
      app_metadata: {},
      user_metadata: {}
    } as User : null;

    // Create profile from localStorage
    const profile: UserProfile | null = parsed.id ? {
      id: parsed.id,
      email: parsed.email,
      role: parsed.role,
      full_name: parsed.fullName || '',
      profile_complete: true,
      team_name: parsed.teamName
    } : null;

    return { user, profile };
  } catch {
    return { user: null, profile: null };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITICAL: Initialize with localStorage data to prevent flash
  const initialSession = getInitialSessionFromStorage();

  const [user, setUser] = useState<User | null>(initialSession.user);
  const [profile, setProfile] = useState<UserProfile | null>(initialSession.profile);
  const [loading, setLoading] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);



  // Fetch user profile from user_profiles and user_roles tables
  const fetchUserProfile = useCallback(async (userId: string, userEmail: string) => {
    try {
      // Race against a timeout to prevent hanging
      const fetchPromise = async () => {
        // PARALLEL: Fetch profile and role simultaneously to reduce waterfall effect
        const [profileResult, roleResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .order('assigned_at', { ascending: false })
            .limit(1)
            .single()
        ]);

        const { data: profileData, error: profileError } = profileResult;
        const { data: roleData, error: roleError } = roleResult;

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching role:', roleError);
        }

        // Also check localStorage for role (fallback for newly registered users)
        const localUser = localStorage.getItem('currentUser');
        let localRole = null;
        if (localUser) {
          try {
            const parsed = JSON.parse(localUser);
            localRole = parsed.role;
          } catch (e) {
            console.error('Error parsing local user:', e);
          }
        }

        const role = roleData?.role || localRole || 'attendee';
        let teamName = undefined;

        // If volunteer, fetch team info using JOIN for speed
        if (role === 'volunteer') {
          try {
            // Get volunteer record and joined team name in ONE query
            const { data: volData } = await supabase
              .from('volunteers')
              .select('team_id, volunteer_teams(team_name)')
              .eq('user_id', userId)
              .single();

            if (volData?.volunteer_teams) {
              // Supabase JS often returns joined data as an object or array depending on relation
              // Since volunteer -> team is N:1, it should be an object, but we handle array just in case
              const team = Array.isArray(volData.volunteer_teams)
                ? volData.volunteer_teams[0]
                : volData.volunteer_teams;

              if (team) {
                teamName = team.team_name;
              }
            }
          } catch (err) {
            console.error('Error fetching volunteer team:', err);
          }
        }

        return {
          id: userId,
          email: userEmail,
          full_name: profileData?.full_name || '',
          phone: profileData?.phone || '',
          personal_id: profileData?.personal_id || '',
          role: role,
          profile_complete: !!profileData,
          created_at: profileData?.created_at,
          team_name: teamName
        };
      };

      // Timeout promise - Reduced to 5s as requested for fast loading/fail-fast
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      try {
        const userProfile = await Promise.race([fetchPromise(), timeoutPromise]) as UserProfile;
        setProfile(userProfile);

        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          id: userId,
          email: userEmail,
          role: userProfile.role,
          fullName: userProfile.full_name,
          teamName: userProfile.team_name
        }));

        return userProfile;
      } catch (timeoutError) {
        // If timeout happens, we don't crash, implementing a silent retry or fallback
        console.warn('⚠️ Profile fetch timed out, using fallback or retrying in background');
        // Do NOT set profile to null if we already have it from local storage
        // This prevents the "flash" of unauthenticated state
        return null;
      }

    } catch (error: any) {
      console.error('Error in fetchUserProfile:', error);

      // Check for session expiration
      if (error?.code === 'PGRST303' || error?.message?.includes('JWT expired')) {
        console.warn('JWT Expired in fetchUserProfile, cleaning up...');
        localStorage.removeItem('currentUser');
        setUser(null);
        setProfile(null);
        // We can't safely call signOut() here due to dependency cycles, so we hard redirect
        window.location.href = '/login';
      }
      return null;
    }
  }, []);

  // Refresh profile
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id, user.email || '');
    }
  }, [user, fetchUserProfile]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // If we already have user from localStorage, mark as loaded immediately
        // to prevent flash, then verify in background
        const hasLocalStorageSession = initialSession.user !== null;

        if (hasLocalStorageSession) {
          setSessionLoaded(true);
          setLoading(false);
        }

        // Verify session with Supabase (this runs in background if we have localStorage)
        const session = await getCurrentSession();

        if (session?.user) {
          setUser(session.user);
          // Only fetch profile if it changed or we don't have it
          if (!profile || session.user.id !== profile.id) {
            await fetchUserProfile(session.user.id, session.user.email || '');
          }
        } else {
          // No valid session - clear everything
          setUser(null);
          setProfile(null);
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
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

      // Skip profile fetching during active registration (profile doesn't exist yet)
      // Check for both attendee registration (/attendee-register) and volunteer registration (/V0lunt33ringR3g)
      // Check for attendee, volunteer, and employer registration
      const currentPath = window.location.pathname;
      const isRegistering = currentPath.includes('register') ||
        currentPath.includes('V0lunt33ringR3g') ||
        currentPath.includes('employer');

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);

        // Only fetch profile if NOT during registration process
        if (!isRegistering) {
          // CRITICAL FIX: Immediately restore profile from localStorage to prevent race condition
          const localUser = localStorage.getItem('currentUser');
          if (localUser) {
            try {
              const parsed = JSON.parse(localUser);
              // Set temporary profile from localStorage while we fetch from DB
              setProfile({
                id: session.user.id,
                email: session.user.email || '',
                role: parsed.role,
                full_name: parsed.fullName || '',
                profile_complete: true,
                team_name: parsed.teamName
              });
            } catch (e) {
              console.error('Error parsing local user:', e);
            }
          }

          // Then fetch the full profile from database (will override the temp profile)
          await fetchUserProfile(session.user.id, session.user.email || '');
        } else {
          // console.log('⏭️ Skipping profile fetch during registration');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('currentUser');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }

      // Ensure loading state is cleared when auth state is confirmed
      // This prevents the app from getting stuck in loading if initializeAuth hangs
      setLoading(false);
      setSessionLoaded(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Role-based redirect logic
  const getRoleBasedRedirect = useCallback((role?: string) => {
    const r = role || profile?.role || 'attendee';

    // Base map for fixed roles (from user_roles table)
    const roleMap: Record<string, string> = {
      admin: '/secure-9821panel',
      sadmin: '/super-ctrl-92k1x',
      super_admin: '/super-ctrl-92k1x',
      team_leader: '/team-leader',
      attendee: '/attendee',
      employer: '/employer',
      // Specific volunteer roles
      building: '/buildteam',
      registration: '/registration',
      info_desk: '/info-desk',
      verification: '/verification',
      // Default volunteer
      volunteer: '/volunteer'
    };

    if (roleMap[r]) {
      return roleMap[r];
    }

    return '/'; // Default fallback
  }, [profile]);



  // Sign out
  const signOut = useCallback(async () => {
    setIsLoggingOut(true);
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
      setProfile(null);
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
      setIsLoggingOut(false);
    }
  }, []);

  const handleAuthError = useCallback(async (error: any) => {
    // Check for specific Supabase/PostgREST error codes or messages
    const isSessionExpired =
      error?.code === 'PGRST303' || // JWT expired
      error?.message?.includes('JWT expired') ||
      error?.status === 401 ||
      error?.status === 403; // Also handle Forbidden as it often means expired token

    if (isSessionExpired) {
      // console.warn('⚠️ Session expired, cleaning up immediately...');

      // CRITICAL: Clear local state IMMEDIATELY without waiting for server
      // This prevents the slow 403 response from blocking the redirect
      localStorage.removeItem('currentUser');
      setUser(null);
      setProfile(null);

      // Fire and forget logout to server (don't await)
      signOutUser().catch(err => console.error('Background logout error:', err));

      // Hard redirect to login to ensure clean state
      window.location.href = '/login';
    }
  }, []);

  // Cleanup session without clearing form data (for registration errors)
  const cleanupSession = useCallback(async () => {
    try {
      // Only clear auth state, not form data
      await signOutUser();
      setUser(null);
      setProfile(null);
      // Don't remove 'currentUser' or any form data from localStorage
    } catch (error) {
      console.error('Error cleaning up session:', error);
    }
  }, []);

  // Has role checker
  const hasRole = useCallback((roles: string | string[]) => {
    if (!profile?.role) return false;
    return Array.isArray(roles) ? roles.includes(profile.role) : profile.role === roles;
  }, [profile?.role]);

  // Context value
  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    sessionLoaded,
    isAuthenticated: !!user,
    isLoggingOut,
    signOut,
    cleanupSession,
    hasRole,
    getRoleBasedRedirect,
    refreshProfile,
    handleAuthError,
  }), [user, profile, loading, sessionLoaded, isLoggingOut, hasRole, getRoleBasedRedirect, refreshProfile, signOut, cleanupSession, handleAuthError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};