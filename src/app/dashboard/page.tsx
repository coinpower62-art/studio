
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { logout } from '@/app/login/actions';
import { redeemGiftCode } from '@/app/dashboard/bank/actions';

// Icons and components
import { LogOut, Play, ChevronRight, Globe, Gift, Share2, User as UserIcon, Clock, CheckCircle } from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import InstallButton from '@/components/InstallButton';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferralLink } from '@/components/ReferralLink';
import { Input } from '@/components/ui/input';
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

function DashboardContent() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [activeGeneratorCount, setActiveGeneratorCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [totalEarned, setTotalEarned] = useState(0);
    const [showWithdrawalInfo, setShowWithdrawalInfo] = useState(false);

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
        ] = await Promise.all([
            supabase.from('profiles').select('*').eq('id', user.id).single(),
            supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
            supabase.from('deposit_requests').select('amount').eq('user_id', user.id).eq('status', 'approved'),
            supabase.from('withdrawal_requests').select('amount').eq('user_id', user.id).eq('status', 'approved'),
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
        
        const totalDeposited = depositsResult.data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
        const totalWithdrawn = withdrawalsResult.data?.reduce((sum, w) => sum + (w.amount || 0), 0) || 0;
        const calculatedTotalEarned = (profileData.balance - totalDeposited) + totalWithdrawn;
        setTotalEarned(Math.max(0, calculatedTotalEarned));

        setLoading(false);
    }, [router, toast]);

    useEffect(() => {
        const hasBeenShown = sessionStorage.getItem('withdrawal_info_shown');
        if (hasBeenShown !== 'true') {
            setShowWithdrawalInfo(true);
            sessionStorage.setItem('withdrawal_info_shown', 'true');
        }
    }, []);

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
             <Dialog open={showWithdrawalInfo} onOpenChange={setShowWithdrawalInfo}>
                <DialogContent className="sm:max-w-md rounded-2xl p-0 overflow-hidden">
                    <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-5 text-white text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                            <Clock className="w-8 h-8 text-white" />
                        </div>
                        <DialogTitle className="text-white text-xl font-bold">Withdrawal Information</DialogTitle>
                    </div>
                    <div className="p-6">
                        <DialogDescription className="text-gray-600 text-sm pt-1 text-center leading-relaxed">
                            Welcome! Please note that withdrawals are processed Monday to Saturday, typically within <strong>1 to 24 hours</strong>.
                        </DialogDescription>
                        <Button onClick={() => setShowWithdrawalInfo(false)} className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-base mt-5">
                            Okay, I understand
                        </Button>
                    </div>
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

            <RedeemGiftCode onRedeem={fetchData} />

            <InstallButton />
        </div>
    );
}


export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    )
}
