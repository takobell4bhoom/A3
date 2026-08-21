import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { ShieldCheck, Building2, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      
      if (authError) {
        setError(authError.message);
        toast.error('Authentication Failed', authError.message);
      } else {
        toast.success('Signed In', 'Welcome back to your client portal.');
      }
    } catch (err) {
      setError(err.message);
      toast.error('Sign In Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-50 font-sans">
      
      {/* Top Firm Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-lg">
          <Building2 className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Tax Shield Advisor</h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Client Financial Portal</p>
        </div>
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md border-slate-200 shadow-xl bg-white">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-slate-900">Client Sign In</CardTitle>
          <CardDescription>
            Access your secure tax documents, payment schedules, and status tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Client Email</Label>
              <Input 
                type="email" 
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 text-xs border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-900"
                required 
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-xs border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-slate-900"
                required 
              />
            </div>

            {error && (
              <div className="p-3 text-xs font-medium text-red-600 rounded-lg bg-red-50 border border-red-100">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              variant="accent"
              className="w-full h-10 text-xs font-semibold mt-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Authenticating...
                </>
              ) : (
                "Secure Client Sign In"
              )}
            </Button>
          </form>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-5 border-t border-slate-100 text-[11px] font-medium text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit Encrypted Document Transfer Protocol</span>
          </div>
        </CardContent>
      </Card>

      {/* Switch to Admin Login Link */}
      <div className="mt-6 text-center">
        <Link 
          to="/admin/login" 
          className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1 font-semibold"
        >
          Firm Staff or Advisor? Access Admin Console <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Footer support note */}
      <p className="mt-4 text-[11px] text-slate-400 text-center">
        Need assistance accessing your tax documents? Contact your account administrator.
      </p>
    </div>
  );
}