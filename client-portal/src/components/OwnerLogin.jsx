import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { Crown, Loader2, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OwnerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) throw authError;

      // Verify that this account is the Platform Owner
      if (authData?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role, is_disabled')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.is_disabled) {
          await supabase.auth.signOut();
          throw new Error('This account has been disabled. Contact system support.');
        }

        if (!profile || profile.role !== 'owner') {
          await supabase.auth.signOut();
          throw new Error('Access Denied: This login is strictly restricted to the Platform Master Owner. Firm Administrators should sign in via /admin/login.');
        }

        toast.success('Owner Authenticated', 'Welcome to Master Owner Console.');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Invalid login credentials.');
      setError(errorMsg);
      toast.error('Owner Sign In Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-950 text-slate-100 font-sans">
      
      {/* Top Owner Branding */}
      <div className="flex flex-col items-center gap-2 mb-8 text-center">
        <div className="p-3 rounded-2xl bg-white shadow-xl border border-amber-500/30">
          <img 
            src="/taxshield-logo.jpg" 
            alt="Taxshield Advisor" 
            className="h-12 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-mono">
            Platform Master Owner
          </span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden">
        <div className="p-6 text-center border-b border-slate-800/80 bg-slate-950/40">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold mb-2 border border-amber-500/20">
            <Crown className="w-3.5 h-3.5" /> Super Admin Access
          </div>
          <h2 className="text-xl font-bold text-white">Owner Sign In</h2>
          <p className="text-xs text-slate-400 mt-1">
            Authenticate with your platform owner credentials to manage distributors and licenses.
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleOwnerLogin} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-medium flex items-center gap-2 animate-in shake">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Owner Email Address
              </Label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@taxshield.com"
                className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Master Password
              </Label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-10 text-xs font-bold gap-2 mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-950/50 transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating Owner...
                </>
              ) : (
                <>
                  Access Owner Console <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Discreet Client Portal Link */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs">
            <Link 
              to="/" 
              className="text-slate-500 hover:text-slate-400 transition-colors inline-flex items-center gap-1"
            >
              Client Financial Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
