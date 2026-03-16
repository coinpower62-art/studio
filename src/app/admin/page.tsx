'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (localStorage.getItem('admin_logged_in') === 'true') {
      router.push('/admin/dashboard');
    }
  }, [router]);

  const handleLogin = () => {
    if (username === 'admin' && password === 'coinpower2026') {
      localStorage.setItem('admin_logged_in', 'true');
      toast({ title: 'Login successful!', description: 'Redirecting to dashboard...' });
      router.push('/admin/dashboard');
    } else {
      setError('Invalid username or password.');
      toast({ variant: 'destructive', title: 'Login Failed', description: 'Invalid username or password.' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-sm bg-slate-800 border-slate-700 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl font-black">Admin Panel</CardTitle>
          <CardDescription className="text-slate-400">Sign in to manage CoinPower</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-semibold">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-slate-400 text-xs font-semibold">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handleLogin} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 text-white font-bold">
            <Lock className="w-4 h-4 mr-2" />
            Sign In Securely
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
