import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { 
  Crown, Loader2, Lock, Mail, Eye, EyeOff, 
  ArrowRight, ShieldAlert, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function OwnerLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-50 font-sans text-slate-900">
      
      {/* Top Owner Branding */}
      <div className="flex flex-col items-center gap-2 mb-6 text-center">
        <div className="p-3.5 rounded-2xl bg-white shadow-md border border-amber-300 shadow-amber-100/50 transition-transform hover:scale-105 duration-200">
          <img 
            src="/taxshield-logo.jpg" 
            alt="Taxshield Advisor" 
            className="h-12 sm:h-14 w-auto object-contain" 
          />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-mono shadow-xs">
            👑 Platform Master Owner
          </span>
        </div>
      </div>

      {/* Main Login Card (White App Pattern) */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1.5 pb-1">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Crown className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Master Owner Sign In</h2>
          <p className="text-xs text-slate-500">
            Authenticate with master credentials to manage multi-tenant distributors and platform licenses.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-rose-700 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 animate-in shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleOwnerLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Master Owner Email
            </Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@taxshield.com"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Master Password
            </Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-10 text-xs font-bold gap-2 mt-2 bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transition-all rounded-xl" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating Master Owner...
              </>
            ) : (
              <>
                Access Owner Console <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Restricted Super-Admin Console Protocol</span>
        </div>
      </div>

      {/* Discreet Client Portal Link */}
      <div className="mt-6 text-center">
        <Link 
          to="/" 
          className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-semibold"
        >
          Return to Client Portal <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Footer support note */}
      <p className="mt-4 text-[11px] text-slate-400 text-center max-w-sm">
        Super-Administrator access only. All actions are cryptographically logged.
      </p>
    </div>
  );
}
