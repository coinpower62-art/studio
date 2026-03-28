"use client";
export const runtime = 'edge';

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Settings,
  Bell,
  Search,
  LogOut,
  User,
  Landmark,
  Info,
  Zap,
  Loader,
  Store,
  History,
  LayoutGrid,
  AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { logout } from '@/app/login/actions';
import TickerTape from "@/components/TickerTape";
import InstallBanner from "@/components/InstallBanner";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/bank", label: "Bank", icon: Landmark },
    { href: "/dashboard/market", label: "Market", icon: Store },
    { href: "/dashboard/power", label: "Power", icon: Zap },
    { href: "/dashboard/activity", label: "Activity", icon: History },
    { href: "/dashboard/about", label: "About", icon: Info },
];

function BottomNav() {
    const pathname = usePathname();
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-white p-1 md:hidden shadow-top">
            {navItems.map(function(item) {
                const isActive = pathname === item.href;
                return (
                    <Link href={item.href} key={item.href} className={`flex flex-col items-center justify-center text-center p-1 rounded-md w-16 h-14 transition-colors ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <item.icon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    );
}

function DashboardHeader({ user }: { user: SupabaseUser | null }) {
  const pathname = usePathname();
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
        return user.user_metadata.full_name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  }

  if (pathname !== '/dashboard') {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 px-4 text-white shadow-md md:hidden">
      <Logo className="[&>span]:text-white [&>svg]:text-white" />
      <div className="flex items-center gap-2">
         <Avatar className="h-8 w-8 border-2 border-white/50">
            <AvatarImage src={user?.user_metadata.avatar_url || undefined} />
            <AvatarFallback className="bg-amber-600 text-white font-bold">{getInitials()}</AvatarFallback>
        </Avatar>
        <form action={logout}>
            <button type="submit" className="p-2 rounded-full hover:bg-white/10">
              <LogOut className="h-5 w-5" />
            </button>
        </form>
      </div>
    </header>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = React.useState<SupabaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [profileError, setProfileError] = React.useState(false);

  React.useEffect(() => {
    const supabase = createClient();
    const checkUserAndProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      
      if (!profile) {
        // Profile doesn't exist, create it ("self-heal")
        const { error: createError } = await supabase.from('profiles').insert({
          id: user.id,
          full_name: user.user_metadata?.full_name,
          username: user.user_metadata?.username,
          email: user.email,
          country: user.user_metadata?.country,
          phone: user.user_metadata?.phone,
          balance: 1.00, // Default starting balance
          has_withdrawal_pin: false,
          referral_code: user.user_metadata?.referral_code,
          referred_by: user.user_metadata?.referred_by,
        });

        if (createError) {
          console.error("Fatal error: Could not create user profile.", createError);
          setProfileError(true);
          setLoading(false);
        } else {
          // Successfully created, now we can continue loading the app.
          // The profile now exists, so subsequent fetches in child components will succeed.
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    if (!pathname.startsWith('/admin')) {
      checkUserAndProfile();
    } else {
      setLoading(false);
    }
  }, [pathname, router]);

  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
        return user.user_metadata.full_name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  }

  if (pathname.startsWith('/admin')) {
    return (
      <div className="flex bg-slate-900">
        {children}
      </div>
    )
  }
  
  if (loading) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
  }

  if (profileError) {
    return (
       <div className="pt-12 p-4 pb-20 max-w-4xl mx-auto text-center flex flex-col items-center justify-center min-h-screen">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-bold text-destructive-foreground">User Profile Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
              We could not load or create your user profile. This is a critical error.
              Please try signing out and signing back in. If the problem persists, please contact support.
          </p>
          <form action={logout} className="mt-6">
              <Button variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
              </Button>
          </form>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
        <aside className="hidden md:flex md:flex-col md:w-64 md:border-r">
             <div className="flex items-center justify-center h-16 border-b">
                <Logo />
             </div>
             <nav className="flex-1 space-y-1 p-2">
                {navItems.map(function(item) {
                    const isActive = pathname === item.href;
                    return (
                        <Link href={item.href} key={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
             </nav>
        </aside>
        
        <div className="flex flex-col flex-1 overflow-hidden">
            <DashboardHeader user={user} />
            
            <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm md:flex">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search investments..."
                  className="w-full rounded-lg bg-secondary pl-8 md:w-[200px] lg:w-[320px]"
                />
              </div>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Toggle notifications</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata.avatar_url || undefined} />
                       <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logout} className="w-full">
                    <button type="submit" className="w-full">
                        <DropdownMenuItem>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </button>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </header>
            
            {pathname === '/dashboard' && <TickerTape />}

            <main className="flex-1 overflow-auto bg-[#f7f9f4] p-4 sm:p-6 pb-20 md:pb-6">
                {children}
            </main>

            <BottomNav />
            <InstallBanner />
        </div>
    </div>
  );
}
