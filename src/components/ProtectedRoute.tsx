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

  const isSuperAdmin = (role?: string) =>
    role === 'sadmin' || role === 'super_admin';

  // Safety timeout: force logout only if stuck with no profile at all.
  // IMPORTANT: never arm this while on a public event path — those are
  // legitimate destinations that don't require an event_id, and the user
  // may be mid-selection.
  React.useEffect(() => {
    if (onPublicPath) return;

    let timeout: NodeJS.Timeout;
    if ((loading || (isAuthenticated && !profile))) {
      timeout = setTimeout(async () => {
        await signOut();
        window.location.href = '/login';
      }, 5000);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [loading, isAuthenticated, profile, signOut, onPublicPath]);

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
  // ── 3. Wait for the server-confirmed profile ─────────────────────────────
  // Routing decisions are made ONLY from the authoritative profile returned by
  // the live RPC/session. localStorage is never consulted for roles.
  //
  // Exception: on public event paths (e.g. /select-event), a null profile is
  // legitimate — it means "no event chosen yet", not "not authenticated".
  // Those pages are the ones that produce the event_id the rest of the app
  // needs, so they must be allowed to render while profile is still null.
  if (isAuthenticated && !profile) {
    if (onPublicPath) {
      return <>{children}</>;
    }
    return (
      <DashboardLoading
        message="Loading Your Dashboard"
        subMessage="Preparing your experience..."
      />
    );
  }

  // ── 4. Authoritative routing (uses live profile) ─────────────────────────
  if (profile) {
    const role = profile.role;
    const isAdmin = isSuperAdmin(role);
    const isAttendee = role === 'attendee';

    // ── 4a. Non-attendee without active event → /select-event ─────────────
    // Every non-attendee (volunteer, staff, employer, etc.) REQUIRES an
    // active event. Only sadmin / super_admin are exempt. Selection is the
    // single source of truth, so send them to the picker.
    if (!isAdmin && !isAttendee && !profile.event_id) {
      logger.log('🚫 No active event for role:', role, '— redirecting to selection');
      if (!onPublicPath) {
        return <Navigate to="/select-event" replace />;
      }
    }

    // ── 4b. Attendee without an event → /select-event ─────────────────────
    if (isAttendee && !profile.event_id && !onPublicPath) {
      logger.log('👤 Attendee has no event — redirecting to selection');
      return <Navigate to="/select-event" replace />;
    }

    // ── 4c. Non-attendee with event_id but empty roles → /select-event ────
    if (!isAdmin && !isAttendee && profile.event_id && profile.roles.length === 0) {
      logger.log('⚠️ Non-attendee with event but empty roles — redirecting to selection');
      if (!onPublicPath) {
        return <Navigate to="/select-event" replace />;
      }
    }

    // ── 4d. Attendee status redirects ─────────────────────────────────────
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

    // ── 4e. Authoritative role check (skipped for sadmin) ─────────────────
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
