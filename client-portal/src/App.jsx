import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/toast';
import Login from './components/Login';
import AdminLogin from './components/AdminLogin';
import CustomerPortal from './components/CustomerPortal';
import AdminDashboard from './components/AdminDashboard';
import { Loader2 } from 'lucide-react';

function AppRoutes() {
  const { session, profile, isAdmin, loading } = useAuth();

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
        {/* Client Login Page */}
        <Route 
          path="/" 
          element={
            !session ? (
              <Login />
            ) : isAdmin ? (
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

        {/* Dedicated Admin Login URL */}
        <Route 
          path="/admin/login" 
          element={
            !session ? (
              <AdminLogin />
            ) : isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/portal" replace />
            )
          } 
        />

        {/* Protected Customer Portal: Admins accessing /portal are automatically redirected to /admin */}
        <Route 
          path="/portal" 
          element={
            !session ? (
              <Navigate to="/" replace />
            ) : isAdmin ? (
              <Navigate to="/admin" replace />
            ) : (
              <CustomerPortal session={session} />
            )
          } 
        />
        
        {/* Protected Admin Dashboard: Clients accessing /admin are redirected to /portal */}
        <Route 
          path="/admin" 
          element={
            !session ? (
              <Navigate to="/admin/login" replace />
            ) : !isAdmin ? (
              <Navigate to="/portal" replace />
            ) : (
              <AdminDashboard session={session} />
            )
          } 
        />

        {/* Fallback Catch-all */}
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