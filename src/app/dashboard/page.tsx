
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { redeemGiftCode } from '@/app/dashboard/bank/actions';

// Icons and components
import { LogOut, ChevronRight, Globe, Gift, Share2, Users, CheckCircle, User as UserIcon, Info, Network, Percent } from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InstallButton from '@/components/InstallButton';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferralLink } from '@/components/ReferralLink';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';


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

type ReferredUser = {
    id: string;
    full_name: string | null;
    username: string | null;
    created_at: string;
};

function TeamSummary({ l1, l2, l3 }: { l1: number; l2: number; l3: number }) {
    const summaryItems = [
        { label: "Level 1 Members", value: l1, color: "text-orange-700", borderColor: "border-amber-300", iconColor: "text-amber-500" },
        { label: "Level 2 Members", value: l2, color: "text-blue-600", borderColor: "border-blue-300", iconColor: "text-blue-500" },
        { label: "Level 3 Members", value: l3, color: "text-green-600", borderColor: "border-green-300", iconColor: "text-green-500" },
    ];

    return (
        <div className="grid grid-cols-3 gap-3">
            {summaryItems.map(item => (
                <div key={item.label} className={`bg-white rounded-2xl border ${item.borderColor} p-4 text-center shadow-sm`}>
                    <Users className={`w-8 h-8 ${item.iconColor} mx-auto mb-2`} />
                    <p className={`font-black text-3xl ${item.color}`}>{item.value}</p>
                    <p className="text-gray-500 text-xs mt-1">{item.label}</p>
                </div>
            ))}
        </div>
    );
}


