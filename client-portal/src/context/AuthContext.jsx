import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLicenseExpired, setIsLicenseExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
      }

      if (profile) {
        setUserProfile(profile);

        // If platform owner, fetch primary system organization
        if (profile.role === 'owner') {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', '00000000-0000-0000-0000-000000000001')
            .maybeSingle();
          setOrganization(orgData || null);
          setIsLicenseExpired(false);
        } else if (profile.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .maybeSingle();
          setOrganization(orgData || null);
          
          let expired = false;
          if (orgData?.expires_at && profile.role !== 'distributor' && profile.role !== 'owner') {
            try {
              expired = new Date(orgData.expires_at).getTime() < new Date().getTime();
            } catch {
              expired = false;
            }
          }
          setIsLicenseExpired(expired);
        } else {
          setOrganization(null);
          setIsLicenseExpired(false);
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
      setUserProfile({ id: userId, role: 'customer', is_disabled: false });
      setOrganization(null);
      setIsLicenseExpired(false);
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

  // 3. Realtime Account & Organization Sync (Live updates on role, organization, and permissions)
  useEffect(() => {
    if (!session?.user?.id) return;

    const userChannel = supabase
      .channel(`user-profile-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${session.user.id}`,
        },
        () => {
          fetchProfile(session.user.id);
        }
      )
      .subscribe();

    const orgId = userProfile?.organization_id;
    let orgChannel = null;

    if (orgId) {
      orgChannel = supabase
        .channel(`org-sync-${orgId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'organizations',
            filter: `id=eq.${orgId}`,
          },
          () => {
            fetchProfile(session.user.id);
          }
        )
        .subscribe();
    }

    // Auto-refresh when user switches back to this browser tab (tab visibility only)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && session?.user?.id) {
        fetchProfile(session.user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(userChannel);
      if (orgChannel) supabase.removeChannel(orgChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user?.id, userProfile?.organization_id, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setOrganization(null);
  }, []);

  const role = userProfile?.role || session?.user?.user_metadata?.role || 'customer';
  const isOwner = role === 'owner';
  const isDistributor = role === 'distributor' || role === 'owner';
  const isAdmin = role === 'admin' || role === 'distributor' || role === 'staff' || isOwner;
  const isBuyer = role === 'admin';

  const isAccessSuspended = Boolean(
    userProfile?.is_disabled || 
    (!isOwner && !isDistributor && organization?.is_disabled) || 
    (!isOwner && !isDistributor && isLicenseExpired)
  );

  const features = {
    invoices: organization?.feature_invoices !== false,
    documents: isDistributor ? true : organization?.feature_documents !== false,
    workTracker: isDistributor ? true : (organization?.feature_work_tracker !== false),
    sellLicenses: isDistributor || isOwner,
    companySettings: true,
    downwardVisibility: isDistributor || isOwner,
  };

  const value = {
    session,
    user: session?.user || null,
    profile: userProfile,
    role,
    isOwner,
    isDistributor,
    isAdmin,
    isBuyer,
    features,
    maxLicenses: organization?.max_licenses || 25,
    isDisabled: isAccessSuspended,
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
