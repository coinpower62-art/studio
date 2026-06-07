
'use client';

import { login } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, Lock, User } from 'lucide-react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { LoginLogo } from '@/components/LoginLogo';

function AdminClientLoginForm() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <LoginLogo className="bg-blue-600 p-2" />
          <h1 className="text-2xl font-black text-slate-900">Admin <span className="text-blue-600">Client</span></h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">Authorized Personnel Only</p>
        </div>
        
        <form className="space-y-4" action={login}>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              className="w-full pl-10 h-12"
              name="email"
              placeholder="Admin Username / Email"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              className="w-full pl-10 h-12"
              type="password"
              name="password"
              placeholder="Password"
              required
            />
          </div>
          <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg">
            <ShieldCheck className="w-5 h-5 mr-2" />
            Secure Login
          </Button>
          
          {message && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs text-center">
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function AdminClientLoginPage() {
  return (
    <Suspense>
      <AdminClientLoginForm />
    </Suspense>
  );
}
