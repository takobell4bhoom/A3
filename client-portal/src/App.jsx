import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import CustomerPortal from './components/CustomerPortal';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRole(session.user.id);
      else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRole = async (userId) => {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    setUserRole(data?.role || 'customer');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500 font-medium">
        Authenticating session...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={
            !session ? (
              <Login />
            ) : userRole === 'admin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/portal" />
            )
          } 
        />
        
        <Route 
          path="/portal" 
          element={session ? <CustomerPortal session={session} /> : <Navigate to="/" />} 
        />
        
        <Route 
          path="/admin" 
          element={session ? <AdminDashboard session={session} /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}