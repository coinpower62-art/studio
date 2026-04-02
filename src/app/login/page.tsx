'use client';
export const runtime = 'edge';

import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Lock, CheckCircle } from 'lucide-react'
import Link from "next/link"
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation';
import { LoginLogo } from '@/components/LoginLogo';

function LoginComponent() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  const isSuccessMessage = message && (message.toLowerCase().includes('success') || message.toLowerCase().includes('bonus'));

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
               <LoginLogo />
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground"><span className="text-primary">Coin</span>Power</h1>
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
              <div className={`mt-4 flex items-start gap-3 rounded-lg p-4 text-sm ${
                  isSuccessMessage
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-destructive/10 text-destructive'
              }`}>
                {isSuccessMessage && <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />}
                <p className="leading-relaxed">{message}</p>
              </div>
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
