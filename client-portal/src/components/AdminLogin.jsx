import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { 
  ShieldCheck, Loader2, Lock, Mail, Eye, EyeOff, 
  ArrowRight, ShieldAlert, Building2 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

        const allowedRoles = ['admin', 'staff', 'distributor', 'owner'];
        if (profile && !allowedRoles.includes(profile.role)) {
          // Client attempted to log into the admin URL
          await supabase.auth.signOut();
          throw new Error('Access Denied: This login portal is restricted to Firm Administrators and Partners. Please sign in via the Client Portal.');
        }

        toast.success('Authenticated', 'Welcome to Tax Shield Advisor Management Console.');
      }
    } catch (err) {
      const errorMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Invalid login credentials.');
      setError(errorMsg);
      toast.error('Admin Sign In Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-50 font-sans text-slate-900">
      
      {/* Top Firm Branding */}
      <div className="flex flex-col items-center gap-2 mb-6 text-center">
        <div className="p-3.5 rounded-2xl bg-white shadow-md border border-slate-200/80 transition-transform hover:scale-105 duration-200">
          <img 
            src="/taxshield-logo.jpg" 
            alt="Taxshield Advisor" 
            className="h-12 sm:h-14 w-auto object-contain" 
          />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
            Enterprise Admin Console
          </span>
        </div>
      </div>

      {/* Main Admin Login Card (White App Pattern) */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1.5 pb-1">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Administrator Sign In</h2>
          <p className="text-xs text-slate-500">
            Enter authorized credentials to access firm client workspace, documents, and billing ledger.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-rose-700 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 animate-in shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Staff Email Address</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                placeholder="advisor@taxshield.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                required 
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Security Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
                required 
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
            variant="accent"
            className="w-full h-10 text-xs font-bold gap-2 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all rounded-xl" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying Security Token...
              </>
            ) : (
              <>
                Sign In to Admin Console <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Restricted Admin Route (Role-Based RLS Protected)</span>
        </div>
      </div>

      {/* Switch to Client Login Link */}
      <div className="mt-6 text-center">
        <Link 
          to="/" 
          className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-semibold"
        >
          Looking for the Client Portal? Go to Client Sign In <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Footer support note */}
      <p className="mt-4 text-[11px] text-slate-400 text-center max-w-sm">
        Internal enterprise access only. Unauthorized attempts are logged.
      </p>
    </div>
  );
}
