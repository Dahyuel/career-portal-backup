// App.tsx
import React, { Suspense, useLayoutEffect, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { supabase } from './lib/supabase';
import { ResetPasswordForm } from './components/ResetPasswordForm';

// Auth Components (lazy loaded)
const LoginForm = React.lazy(() => import('./components/LoginForm').then(module => ({ default: module.LoginForm })));
const ForgotPasswordForm = React.lazy(() => import('./components/ForgotPasswordForm').then(module => ({ default: module.ForgotPasswordForm })));
const UnifiedAttendeeRegistration = React.lazy(() => import('./components/UnifiedAttendeeRegistration').then(module => ({ default: module.UnifiedAttendeeRegistration })));

// Lazy load dashboards
const NoActiveEvent = React.lazy(() => import('./pages/NoActiveEvent'));
const AttendeeDashboard = React.lazy(() => import('./pages/user/AttendeeDashboard'));
const VolunteerDashboard = React.lazy(() => import('./pages/volunteer/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const RegTeamDashboard = React.lazy(() => import('./pages/team/RegTeamDashboard').then(module => ({ default: module.RegTeamDashboard })));
const BuildTeamDashboard = React.lazy(() => import('./pages/team/BuildTeamDashboard').then(module => ({ default: module.BuildTeamDashboard })));
const VerificationDashboard = React.lazy(() => import('./pages/team/VerificationDashboard').then(module => ({ default: module.VerificationDashboard })));
const TeamLeaderDashboard = React.lazy(() => import('./pages/team/TeamLeaderDashboard').then(module => ({ default: module.TeamLeaderDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const SuperAdminPanel = React.lazy(() => import('./pages/admin/SuperAdminPanel').then(module => ({ default: module.SuperAdminPanel })));
const TechSupportDashboard = React.lazy(() => import('./pages/team/TechSupportDashboard').then(module => ({ default: module.TechSupportDashboard })));
const EmployerStart = React.lazy(() => import('./pages/Employer/EmployerStart').then(module => ({ default: module.EmployerStart })));
const EmployerDashboard = React.lazy(() => import('./pages/Employer/EmployerDashboard').then(module => ({ default: module.EmployerDashboard })));
const EventSelection = React.lazy(() => import('./pages/EventSelection').then(module => ({ default: module.EventSelection })));
const EventRegistration = React.lazy(() => import('./pages/EventRegistration').then(module => ({ default: module.EventRegistration })));
const PendingApproval = React.lazy(() => import('./pages/PendingApproval').then(module => ({ default: module.PendingApproval })));
const RegistrationConfirmed = React.lazy(() => import('./pages/RegistrationConfirmed').then(module => ({ default: module.RegistrationConfirmed })));
const RejectedAttendee = React.lazy(() => import('./pages/RejectedAttendee').then(module => ({ default: module.RejectedAttendee })));
const NotEligibleAttendee = React.lazy(() => import('./pages/NotEligibleAttendee').then(module => ({ default: module.NotEligibleAttendee })));
const VerificationPending = React.lazy(() => import('./pages/VerificationPending'));
const PaymentRequired = React.lazy(() => import('./pages/PaymentRequired').then(module => ({ default: module.PaymentRequired })));

// Landing Page Components (public)
const LandingPage = React.lazy(() => import('./pages/Landing page/LandingPage').then(module => ({ default: module.LandingPage })));
const Partners = React.lazy(() => import('./pages/Landing page/Partners').then(module => ({ default: module.Partners })));
const Speakers = React.lazy(() => import('./pages/Landing page/Speakers').then(module => ({ default: module.Speakers })));
const AboutCareerCenter = React.lazy(() => import('./pages/Landing page/AboutCareerCenter').then(module => ({ default: module.AboutCareerCenter })));

// Loading Screen
import DashboardLoading from './components/DashboardLoading';

// Main App Router
const AppRouter: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { loading } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
          navigate('/reset-password' + hash, { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (loading) {
    return (
      <DashboardLoading
        message="Initializing App..."
        subMessage="Please wait while we load your session"
      />
    );
  }

  return (
    <Routes>
      {/* Public Landing Pages */}
      <Route path="/" element={
        <Suspense fallback={<DashboardLoading message="Loading..." />}>
          <LandingPage />
        </Suspense>
      } />
      <Route path="/partners" element={
        <Suspense fallback={<DashboardLoading message="Loading partners..." />}>
          <Partners />
        </Suspense>
      } />
      <Route path="/speakers" element={
        <Suspense fallback={<DashboardLoading message="Loading speakers..." />}>
          <Speakers />
        </Suspense>
      } />
      <Route path="/about" element={
        <Suspense fallback={<DashboardLoading message="Loading..." />}>
          <AboutCareerCenter />
        </Suspense>
      } />

      {/* Auth Routes */}
      <Route path="/login" element={
        <Suspense fallback={<DashboardLoading message="Loading..." />}>
          <LoginForm />
        </Suspense>
      } />
      <Route path="/forgot-password" element={
        <Suspense fallback={<DashboardLoading message="Loading..." />}>
          <ForgotPasswordForm />
        </Suspense>
      } />
      <Route path="/reset-password" element={
        <Suspense fallback={<DashboardLoading message="Loading..." />}>
          <ResetPasswordForm />
        </Suspense>
      } />
      {/* Registration Form */}
      <Route path="/attendee-register" element={
        <Suspense fallback={<DashboardLoading message="Loading registration form..." />}>
          <UnifiedAttendeeRegistration />
        </Suspense>
      } />

      {/* Protected Event Selection & Registration */}
      <Route path="/select-event" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoading message="Loading events..." />}>
            <EventSelection />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/register-event" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoading message="Loading registration form..." />}>
            <EventRegistration />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/no-active-event" element={
        <ProtectedRoute>
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <NoActiveEvent />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/attendee" element={
        <ProtectedRoute
          requiredRole={[
            'attendee',
            'volunteer',
            'registration',
            'building',
            'verification',
            'tech_support',
            'team_leader'
          ]}
        >
          <Suspense fallback={<DashboardLoading message="Loading Your Dashboard" />}>
            <AttendeeDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/registration" element={
        <ProtectedRoute requiredRole="registration">
          <Suspense fallback={<DashboardLoading message="Loading Your Dashboard" />}>
            <RegTeamDashboard />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/rejected-attendee" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <RejectedAttendee />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/non-asu-rejected" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <NotEligibleAttendee />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/verification-pending" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <VerificationPending />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/payment-required" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <PaymentRequired />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/building" element={
        <ProtectedRoute requiredRole="building">
          <Suspense fallback={<DashboardLoading message="Loading Your Dashboard" />}>
            <BuildTeamDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/volunteer" element={
        <ProtectedRoute requiredRole="volunteer">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <VolunteerDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/verification" element={
        <ProtectedRoute requiredRole="verification">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <VerificationDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/team-leader" element={
        <ProtectedRoute requiredRole="team_leader">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <TeamLeaderDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/secure-9821panel" element={
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <AdminPanel />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/super-ctrl-92k1x" element={
        <ProtectedRoute requiredRole={['super_admin', 'sadmin']}>
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <SuperAdminPanel />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/tech-support" element={
        <ProtectedRoute requiredRole="tech_support">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <TechSupportDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Employer onboarding: profile (first login) → event selection */}
      <Route path="/employer-start" element={
        <ProtectedRoute allowWithoutProfile>
          <Suspense fallback={<DashboardLoading message="Loading..." />}>
            <EmployerStart />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/employer" element={
        <ProtectedRoute requiredRole="employer">
          <Suspense fallback={<DashboardLoading message="Loading dashboard..." />}>
            <EmployerDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Attendee Status Screens */}
      <Route path="/pending-approval" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Checking status..." />}>
            <PendingApproval />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/registration-confirmed" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<DashboardLoading message="Checking status..." />}>
            <RegistrationConfirmed />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/register" element={<Navigate to="/attendee-register" replace />} />

      {/* Fallback for old paths if any */}
      <Route path="/regteam" element={<Navigate to="/registration" replace />} />
      <Route path="/buildteam" element={<Navigate to="/building" replace />} />
      
      <Route path="/teamleader" element={<Navigate to="/team-leader" replace />} />
      <Route path="/employer-dashboard" element={<Navigate to="/employer" replace />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

// Logout Loading Popup
const LogoutPopup: React.FC = () => {
  const { isLoggingOut } = useAuth();

  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-fade-in">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Signing Out...
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please wait while we log you out
          </p>
        </div>
      </div>
    </div>
  );
};

// Maintenance Mode Guard
// The last answer is kept for the session, so pages are not blanked out while the
// check runs; only a confirmed maintenance window covers the screen.
const MAINTENANCE_CACHE_KEY = 'site.maintenance';
const DEFAULT_MAINTENANCE_MSG = 'System is under maintenance. Please try again later.';

const readMaintenanceCache = (): { enabled: boolean; message: string } | null => {
  try {
    const raw = sessionStorage.getItem(MAINTENANCE_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const MaintenanceGuard: React.FC = () => {
  const { pathname } = useLocation();
  const cached = readMaintenanceCache();
  const [isMaintenance, setIsMaintenance] = useState<boolean>(cached?.enabled ?? false);
  const [maintenanceMsg, setMaintenanceMsg] = useState(cached?.message || DEFAULT_MAINTENANCE_MSG);

  useEffect(() => {
    const checkMaintenance = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const { data } = await supabase.rpc('check_maintenance_status');
        const enabled = !!data?.enabled;
        const message = data?.message || DEFAULT_MAINTENANCE_MSG;
        setIsMaintenance(enabled);
        setMaintenanceMsg(message);
        try {
          sessionStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify({ enabled, message }));
        } catch { /* storage unavailable */ }
      } catch {
        setIsMaintenance(false);
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 60000);
    document.addEventListener('visibilitychange', checkMaintenance);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', checkMaintenance);
    };
  }, []);

  const exemptPaths = ['/super-ctrl-92k1x', '/login', '/forgot-password', '/reset-password', '/', '/partners', '/speakers', '/about'];
  if (exemptPaths.includes(pathname)) return null;

  if (!isMaintenance) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-[9998]">
      <div className="text-center max-w-lg mx-auto px-6">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
          <div className="relative w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border-2 border-red-500/30">
            <svg className="w-12 h-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">We'll Be Right Back</h1>
        <p className="text-lg text-slate-400 mb-6">{maintenanceMsg}</p>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Maintenance in progress</span>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRouter />
          <LogoutPopup />
          <MaintenanceGuard />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;