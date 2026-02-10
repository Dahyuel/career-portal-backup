// src/components/ProtectedRoute.tsx - Supabase Auth Version
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLoading from './DashboardLoading';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireCompleteProfile = false // Changed default to false for simpler flow
}) => {
  const {
    user,
    profile,
    loading,
    sessionLoaded,
    isAuthenticated,
    hasRole,
    getRoleBasedRedirect,
    signOut
  } = useAuth();
  const location = useLocation();

  /* console.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    loading,
    sessionLoaded,
    isAuthenticated,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    profileComplete: profile?.profile_complete
  }); */

  // OPTIMIZATION: Check localStorage FIRST for instant role check
  // This prevents the 5-second loading wait when accessing unauthorized endpoints
  const localUserData = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Safety timeout: Only needed if we're truly stuck (much longer now since we're faster)
  React.useEffect(() => {
    let timeout: NodeJS.Timeout;

    // Only set timeout if we're loading and don't have localStorage data
    if ((loading || (isAuthenticated && !profile)) && !localUserData) {
      timeout = setTimeout(async () => {
        /* console.warn('⚠️ Loading timed out. Forcing logout...', {
          loading,
          hasProfile: !!profile,
          isAuthenticated
        }); */
        await signOut();
        window.location.href = '/login';
      }, 5000); // Back to 5 seconds, but rarely hit due to localStorage
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [loading, isAuthenticated, profile, signOut, localUserData]);

  // ⚡ ZERO-LAG INSTANT REDIRECT: Check localStorage FIRST before ANY other logic!
  // This executes immediately on render for instant unauthorized redirects
  if (requiredRole && localUserData?.role) {
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Use localStorage role for instant check (profile will verify later if needed)
    if (!requiredRoles.includes(localUserData.role)) {
      // INSTANT redirect - no console logs, no extra checks, pure speed
      const correctPath = getRoleBasedRedirect(localUserData.role);
      return <Navigate to={correctPath} replace />;
    }
  }

  // Show loading only during initial session load (with a max timeout to prevent infinite loading)
  if (loading && !sessionLoaded) {
    return (
      <DashboardLoading message="Loading Your Dashboard" />
    );
  }

  // CRITICAL: Once session is loaded but no user, redirect to login
  // Also redirect if loading is done and no user
  if ((sessionLoaded && !isAuthenticated) || (!loading && !user)) {
    console.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we have a user but profile is still loading, wait
  // ALSO wait if we need role validation but the role hasn't loaded yet
  // BUT: Only show this if localStorage doesn't have the info
  if (isAuthenticated && (!profile || (requiredRole && !profile.role)) && !localUserData?.role) {
    return (
      <DashboardLoading
        message="Loading Your Dashboard"
        subMessage="Preparing your experience..."
      />
    );
  }

  // Handle profile completion logic (if enabled)
  if (requireCompleteProfile && profile && !profile.profile_complete) {
    console.log('📝 Profile incomplete, checking redirect...');

    // Allow access to registration forms even with incomplete profiles
    const isRegistrationPath = location.pathname === '/V0lunt33ringR3g' ||
      location.pathname === '/attendee-register';

    if (isRegistrationPath) {
      console.log('✅ Allowing access to registration form');
      return <>{children}</>;
    }

    // Redirect incomplete profiles to appropriate registration form
    const redirectPath = getRoleBasedRedirect(profile.role);
    console.log('🔄 Redirecting to:', redirectPath);

    // Prevent redirect loop
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check role permissions if specified
  if (requiredRole && profile) {
    const hasRequiredRole = hasRole(requiredRole);

    if (!hasRequiredRole) {
      console.log('❌ Access denied - insufficient permissions', {
        userRole: profile.role,
        requiredRole
      });

      // Auto-redirect to their correct dashboard instead of showing Access Denied
      const correctPath = getRoleBasedRedirect(profile.role);

      // Prevent infinite redirect loop if for some reason the correct path is also forbidden (shouldn't happen with correct config)
      if (location.pathname !== correctPath) {
        return <Navigate to={correctPath} replace />;
      }

      // Fallback if they are already on the "correct" path but still denied (e.g. role mismatch in config)
      return <Navigate to="/login" replace />;
    }
  }

  // console.log('✅ Access granted to protected route');
  return <>{children}</>;
};

export default ProtectedRoute;