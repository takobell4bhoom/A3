import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, Building2, Loader2, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) throw authError;

      // Verify that this account is an administrator / staff member
      if (authData?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, is_disabled')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.is_disabled) {
          await supabase.auth.signOut();
          throw new Error('This administrator account has been disabled. Contact system support.');
        }

        if (profile && profile.role !== 'admin' && profile.role !== 'staff') {
          // Client attempted to log into the admin URL
          await supabase.auth.signOut();
          throw new Error('Access Denied: This login portal is restricted to Firm Administrators. Please sign in via the Client Portal.');
        }

        toast.success('Admin Authenticated', 'Welcome to Tax Shield Advisor Management Console.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
      toast.error('Admin Sign In Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-950 text-slate-100 font-sans">
      
      {/* Top Firm Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 rounded-2xl bg-slate-900 text-emerald-400 border border-slate-800 shadow-2xl">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white">Tax Shield Advisor</h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
              Admin
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Firm Management Console</p>
        </div>
      </div>

      {/* Main Admin Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center mx-auto mb-2">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-white">Administrator Sign In</h2>
          <p className="text-xs text-slate-400">
            Enter authorized staff credentials to access firm client management, documents, and billing ledger.
          </p>
        </div>

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Staff Email Address</Label>
            <input 
              type="email" 
              placeholder="advisor@taxshield.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required 
            />
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Security Password</Label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
              required 
            />
          </div>

          {error && (
            <div className="p-3 text-xs font-medium text-red-400 rounded-lg bg-red-950/50 border border-red-800/80 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button 
            type="submit" 
            variant="accent"
            className="w-full h-11 text-xs font-bold mt-2" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Verifying Security Token...
              </>
            ) : (
              "Sign In to Admin Console"
            )}
          </Button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-800 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Restricted Admin Route (Role-Based RLS Protected)</span>
        </div>
      </div>

      {/* Switch to Client Login Link */}
      <div className="mt-6 text-center">
        <Link 
          to="/" 
          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-medium"
        >
          Looking for the Client Portal? Go to Client Sign In <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