function ReferralOrgChart({ referredUsers }: { referredUsers: ReferredUser[] }) {
    const Node = ({ title, subtitle, className, isYou = false, commission }: { title: string; subtitle: string; className?: string; isYou?: boolean; commission?: string }) => (
        <div className={cn(
            "border-2 w-full rounded-lg p-2.5 text-center shadow-sm mx-auto h-full flex flex-col justify-center",
            isYou ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200",
            className
        )}>
            <p className={cn(
                "font-black text-xs uppercase truncate",
                isYou ? "text-amber-800" : "text-blue-800"
            )}>{title}</p>
            <p className={cn(
                "text-[10px] leading-tight",
                isYou ? "text-amber-600" : "text-blue-600"
            )}>{subtitle}</p>
             {commission && (
                <div className={cn("mt-1.5 pt-1.5 border-t", "border-blue-200")}>
                    <p className="text-blue-700 text-xs font-bold flex items-center justify-center gap-1">
                        <Percent className="w-3 h-3" /> {commission}
                    </p>
                </div>
            )}
        </div>
    );

    const roles = ['Network Specialist', 'Recruitment Lead', 'Wealth Accelerator'];

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-6">
                <Network className="w-5 h-5 text-gray-500" />
                Your Subordinates Team
            </h3>

            <div className="flex flex-col items-center">
                {/* Top Node */}
                <div className="w-48">
                    <Node
                        title="THE CENTRAL LEADERSHIP"
                        subtitle="(Strategic Growth Director)"
                        isYou
                    />
                </div>

                {/* Connecting Line */}
                <div className="w-px h-6 bg-gray-300" />

                {/* Horizontal Line */}
                <div className="w-full max-w-md h-px bg-gray-300" />

                {/* Vertical lines to subordinates */}
                <div className="flex justify-around w-full max-w-md">
                    <div className="w-px h-6 bg-gray-300" />
                    <div className="w-px h-6 bg-gray-300" />
                    <div className="w-px h-6 bg-gray-300" />
                </div>

                {/* Subordinates Grid */}
                <div className="grid grid-cols-3 gap-2 w-full max-w-md">
                    {Array.from({ length: 3 }).map((_, i) => {
                        const user = referredUsers[i];
                        return (
                            <div key={i}>
                                {user ? (
                                    <Node
                                        title={user.full_name || user.username || "Referred User"}
                                        subtitle={roles[i]}
                                        commission="10% Commission"
                                    />
                                ) : (
                                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-2 text-center h-full flex flex-col justify-center items-center">
                                        <Users className="w-5 h-5 text-gray-400 mb-1" />
                                        <p className="text-[11px] text-gray-500 font-semibold">Empty Slot</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


function RedeemGiftCode({ onRedeem }: { onRedeem: () => void }) {
    const { toast } = useToast();
    const [giftCode, setGiftCode] = useState("");
    const [isRedeeming, setIsRedeeming] = useState(false);

    const handleRedeem = async () => {
        if (!giftCode.trim()) {
            toast({ title: "Enter a gift code", variant: "destructive" });
            return;
        }
        setIsRedeeming(true);
        const result = await redeemGiftCode(giftCode.trim().toUpperCase());
        setIsRedeeming(false);

        if (result.error) {
            toast({ title: "Redemption Failed", description: result.error, variant: "destructive" });
        } else {
            const redeemedAmount = result.amount ? parseFloat(String(result.amount)) : 0;
            toast({ title: "Success!", description: `You have redeemed $${redeemedAmount.toFixed(2)}. It has been added to your balance.` });
            setGiftCode("");
            onRedeem();
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-2">
                <Gift className="w-5 h-5 text-amber-600" />
                Redeem Gift Code
            </h3>
            <p className="text-xs text-gray-500 mb-3">Have a gift code? Enter it below to add funds to your account.</p>
            <div className="flex flex-col gap-2">
                <Input
                    value={giftCode}
                    onChange={(e) => setGiftCode(e.target.value)}
                    placeholder="Enter gift code"
                    className="flex-1 h-11 border-gray-200 focus:border-amber-400 font-mono tracking-wider text-sm"
                />
                <Button 
                    onClick={handleRedeem}
                    disabled={isRedeeming}
                    className="h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md"
                >
                    {isRedeeming ? "Redeeming..." : "Redeem Code"}
                </Button>
            </div>
        </div>
    );
}

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
    const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalEarned, setTotalEarned] = useState(0);
    const [downlineCounts, setDownlineCounts] = useState({ l1: 0, l2: 0, l3: 0 });

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        const [
            profileResult, 
            rentedGeneratorsResult, 
            depositsResult,
            withdrawalsResult,
            referredUsersResult,
            downlineCountsResult
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
            supabase.from('deposit_requests').select('amount').eq('user_id', user.id).eq('status', 'approved'),
            supabase.from('withdrawal_requests').select('amount').eq('user_id', user.id).eq('status', 'approved'),
            supabase.rpc('get_referred_users', { user_id_in: user.id }),
            supabase.rpc('get_downline_counts', { user_id_in: user.id }).single()
        ]);

        const { data: profileData, error: profileError } = profileResult;
        if (profileError || !profileData) {
            toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
            router.push('/login');
            return;
        }
        setProfile(profileData);
        
        const { data: referredUsersData, error: referredUsersError } = referredUsersResult;
        if (referredUsersError) {
             console.error("Could not fetch referred users:", referredUsersError.message);
        } else {
            setReferredUsers((referredUsersData as ReferredUser[]) || []);
        }

        const { data: counts, error: countsError } = downlineCountsResult;
        if (countsError) {
            console.error("Could not fetch downline counts:", countsError.message);
        } else if (counts) {
            setDownlineCounts({ l1: counts.level1_count || 0, l2: counts.level2_count || 0, l3: counts.level3_count || 0 });
        }


        const { data: rentedData } = rentedGeneratorsResult;
        if (rentedData) {
            const now = new Date().getTime();
            const activeCount = rentedData.filter(g => g.expires_at && new Date(g.expires_at).getTime() > now).length;
            setActiveGeneratorCount(activeCount);
        }
        
        const totalDeposited = depositsResult.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
        const totalWithdrawn = withdrawalsResult.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
        const calculatedTotalEarned = (profileData.balance - totalDeposited) + totalWithdrawn;
        setTotalEarned(Math.max(0, calculatedTotalEarned));

        setLoading(false);
    }, [router, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    

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
                            { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, color: "text-green-600" },
                            { label: "Active Plans", value: activeGeneratorCount.toString(), color: "text-blue-600" },
                            { label: "Member Since", value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), color: "text-purple-600" },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="bg-gray-50 rounded-xl p-3">
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className={`font-black ${color} text-2xl mt-1`}>{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <TeamSummary l1={downlineCounts.l1} l2={downlineCounts.l2} l3={downlineCounts.l3} />

            <ReferralLink referralCode={profile.referral_code} />
            
            <ReferralOrgChart referredUsers={referredUsers} />

            <RedeemGiftCode onRedeem={fetchData} />

            <InstallButton />
        </div>
    );
}
