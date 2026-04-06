'use client';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { claimReferralBonus } from './actions';
import { redeemGiftCode } from '@/app/dashboard/bank/actions';

// Icons and components
import { LogOut, Play, ChevronRight, Globe, Gift, Share2, Users, CheckCircle, User as UserIcon } from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InstallButton from '@/components/InstallButton';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferralLink } from '@/components/ReferralLink';
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
    full_name: string | null;
    username: string | null;
    created_at: string;
};


function ReferralBonusGoal({ referralCount, hasClaimed, onClaim }: { referralCount: number; hasClaimed: boolean; onClaim: () => Promise<any> }) {
    const maxReferrals = 5;
    const progress = Math.min((referralCount / maxReferrals) * 100, 100);
    const canClaim = referralCount >= maxReferrals && !hasClaimed;
    const [isClaiming, setIsClaiming] = useState(false);

    const handleClaim = async () => {
        setIsClaiming(true);
        await onClaim();
        setIsClaiming(false);
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                Referral Bonus Goal
            </h3>
            <p className="text-xs text-gray-500 mb-3">
                Refer {maxReferrals} users to unlock a <span className="font-bold text-amber-600">$3.00 bonus!</span> You have referred {referralCount} so far.
            </p>
            <Progress value={progress} className="h-3 [&>div]:bg-blue-500" />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span className="font-medium">{referralCount} / {maxReferrals} Referrals</span>
                <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            
            {canClaim && (
                 <Button onClick={handleClaim} disabled={isClaiming} className="w-full mt-3 h-10 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg text-sm">
                    {isClaiming ? 'Claiming...' : 'Claim $3.00 Bonus'}
                </Button>
            )}

            {hasClaimed && (
                <div className="mt-3 text-center bg-green-50 border border-green-200 text-green-700 rounded-lg p-2 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Congratulations! You've claimed your referral bonus.
                </div>
            )}
        </div>
    );
}

function ReferredUsersList({ users }: { users: ReferredUser[] }) {
    if (users.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-center">
                <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <h3 className="font-bold text-gray-900 text-sm">Your Referral Team is Empty</h3>
                <p className="text-xs text-gray-500 mt-1">You haven't referred anyone yet. Share your link to start building your leadership team and earn more.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-600" />
                Your Referral Team ({users.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {users.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-purple-100 text-purple-600 text-xs font-bold">
                                    {(user.full_name || user.username || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{user.full_name || user.username}</p>
                                <p className="text-xs text-gray-500">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">Level 1</Badge>
                    </div>
                ))}
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
            toast({ title: "Please enter a gift code.", variant: "destructive" });
            return;
        }
        setIsRedeeming(true);
        const result = await redeemGiftCode(giftCode.trim().toUpperCase());
        setIsRedeeming(false);

        if (result.error) {
            toast({ title: "Redemption Failed", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Success!", description: `You have redeemed $${result.amount?.toFixed(2)}. It has been added to your balance.` });
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
    const [referralCount, setReferralCount] = useState(0);
    const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showTelegramPopup, setShowTelegramPopup] = useState(false);
    const [hasClaimedReferralBonus, setHasClaimedReferralBonus] = useState(false);

    const fetchData = useCallback(async () => {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            router.push('/login');
            return;
        }
        setUser(user);

        const [profileResult, rentedGeneratorsResult, bonusResult] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
            supabase.from('gift_codes').select('id').eq('code', `REF-BONUS-5-${user.id}`).maybeSingle(),
        ]);

        const { data: profileData, error: profileError } = profileResult;
        if (profileError || !profileData) {
            toast({ title: "Error", description: "Could not load user profile.", variant: "destructive" });
            router.push('/login');
            return;
        }
        setProfile(profileData);
        setHasClaimedReferralBonus(!!bonusResult.data);

        if (profileData.referral_code) {
             const [{ count, error: referralError }, { data: referredUsersData, error: referredUsersError }] = await Promise.all([
                 supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('referred_by', profileData.referral_code),
                supabase
                    .from('profiles')
                    .select('full_name, username, created_at')
                    .eq('referred_by', profileData.referral_code)
                    .order('created_at', { ascending: false })
            ]);

            if (referralError) {
                console.error("Could not fetch referral count:", referralError.message);
            } else {
                setReferralCount(count || 0);
            }

            if (referredUsersError) {
                console.error("Could not fetch referred users:", referredUsersError.message);
            } else {
                setReferredUsers(referredUsersData || []);
            }
        }

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
        const timer = setTimeout(() => {
            setShowTelegramPopup(true);
        }, 1500); // 1.5s delay
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleClaimBonus = async () => {
        const result = await claimReferralBonus();
        if (result.error) {
            toast({ title: "Bonus Claim Failed", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Bonus Claimed!", description: `You have received $${result.amount?.toFixed(2)}.` });
            fetchData(); // to refresh balance and claimed status
        }
    }

    if (loading || !profile || !user) {
        return <DashboardSkeleton />;
    }

    const nameForInitials = profile?.full_name || user.email || "";
    const initials = nameForInitials.split(' ').map((n) => n[0] || '').join('').toUpperCase().slice(0, 2) || '??';

    return (
        <div className="space-y-4">
             <Dialog open={showTelegramPopup} onOpenChange={setShowTelegramPopup}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader className="text-center items-center">
                        <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center mb-2">
                           <SiTelegram className="w-8 h-8 text-sky-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold">Join our Community!</DialogTitle>
                        <DialogDescription className="text-gray-500 text-sm pt-1">
                            Click below to join our official Telegram group for live support, announcements, and to connect with other investors.
                        </DialogDescription>
                    </DialogHeader>
                    <a href="https://t.me/coinpowerofficial" target="_blank" rel="noopener noreferrer" onClick={() => setShowTelegramPopup(false)}>
                        <Button className="w-full h-11 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg text-base">
                            <SiTelegram className="w-5 h-5 mr-2" />
                            Join Telegram Group
                        </Button>
                    </a>
                </DialogContent>
            </Dialog>

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
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Share2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                            Referral Bonus
                        </h3>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            For each friend that signs up with your link, you'll earn a <span className="font-bold text-amber-600">$5.00 bonus</span> when they make their first deposit.
                        </p>
                        <a href="https://t.me/coinpowerofficial" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 bg-sky-100 text-sky-700 font-bold text-xs px-3 py-2 rounded-lg hover:bg-sky-200 transition-colors">
                            <SiTelegram className="w-4 h-4" />
                            Join our Telegram Group
                        </a>
                    </div>
                </div>
            </div>


            <ReferralLink referralCode={profile.referral_code} />

            <ReferralBonusGoal referralCount={referralCount} hasClaimed={hasClaimedReferralBonus} onClaim={handleClaimBonus} />
            
            <ReferredUsersList users={referredUsers} />

            <RedeemGiftCode onRedeem={fetchData} />

            <Link href="/dashboard/video-tutorial" className="block group">
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl p-5 text-white shadow-lg group-hover:shadow-xl transition-all h-full flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-base flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                                </div>
                                Watch Tutorial
                            </h3>
                            <p className="text-xs text-amber-100 mt-2">Learn how to operate the app and start earning.</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-amber-200 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
            </Link>
            <InstallButton />
        </div>
    );
}
