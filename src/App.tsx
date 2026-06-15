import { X } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { useAppSettings } from './hooks/useAppSettings';
import { Toaster } from 'sonner';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Videos from './components/Videos';
import Notes from './components/Notes';
import LiveClasses from './components/LiveClasses';
import MockTests from './components/MockTests';
import TakeTest from './components/TakeTest';
import Chat from './components/Chat';
import AdminPanel from './components/AdminPanel';
import Contact from './components/Contact';
import ProfileSetup from './components/ProfileSetup';
import WelcomeOverlay from './components/WelcomeOverlay';
import PermissionSection from './components/PermissionSection';
import AuthAction from './components/AuthAction';

function PrivateRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isAdmin, isBlocked } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );

  if (isBlocked) return (
    <div className="flex items-center justify-center h-screen bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 p-8 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-center shadow-xl">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <X className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Account Blocked</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8">Your account has been blocked by the administrator. Please contact support if you believe this is a mistake.</p>
        <button 
          onClick={() => window.location.href = '/contact'}
          className="w-full py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all"
        >
          Contact Support
        </button>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/auth" />;
  
  // If profile is not completed and user is not admin, redirect to profile setup
  if (!isAdmin && !profile?.profileCompleted && window.location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
}

export default function App() {
  useAppSettings();
  const [stage, setStage] = useState<'welcome' | 'permissions' | 'app'>(() => {
    if (typeof window !== 'undefined') {
      // If we are on an auth action or auth page, skip onboarding
      const path = window.location.pathname;
      if (path.startsWith('/auth')) return 'app';

      const saved = localStorage.getItem('onboarding_completed');
      if (saved === 'true') return 'app';
    }
    return 'welcome';
  });

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setStage('app');
  };

  return (
    <AuthProvider>
      <Toaster position="top-center" richColors />
      <Router>
        {stage === 'welcome' && (
          <WelcomeOverlay onComplete={() => setStage('permissions')} />
        )}
        {stage === 'permissions' && (
          <PermissionSection onComplete={completeOnboarding} />
        )}
        {stage === 'app' && (
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/action" element={<AuthAction />} />
            <Route path="/profile-setup" element={
              <PrivateRoute>
                <ProfileSetup />
              </PrivateRoute>
            } />
            <Route path="/" element={
              <PrivateRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/videos" element={
              <PrivateRoute>
                <Layout>
                  <Videos />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/notes" element={
              <PrivateRoute>
                <Layout>
                  <Notes />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/live" element={
              <PrivateRoute>
                <Layout>
                  <LiveClasses />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/mock-tests" element={
              <PrivateRoute>
                <Layout>
                  <MockTests />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/take-test/:testId" element={
              <PrivateRoute>
                <Layout>
                  <TakeTest />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/chat" element={
              <PrivateRoute>
                <Layout>
                  <Chat />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/admin" element={
              <PrivateRoute adminOnly>
                <Layout>
                  <AdminPanel />
                </Layout>
              </PrivateRoute>
            } />
            <Route path="/contact" element={
              <PrivateRoute>
                <Layout>
                  <Contact />
                </Layout>
              </PrivateRoute>
            } />
          </Routes>
        )}
      </Router>
    </AuthProvider>
  );
}
