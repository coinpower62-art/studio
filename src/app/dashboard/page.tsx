'use client';

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
import { LogOut, ChevronRight, Globe, Gift, Share2, Users, CheckCircle, User as UserIcon, Info, Network } from 'lucide-react';
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
    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                <Network className="w-5 h-5 text-blue-600" />
                Your Subordinates Team ({users.length})
            </h3>
            {users.length === 0 ? (
                <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-gray-700">You haven't referred anyone yet.</p>
                    <p className="text-sm text-gray-500 mt-1">Share your link to start building your team!</p>
                </div>
            ) : (
                <div className="relative pl-5">
                    {/* The vertical "network" line */}
                    <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-200 rounded-full" />
                    
                    <div className="space-y-4">
                        {users.map((user, index) => (
                            <div key={index} className="relative flex items-center gap-4">
                                {/* Connector dot and line */}
                                <div className="absolute left-[19px] top-5 w-5 h-0.5 bg-gray-200" />
                                <div className="absolute left-[13px] top-[15px] w-3 h-3 rounded-full bg-white border-2 border-blue-500 z-10" />

                                <Avatar className="w-10 h-10 flex-shrink-0 border-2 border-white ring-2 ring-blue-200 z-10 bg-white">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-sm font-bold">
                                        {(user.full_name || user.username || 'S').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{user.full_name || user.username}</p>
                                    <p className="text-xs text-gray-500">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
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
    const [referralCount, setReferralCount] = useState(0);
    const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasClaimedReferralBonus, setHasClaimedReferralBonus] = useState(false);
    const [totalEarned, setTotalEarned] = useState(0);

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
            bonusResult,
            depositsResult,
            withdrawalsResult
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
            supabase.from('gift_codes').select('id').eq('code', `REF-BONUS-5-${user.id}`).maybeSingle(),
            supabase.from('deposit_requests').select('amount').eq('user_id', user.id).eq('status', 'approved'),
            supabase.from('withdrawal_requests').select('amount').eq('user_id', user.id).eq('status', 'approved')
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
            const { data: referredUsersData, error: referredUsersError } = await supabase
                .rpc('get_referred_users', { user_id_in: user.id });

            if (referredUsersError) {
                console.error("Could not fetch referred users:", referredUsersError.message);
                setReferralCount(0);
                setReferredUsers([]);
            } else {
                const users = referredUsersData || [];
                setReferralCount(users.length);
                setReferredUsers(users as ReferredUser[]);
            }
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
    

    const handleClaimBonus = async () => {
        const result = await claimReferralBonus();
        if (result.error) {
            toast({ title: "Bonus Claim Failed", description: result.error, variant: "destructive" });
        } else {
            const bonusAmount = result.amount ? parseFloat(String(result.amount)) : 0;
            toast({ title: "Bonus Claimed!", description: `You have received $${bonusAmount.toFixed(2)}.` });
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

            <ReferralLink referralCode={profile.referral_code} />

            <ReferralBonusGoal referralCount={referralCount} hasClaimed={hasClaimedReferralBonus} onClaim={handleClaimBonus} />
            
            <ReferredUsersList users={referredUsers} />

            <RedeemGiftCode onRedeem={fetchData} />

            <InstallButton />
        </div>
    );
}
