'use client';
export const runtime = 'edge';

import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Lock } from 'lucide-react'
import Link from "next/link"
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation';
import { LoginLogo } from '@/components/LoginLogo';

function LoginComponent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
               <LoginLogo />
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
                placeholder="Email address"
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
