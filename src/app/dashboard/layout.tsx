"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
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
  LifeBuoy,
  LayoutGrid
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
import { UserStoreProvider } from "@/hooks/use-user-store";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import Link from "next/link";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/dashboard/bank", label: "Bank", icon: Landmark },
    { href: "/dashboard/market", label: "Market", icon: Store },
    { href: "/dashboard/power", label: "Power", icon: Zap },
    { href: "/dashboard/activity", label: "Activity", icon: History },
    { href: "/dashboard/about", label: "About", icon: Info },
    { href: "/dashboard/support", label: "Support", icon: LifeBuoy },
];

function BottomNav() {
    const pathname = usePathname();
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t bg-white p-1 md:hidden shadow-top">
            {navItems.map(item => {
                const isActive = pathname === item.href;
                return (
                    <Link href={item.href} key={item.href} className={`flex flex-col items-center justify-center text-center p-1 rounded-md w-16 h-14 transition-colors ${isActive ? 'text-green-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <item.icon className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                )
            })}
        </nav>
    );
}

function DashboardHeader() {
  const router = useRouter();
  const auth = useAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push("/signin");
  };

  const getInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      const initials = names.map(n => n[0]).join('');
      return initials.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-gradient-to-r from-green-800 via-green-700 to-green-600 px-4 text-white shadow-md md:hidden">
      <Logo className="[&>span]:text-white [&>svg]:text-white" />
      <div className="flex items-center gap-2">
         <Avatar className="h-8 w-8 border-2 border-green-400">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-green-600 text-white font-bold">{getInitials()}</AvatarFallback>
        </Avatar>
        <button onClick={handleLogout} className="p-2 rounded-full hover:bg-white/10">
          <LogOut className="h-5 w-5" />
        </button>
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
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  React.useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    if (!isUserLoading && !user) {
      router.push("/signin");
    }
  }, [isUserLoading, user, router, pathname]);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    router.push("/signin");
  };

  if (pathname.startsWith('/admin')) {
    return (
      <div className="flex bg-slate-900">
        {children}
      </div>
    )
  }

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <UserStoreProvider>
        <div className="flex min-h-screen">
            {/* --- Desktop Sidebar (unchanged) --- */}
            <aside className="hidden md:flex md:flex-col md:w-64 md:border-r">
                 <div className="flex items-center justify-center h-16 border-b">
                    <Logo />
                 </div>
                 <nav className="flex-1 space-y-1 p-2">
                    {navItems.map(item => {
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
            
            <div className="flex flex-col flex-1">
                {/* --- Mobile Header --- */}
                <DashboardHeader />
                
                {/* --- Desktop Header (from original layout) --- */}
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
                          <AvatarImage src={user?.photoURL || undefined} />
                           <AvatarFallback>{user?.email?.[0].toUpperCase()}</AvatarFallback>
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
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </header>

                <main className="flex-1 overflow-auto bg-[#f7f9f4] p-4 sm:p-6 pb-20 md:pb-6">
                    {children}
                </main>

                {/* --- Mobile Bottom Nav --- */}
                <BottomNav />
            </div>
        </div>
    </UserStoreProvider>
  );
}
