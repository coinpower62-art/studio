'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Loader } from 'lucide-react';

export default function AdminRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/admin/login');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white w-full">
      <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
        <Shield className="w-8 h-8 text-amber-500" />
      </div>
      <Loader className="w-6 h-6 animate-spin text-amber-500 mb-4 opacity-50" />
      <h1 className="text-xl font-bold tracking-tight">Authenticating Access</h1>
      <p className="text-slate-400 text-sm mt-1">Please wait while we redirect you to the admin portal.</p>
    </div>
  );
}