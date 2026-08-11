import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Lock, Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-50">
      
      {/* Top Firm Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 rounded-xl bg-brand-primary text-white shadow-lg">
          <Building2 className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Taxshield Advisor</h1>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Client Financial Portal</p>
        </div>
      </div>

      {/* Main Login Card */}
      <Card className="w-full max-w-md border-slate-200">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold">Sign in to your account</CardTitle>
          <CardDescription>
            Access your secure tax documents, payment schedules, and status tracker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Work or Personal Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@firm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-slate-200 focus:border-slate-900"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-slate-200 focus:border-slate-900"
                required 
              />
            </div>

            {error && (
              <div className="p-3 text-sm font-medium text-red-600 rounded-lg bg-red-50 border border-red-100">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-base font-medium" disabled={loading}>
              {loading ? "Authenticating..." : "Secure Sign In"}
            </Button>
          </form>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-slate-100 text-xs font-medium text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>256-bit Encrypted Document Transfer Protocol</span>
          </div>
        </CardContent>
      </Card>

      {/* Footer support note */}
      <p className="mt-8 text-xs text-slate-400 text-center">
        Need assistance accessing your tax documents? Contact your account administrator.
      </p>
    </div>
  );
}