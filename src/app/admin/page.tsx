
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function AdminRedirectPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white w-full">
      <Loader className="w-8 h-8 animate-spin text-amber-400 mb-4" />
      <h1 className="text-xl font-bold">Redirecting to Login</h1>
      <p className="text-slate-400">Please use the main login page.</p>
    </div>
  );
}
