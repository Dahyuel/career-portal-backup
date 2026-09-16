// src/components/shared/ProtectedRoute.tsx - UPDATED FOR YOUR FLOW
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLoading from '../DashboardLoading';
import { logger } from '../../utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  requireCompleteProfile?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requireCompleteProfile = true
}) => {
  const {
    user,
    profile,
    loading,
    sessionLoaded,
    isAuthenticated,
    hasRole,
    getRoleBasedRedirect
  } = useAuth();
  const location = useLocation();

  logger.log('🛡️ ProtectedRoute check:', {
    path: location.pathname,
    loading,
    sessionLoaded,
    isAuthenticated,
    hasUser: !!user,
    hasProfile: !!profile,
    profileRole: profile?.role,
    profileComplete: profile?.profile_complete
  });

  // Show loading during initial session load or profile load
  if ((loading && !sessionLoaded) || (isAuthenticated && !profile && loading)) {
    return <DashboardLoading />;
  }

  // CRITICAL: Once session is loaded but no user, redirect to login
  if (sessionLoaded && !isAuthenticated) {
    logger.log('🔐 Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Handle profile completion logic
  const profileComplete = profile?.profile_complete || false;

  if (requireCompleteProfile && !profileComplete) {
    logger.log('📝 Profile incomplete, checking redirect...', {
      role: profile?.role,
      profileComplete,
      currentPath: location.pathname
    });

    // Allow access to registration forms even with incomplete profiles
    const isRegistrationPath = location.pathname === '/V0lunt33ringR3g' ||
      location.pathname === '/attendee-register';

    if (isRegistrationPath) {
      logger.log('✅ Allowing access to registration form');
      return <>{children}</>;
    }

    // Redirect incomplete profiles to appropriate registration form
    const redirectPath = getRoleBasedRedirect(profile?.role);
    logger.log('🔄 Redirecting incomplete profile to:', redirectPath);

    // Prevent redirect loop
    if (location.pathname !== redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // Check role permissions if specified
  if (requiredRole && profile) {
    const hasRequiredRole = hasRole(requiredRole);

    if (!hasRequiredRole) {
      logger.log('❌ Access denied - insufficient permissions', {
        userRole: profile.role,
        requiredRole
      });

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-red-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have the required permissions to access this page.
            </p>
            <div className="space-y-2 text-sm text-gray-500 mb-6">
              <p><span className="font-medium">Your role:</span> {profile?.role || 'Unknown'}</p>
              <p><span className="font-medium">Required role:</span> {
                Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole
              }</p>
            </div>
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  logger.log('✅ Access granted to protected route');
  return <>{children}</>;
};

export default ProtectedRoute;