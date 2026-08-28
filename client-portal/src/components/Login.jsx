import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';
import { 
  ShieldCheck, Loader2, ArrowRight, Lock, Mail, 
  Eye, EyeOff, ShieldAlert 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (authError) throw authError;
      toast.success('Signed In', 'Welcome back to your client portal.');
    } catch (err) {
      const errorMsg = err?.message || 'Invalid client email or password.';
      setError(errorMsg);
      toast.error('Authentication Failed', errorMsg);
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
          <span className="px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
            Client Financial Portal
          </span>
        </div>
      </div>

      {/* Main Login Card (White App Pattern) */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 shadow-xl rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-1.5 pb-1">
          <h2 className="text-xl font-bold text-slate-900">Client Sign In</h2>
          <p className="text-xs text-slate-500">
            Access your tax filings, itemized invoices, and secure documents.
          </p>
        </div>

        {error && (
          <div className="p-3 text-xs font-medium text-rose-700 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 animate-in shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Client Email Address</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="email" 
                placeholder="client@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                required 
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
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
            className="w-full h-10 text-xs font-bold gap-2 mt-2 bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all rounded-xl" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Secure Client Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>256-bit Encrypted Banking Grade Protocol</span>
        </div>
      </div>

      {/* Switch to Admin Login Link */}
      <div className="mt-6 text-center">
        <Link 
          to="/admin/login" 
          className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-semibold"
        >
          Firm Staff or Advisory Partner? Access Admin Console <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Client Provisioning Note */}
      <p className="mt-4 text-[11px] text-slate-400 text-center max-w-sm">
        Client accounts are provisioned directly by your tax advisor. Need access? Contact your account administrator.
      </p>
    </div>
  );
}