import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations (*)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Error fetching profile with organization:', error.message);
        // Fallback to basic profile fetch if relation is not populated
        const { data: basicProfile } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        setUserProfile(basicProfile || { id: userId, role: 'customer', is_disabled: false });
      } else {
        setUserProfile(profile || { id: userId, role: 'customer', is_disabled: false });
        if (profile?.organization) {
          setOrganization(profile.organization);
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setUserProfile({ id: userId, role: 'customer', is_disabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        fetchProfile(newSession.user.id);
      } else {
        setUserProfile(null);
        setOrganization(null);
        setLoading(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // 3. Realtime Account Status Listener (Auto-lock if account disabled by Admin)
  useEffect(() => {
    if (!session?.user?.id) return;

    const userChannel = supabase
      .channel(`user-profile-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setUserProfile(prev => ({ ...prev, ...payload.new }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userChannel);
    };
  }, [session?.user?.id]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setOrganization(null);
  }, []);

  const value = {
    session,
    user: session?.user || null,
    profile: userProfile,
    role: userProfile?.role || 'customer',
    isAdmin: userProfile?.role === 'admin' || userProfile?.role === 'staff',
    isDisabled: Boolean(userProfile?.is_disabled),
    organization,
    loading,
    signOut,
    refreshProfile: () => session?.user && fetchProfile(session.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
