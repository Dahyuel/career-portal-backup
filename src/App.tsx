// Simplified App.tsx with mock authentication - No ProtectedRoute
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ResetPasswordForm } from './components/ResetPasswordForm';

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
const TeamLeaderDashboard = React.lazy(() => import('./pages/team/TeamLeaderDashboard').then(module => ({ default: module.TeamLeaderDashboard })));
const AdminPanel = React.lazy(() => import('./pages/admin/AdminPanel').then(module => ({ default: module.AdminPanel })));
const SuperAdminPanel = React.lazy(() => import('./pages/admin/SuperAdminPanel').then(module => ({ default: module.SuperAdminPanel })));
const EmployerRegistration = React.lazy(() => import('./pages/Employer/EmployerRegistration').then(module => ({ default: module.EmployerRegistration })));
const EmployerDashboard = React.lazy(() => import('./pages/Employer/EmployerDashboard').then(module => ({ default: module.EmployerDashboard })));

// Loading Screen
const LoadingScreen: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// Main App Router
const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth Routes - All public now */}
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

      {/* Dashboards - All publicly accessible now (no auth protection) */}
      <Route path="/attendee" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <AttendeeDashboard />
        </Suspense>
      } />
      <Route path="/regteam" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <RegTeamDashboard />
        </Suspense>
      } />
      <Route path="/buildteam" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <BuildTeamDashboard />
        </Suspense>
      } />
      <Route path="/volunteer" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <VolunteerDashboard />
        </Suspense>
      } />
      <Route path="/infodesk" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <InfoDeskDashboard />
        </Suspense>
      } />
      <Route path="/teamleader" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <TeamLeaderDashboard />
        </Suspense>
      } />
      <Route path="/secure-9821panel" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <AdminPanel />
        </Suspense>
      } />
      <Route path="/super-ctrl-92k1x" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <SuperAdminPanel />
        </Suspense>
      } />
      <Route path="/employer" element={
        <Suspense fallback={<LoadingScreen message="Loading dashboard..." />}>
          <EmployerDashboard />
        </Suspense>
      } />

      {/* Redirects */}
      <Route path="/register" element={<Navigate to="/auth-register" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRouter />
          <SmartAssistant />
          <Footer />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;