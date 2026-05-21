'use client';

import { adminLogin } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Shield, Lock, AlertTriangle } from 'lucide-react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation';
import { LoginLogo } from '@/components/LoginLogo';

function AdminLoginComponent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
               <div className="w-16 h-16 rounded-2xl bg-amber-500 mx-auto mb-4 flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
               </div>
              <h1 className="text-2xl font-black text-white">Admin Portal</h1>
              <p className="text-slate-400 mt-1 text-sm font-medium">Restricted Access Area</p>
            </div>
            <form
              className="animate-in flex flex-col w-full justify-center gap-4"
              action={adminLogin}
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Username</label>
                <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      className="w-full pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500"
                      name="email"
                      placeholder="Username"
                      required
                    />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Admin Password</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <Input
                      className="w-full pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-amber-500"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      required
                    />
                </div>
              </div>
              <Button className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black h-11 mt-2">
                Authorize Access
              </Button>
              {message && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{message}</p>
                </div>
              )}
            </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginComponent />
    </Suspense>
  );
}