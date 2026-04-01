'use client';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { logout } from '@/app/login/actions';

// Icons and components
import { LogOut, Share2, Copy, Play, ChevronRight, Globe } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InstallButton from '@/components/InstallButton';
import { Skeleton } from '@/components/ui/skeleton';

// Define profile type
type Profile = {
    id: string;
    created_at: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    country: string | null;
    balance: number;
    referral_code: string | null;
};

function DashboardSkeleton() {
    return (
        <div className="space-y-5">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-14 rounded-xl" />
        </div>
    )
}

export default function DashboardPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeGeneratorCount, setActiveGeneratorCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        const [profileResult, rentedGeneratorsResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
        ]);

        const { data: profileData, error: profileError } = profileResult;
        if (profileError || !profileData) {
            toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
            router.push('/login');
            return;
        }
        setProfile(profileData);

        const { data: rentedData } = rentedGeneratorsResult;
        if (rentedData) {
            const now = new Date().getTime();
            const activeCount = rentedData.filter(g => g.expires_at && new Date(g.expires_at).getTime() > now).length;
            setActiveGeneratorCount(activeCount);
        }

        setLoading(false);
    }, [router, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const siteUrl = "https://coinpower-app.vercel.app";
    const referralLink = profile?.referral_code ? `${siteUrl}/signup?ref=${profile.referral_code}` : null;

    const copyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            toast({
                title: "Referral link copied!",
                description: "You can now share it with your friends.",
            });
        }
    };

    if (loading || !profile || !user) {
        return <DashboardSkeleton />;
    }

    const nameForInitials = profile?.full_name || user.email || "";
    const initials = nameForInitials.split(' ').map((n) => n[0] || '').join('').toUpperCase().slice(0, 2) || '??';

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-4">
                    <h3 className="font-bold text-white text-sm sm:text-base">Your Profile</h3>
                    <p className="text-amber-100 text-xs">Personal investment overview</p>
                </div>

                <div className="p-4 sm:p-5 space-y-5">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-amber-300 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-green-400 to-amber-600 text-white font-bold text-lg sm:text-xl">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 pt-0.5">
                                <p className="font-bold text-gray-900 text-lg sm:text-xl truncate">{profile.full_name || profile.username}</p>
                                <p className="text-gray-500 text-xs sm:text-sm truncate">{user.email}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-500">{profile.country}</span>
                                    <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-0">Active</Badge>
                                </div>
                            </div>
                        </div>
                        <form action={logout}>
                            <Button variant="outline" size="sm" className="h-auto px-3 py-2 border-gray-200 hover:bg-gray-100 flex-shrink-0">
                                <LogOut className="w-4 h-4 mr-2" />
                                <span>Log out</span>
                            </Button>
                        </form>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: "Balance", value: `$${profile.balance.toFixed(2)}`, color: "text-amber-600" },
                            { label: "Total Earned", value: "$0.00", color: "text-green-600" },
                            { label: "Active Plans", value: activeGeneratorCount.toString(), color: "text-blue-600" },
                            { label: "Member Since", value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), color: "text-purple-600" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className={`font-black ${color} text-2xl mt-1`}>{value}</p>
                            </div>
                        ))}
                    </div>
                    
                    {referralLink && (
                        <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100/80">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                    <Share2 className="w-4 h-4 text-amber-600" />
                                    Your Referral Link
                                </h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">Share your link with friends. When they sign up using your link, you'll earn a commission on their first investment!</p>
                            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-2">
                                <p className="text-sm text-amber-700 font-mono truncate flex-1">{referralLink}</p>
                                <Button size="sm" variant="ghost" onClick={copyLink} className="h-8 px-2.5">
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Link href="/dashboard/video-tutorial" className="block group">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg group-hover:shadow-xl transition-all h-full flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                </div>
                                Watch Tutorial
                            </h3>
                            <p className="text-xs text-blue-100 mt-2">Learn how to operate the app and start earning.</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-blue-200 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
            </Link>
            <InstallButton />
        </div>
    );
}
