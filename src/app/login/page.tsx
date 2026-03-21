'use client';

import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Lock } from 'lucide-react'
import Link from "next/link"
import Image from 'next/image'
import { PlaceHolderImages } from '@/lib/placeholder-images'
import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useSearchParams } from 'next/navigation';

function LoginComponent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const placeholderLogo = PlaceHolderImages.find((p) => p.id === 'signup-logo');

  useEffect(() => {
    const supabase = createClient();
    const fetchLogo = async () => {
      const { data, error } = await supabase
        .from('media')
        .select('url')
        .eq('id', 'app-logo')
        .single();
      
      if (data?.url) {
        setLogoUrl(data.url);
      } else {
        setLogoUrl(placeholderLogo?.imageUrl || '');
      }
    };
    fetchLogo();
  }, [placeholderLogo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
               {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="CoinPower Logo"
                    width={64}
                    height={64}
                    className="mx-auto mb-3 rounded-2xl object-cover shadow-2xl"
                    data-ai-hint={placeholderLogo?.imageHint}
                  />
                ) : (
                  <Skeleton className="mx-auto mb-3 h-16 w-16 rounded-2xl" />
                )}
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Coin<span className="text-primary">Power</span></h1>
              <p className="text-muted-foreground mt-1 text-sm font-medium">Sign in to access your dashboard</p>
            </div>
            <form
            className="animate-in flex flex-col w-full justify-center gap-4 text-foreground"
            action={login}
            >
            <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                className="w-full pl-10"
                name="email"
                placeholder="Username or Email"
                required
                />
            </div>
            <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                className="w-full pl-10"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                />
            </div>
            <Button>Sign In</Button>
            {message && (
                <p className="mt-4 p-4 bg-destructive/10 text-destructive text-center rounded-lg">
                {message}
                </p>
            )}
            <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Sign up
                </Link>
            </p>
            </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginComponent />
    </Suspense>
  );
}
