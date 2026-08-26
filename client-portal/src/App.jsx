import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/toast';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import OwnerLogin from './components/OwnerLogin';
import CustomerPortal from './components/CustomerPortal';
import AdminDashboard from './components/AdminDashboard';
import OwnerDashboard from './components/owner/OwnerDashboard';
import { Loader2 } from 'lucide-react';

/**
 * Secret Platform Owner Path (Obfuscated and never publicly linked or auto-routed).
 * Configurable via VITE_OWNER_SECRET_PATH environment variable.
 */
const OWNER_SECRET_PATH = import.meta.env.VITE_OWNER_SECRET_PATH || '/sys-ctrl-9x8q2';

function AppRoutes() {
  const { session, profile, isAdmin, isOwner, loading } = useAuth();

  // Ensure routing waits until the user's role profile has finished loading from Supabase
  if (loading || (session && !profile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 font-medium gap-3 bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm">Verifying authorized session & permissions...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Client Login Page (Never auto-routes to owner secret path) */}
        <Route 
          path="/" 
          element={
            !session ? (
              <Login />
            ) : (isAdmin || isOwner) ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/portal" replace />
            )
          } 
        />

        {/* Alias for Client Login */}
        <Route 
          path="/login" 
          element={<Navigate to="/" replace />} 
        />

        {/* Dedicated Firm / Distributor Login URL (Never auto-routes to owner secret path) */}
        <Route 
          path="/admin/login" 
          element={
            !session ? (
              <AdminLogin />
            ) : (
              <Navigate to="/admin" replace />
            )
          } 
        />

        {/* Firm / Distributor Dashboard Route (Owner & Admins both have full access here) */}
        <Route 
          path="/admin" 
          element={
            !session ? (
              <Navigate to="/admin/login" replace />
            ) : (!isAdmin && !isOwner) ? (
              <Navigate to="/portal" replace />
            ) : (
              <AdminDashboard session={session} />
            )
          } 
        />

        {/* Customer Portal Route */}
        <Route 
          path="/portal" 
          element={
            !session ? (
              <Navigate to="/" replace />
            ) : (
              <CustomerPortal session={session} />
            )
          } 
        />

        {/* 
          🔒 OBFUSCATED SECRET PLATFORM OWNER ROUTE
          Only accessible by directly entering the secret URL in the browser address bar.
          Never linked publicly and never auto-routed to by standard login forms.
        */}
        <Route 
          path={OWNER_SECRET_PATH} 
          element={
            !session ? (
              <OwnerLogin />
            ) : !isOwner ? (
              <Navigate to="/admin" replace />
            ) : (
              <OwnerDashboard session={session} />
            )
          } 
        />

        {/* Fallback Catch-all (Handles /owner, /owner/login, or unknown URLs by redirecting to home) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ToastProvider>
  );
}