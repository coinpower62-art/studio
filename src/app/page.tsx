'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SplashIcon } from '@/components/splash-icon';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/signup');
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-splash-gradient text-white">
      <SplashIcon />
      <h1 className="text-5xl font-bold mt-8">
        <span className="text-white">Coin</span>
        <span className="text-primary">Power</span>
      </h1>
      <p className="mt-1 text-lg font-light text-gray-200/90">
        Digital Energy Mining Platform
      </p>
      <div className="flex space-x-2 mt-20">
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 bg-primary rounded-full animate-bounce"></div>
      </div>
    </div>
  );
}
