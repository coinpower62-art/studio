'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('admin_logged_in') === 'true') {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Using a timeout to simulate async operation
    setTimeout(() => {
        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('admin_logged_in', 'true');
            toast({ title: 'Login successful!', description: 'Redirecting to dashboard...' });
            router.push('/admin/dashboard');
        } else {
            setError('Invalid username or password.');
        }
        setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 object-cover shadow-2xl mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-10 h-10 text-amber-400"/>
            </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm tracking-wider uppercase">CoinPower Admin</span>
          </div>
          <h1 className="text-2xl font-black text-white">Admin Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Authorized access only</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-xl px-3 py-2.5 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-slate-300 text-xs font-medium mb-1.5 block">Admin Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-admin-username"
                placeholder="admin"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="h-11 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 focus-visible:ring-amber-500/20"
              />
            </div>
            <div>
              <label className="text-slate-300 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-admin-password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-amber-500 focus-visible:ring-amber-500/20 pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              data-testid="button-admin-signin"
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg mt-2"
            >
              {isLoading ? "Signing in..." : "Sign In to Admin"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/signin" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
              ← Back to user login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
