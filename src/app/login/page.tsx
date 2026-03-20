import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Lock } from 'lucide-react'
import Link from "next/link"

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { message: string }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold">Welcome Back</h1>
                <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
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
            {searchParams?.message && (
                <p className="mt-4 p-4 bg-destructive/10 text-destructive text-center rounded-lg">
                {searchParams.message}
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
