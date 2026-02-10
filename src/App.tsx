// App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute'; // Import ProtectedRoute
import { ResetPasswordForm } from './components/ResetPasswordForm';
import DashboardLoading from './components/DashboardLoading';

// Auth Components
import { LoginForm } from './components/LoginForm';
import { ForgotPasswordForm } from './components/ForgotPasswordForm';
import { UnifiedAttendeeRegistration } from './components/UnifiedAttendeeRegistration';
import { UnifiedVolunteerRegistration } from './components/UnifiedVolunteerRegistration';
import { LandingPage } from './components/LandingPage';
import { SmartAssistant } from './components/shared/SmartAssistant';
import { Footer } from './components/shared/Footer';

// Lazy load dashboards
const AttendeeDashboard = React.lazy(() => import('./pages/user/AttendeeDashboard'));
const VolunteerDashboard = React.lazy(() => import('./pages/volunteer/VolunteerDashboard').then(module => ({ default: module.VolunteerDashboard })));
const RegTeamDashboard = React.lazy(() => import('./pages/team/RegTeamDashboard').then(module => ({ default: module.RegTeamDashboard })));
const BuildTeamDashboard = React.lazy(() => import('./pages/team/BuildTeamDashboard').then(module => ({ default: module.BuildTeamDashboard })));
const InfoDeskDashboard = React.lazy(() => import('./pages/team/InfoDeskDashboard').then(module => ({ default: module.InfoDeskDashboard })));
const VerificationDashboard = React.lazy(() => import('./pages/team/VerificationDashboard').then(module => ({ default: module.VerificationDashboard })));
const TeamLeaderDashboard = React.lazy(() => import('./pages/team/TeamLeaderDashboard').then(module => ({ default: module.TeamLeaderDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const SuperAdminPanel = React.lazy(() => import('./pages/admin/SuperAdminPanel').then(module => ({ default: module.SuperAdminPanel })));
const EmployerRegistration = React.lazy(() => import('./pages/Employer/EmployerRegistration').then(module => ({ default: module.EmployerRegistration })));
const EmployerDashboard = React.lazy(() => import('./pages/Employer/EmployerDashboard').then(module => ({ default: module.EmployerDashboard })));
const AboutCareerCenter = React.lazy(() => import('./pages/LandingPageContent/AboutCareerCenter').then(module => ({ default: module.AboutCareerCenter })));
const Speakers = React.lazy(() => import('./pages/LandingPageContent/Speakers').then(module => ({ default: module.Speakers })));
const Agenda = React.lazy(() => import('./pages/LandingPageContent/Agenda').then(module => ({ default: module.Agenda })));

// Loading Screen
const LoadingScreen: React.FC<{ message?: string }> = () => (
  <DashboardLoading />
);

// Main App Router
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <AboutCareerCenter />
        </Suspense>
      } />
      <Route path="/speakers" element={
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Speakers />
        </Suspense>
      } />
      <Route path="/agenda" element={
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Agenda />
        </Suspense>
      } />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginForm />} />
      <Route path="/forgot-password" element={<ForgotPasswordForm />} />
      <Route path="/reset-password" element={<ResetPasswordForm />} />
      <Route path="/employerreg" element={
        <Suspense fallback={<LoadingScreen message="Loading registration form..." />}>
          <EmployerRegistration />
        </Suspense>
      } />

      {/* Registration Forms */}
      <Route path="/attendee-register" element={<UnifiedAttendeeRegistration />} />
      <Route path="/V0lunt33ringR3g" element={<UnifiedVolunteerRegistration />} />

      {/* Protected Dashboards */}
      <Route path="/attendee" element={
        <ProtectedRoute requiredRole="attendee">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <AttendeeDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/registration" element={
        <ProtectedRoute requiredRole="registration">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <RegTeamDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/building" element={
        <ProtectedRoute requiredRole="building">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <BuildTeamDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/volunteer" element={
        <ProtectedRoute requiredRole="volunteer">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <VolunteerDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/info-desk" element={
        <ProtectedRoute requiredRole="info_desk">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <InfoDeskDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/verification" element={
        <ProtectedRoute requiredRole="verification">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <VerificationDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/team-leader" element={
        <ProtectedRoute requiredRole="team_leader">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <TeamLeaderDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/secure-9821panel" element={
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <AdminPanel />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/super-ctrl-92k1x" element={
        <ProtectedRoute requiredRole={['super_admin', 'sadmin']}> {/* Handle both potential role names */}
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <SuperAdminPanel />
          </Suspense>
        </ProtectedRoute>
      } />

      <Route path="/employer" element={
        <ProtectedRoute requiredRole="employer">
          <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
            <EmployerDashboard />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* Redirects */}
      <Route path="/register" element={<Navigate to="/attendee-register" replace />} />

      {/* Fallback for old paths if any */}
      <Route path="/regteam" element={<Navigate to="/registration" replace />} />
      <Route path="/buildteam" element={<Navigate to="/building" replace />} />
      <Route path="/infodesk" element={<Navigate to="/info-desk" replace />} />
      <Route path="/teamleader" element={<Navigate to="/team-leader" replace />} />
      <Route path="/employer-dashboard" element={<Navigate to="/employer" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
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

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRouter />
          <LogoutPopup />
          <SmartAssistant />
          <Footer />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;