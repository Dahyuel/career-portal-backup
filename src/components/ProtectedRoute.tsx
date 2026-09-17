// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLoading from './DashboardLoading';
import { logger } from '../utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  /**
   * Only require a signed-in user. For pages that work before a profile or an
   * event role exists (employer onboarding).
   */
  allowWithoutProfile?: boolean;
}

// Paths reachable without an active event / without roles
const PUBLIC_EVENT_PATHS = [
  '/select-event',
  '/register-event',
  '/pending-approval',
  '/payment-required',
  '/rejected-attendee',
  '/no-active-event',
];

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowWithoutProfile = false,
}) => {
  const {
    user, profile, loading, sessionLoaded,
    isAuthenticated, hasRole, getRoleBasedRedirect, signOut,
  } = useAuth();
  const location = useLocation();

  // Is the current location a public event path?
  const onPublicPath = allowWithoutProfile || PUBLIC_EVENT_PATHS.includes(location.pathname);

  // Read localStorage ONCE at mount — used ONLY as a pre-load fallback.
  const localUserData = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  const isSuperAdmin = (role?: string) =>
    role === 'sadmin' || role === 'super_admin';

  // Safety timeout: force logout only if stuck with no data at all.
  // IMPORTANT: never arm this while on a public event path — those are
  // legitimate destinations that don't require an event_id, and the user
  // may be mid-selection.
  React.useEffect(() => {
    if (onPublicPath) return;

    let timeout: NodeJS.Timeout;
    if ((loading || (isAuthenticated && !profile)) && !localUserData) {
      timeout = setTimeout(async () => {
        await signOut();
        window.location.href = '/login';
      }, 5000);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [loading, isAuthenticated, profile, signOut, localUserData, onPublicPath]);

  // ── 1. Initial bootstrap spinner ─────────────────────────────────────────
  if (loading && !sessionLoaded) {
    return <DashboardLoading message="Loading Your Dashboard" />;
  }

  // ── 2. Not authenticated → login ─────────────────────────────────────────
  if ((sessionLoaded && !isAuthenticated) || (!loading && !user)) {
    logger.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── 2b. Signed in is all this page needs ─────────────────────────────────
  if (allowWithoutProfile) {
    return <>{children}</>;
  }

  // ── 3. Pre-load fast redirect using localStorage (before profile arrives) ─
  if (requiredRole && !profile && localUserData?.role) {
    if (!isSuperAdmin(localUserData.role)) {
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!requiredRoles.includes(localUserData.role)) {
        const correctPath = getRoleBasedRedirect(localUserData.role);
        if (location.pathname !== correctPath) {
          return <Navigate to={correctPath} replace />;
        }
      }
    }
  }

  // ── 4. Wait for profile if still loading ─────────────────────────────────
  if (isAuthenticated && !profile && !localUserData?.role) {
    return (
      <DashboardLoading
        message="Loading Your Dashboard"
        subMessage="Preparing your experience..."
      />
    );
  }

  // ── 5. Authoritative routing (uses live profile) ─────────────────────────
  if (profile) {
    const role = profile.role;
    const isAdmin = isSuperAdmin(role);
    const isAttendee = role === 'attendee';

    // ── 5a. Non-attendee without active event → /select-event ─────────────
    // Every non-attendee (volunteer, staff, employer, etc.) REQUIRES an
    // active event. Only sadmin / super_admin are exempt. Selection is the
    // single source of truth, so send them to the picker.
    if (!isAdmin && !isAttendee && !profile.event_id) {
      logger.log('🚫 No active event for role:', role, '— redirecting to selection');
      if (!onPublicPath) {
        return <Navigate to="/select-event" replace />;
      }
    }

    // ── 5b. Attendee without an event → /select-event ─────────────────────
    // This is the KEY check: even if login races or stale cache sneaks
    // through, an attendee with no bound event is always pushed back to
    // the selector.
    if (isAttendee && !profile.event_id && !onPublicPath) {
      logger.log('👤 Attendee has no event — redirecting to selection');
      return <Navigate to="/select-event" replace />;
    }

    // ── 5c. Non-attendee with event_id but empty roles → /select-event ────
    if (!isAdmin && !isAttendee && profile.event_id && profile.roles.length === 0) {
      logger.log('⚠️ Non-attendee with event but empty roles — redirecting to selection');
      if (!onPublicPath) {
        return <Navigate to="/select-event" replace />;
      }
    }

    // ── 5d. Attendee status redirects ─────────────────────────────────────
    if (isAttendee && profile.attendee && !isAdmin) {
      const { registration_status, is_asu_student } = profile.attendee;
      const currentPath = location.pathname;

      // Don't fight the event selector while the user is mid-pick
      if (!onPublicPath) {
        if (registration_status === 'approved') {
          if (currentPath !== '/attendee') {
            return <Navigate to="/attendee" replace />;
          }
        } else if (registration_status === 'rejected') {
          if (currentPath !== '/rejected-attendee') {
            return <Navigate to="/rejected-attendee" replace />;
          }
        } else if (registration_status === 'pending') {
          if (is_asu_student && currentPath !== '/pending-approval') {
            return <Navigate to="/pending-approval" replace />;
          }
          if (!is_asu_student && currentPath !== '/payment-required') {
            return <Navigate to="/payment-required" replace />;
          }
        } else {
          if (currentPath !== '/attendee') {
            return <Navigate to="/attendee" replace />;
          }
        }
      }
    }

    // ── 5e. Authoritative role check (skipped for sadmin) ─────────────────
    if (requiredRole && !isAdmin) {
      const hasRequiredRole = hasRole(requiredRole);

      if (!hasRequiredRole) {
        logger.log('❌ Access denied - insufficient permissions', {
          userRole: profile.role,
          requiredRole,
        });

        const correctPath = getRoleBasedRedirect(profile.role);
        if (location.pathname !== correctPath) {
          return <Navigate to={correctPath} replace />;
        }

        return <Navigate to="/login" replace />;
      }
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;