'use client';
export const runtime = 'edge';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground w-full">
      <Loader className="w-8 h-8 animate-spin text-primary mb-4" />
      <h1 className="text-xl font-bold">Redirecting...</h1>
      <p className="text-muted-foreground">Please wait while we take you to the login page.</p>
    </div>
  );
}
