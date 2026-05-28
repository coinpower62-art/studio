'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, CheckCircle, AlertCircle, Timer, Wallet, ArrowDownToLine, LogOut, History, ShieldAlert, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';
import { logout } from '@/app/login/actions';
import { rentGeneratorAction } from "./actions";
import { Progress } from "@/components/ui/progress";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export type RentedGenerator = {
  id: string;
  user_id: string;
  generator_id: string;
  rented_at: string;
  expires_at: string;
  last_claimed_at: string | null;
  suspended: boolean;
};

type Profile = {
    balance: number;
};

function Countdown({ expiresAt, label = "Expires" }: { expiresAt: number; label?: string }) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());
  useEffect(() => {
    const t = setInterval(() => setRemaining(expiresAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (remaining <= 0) return <span className="text-red-600 text-xs font-bold">EXPIRED</span>;
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <div className="text-center">
      {label && <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>}
      <div className="flex items-center gap-0.5 justify-center">
        {d > 0 && <span className="text-red-600 text-sm font-black min-w-[1.25rem] text-center">{String(d).padStart(2,"0")}d</span>}
        <span className="text-red-600 text-sm font-black min-w-[1.25rem] text-center">{String(h).padStart(2,"0")}</span>
        <span className="text-red-600 font-black text-sm">:</span>
        <span className="text-red-600 text-sm font-black min-w-[1.25rem] text-center">{String(m).padStart(2,"0")}</span>
        <span className="text-red-600 font-black text-sm">:</span>
        <span className="text-red-600 text-sm font-black min-w-[1.25rem] text-center">{String(s).padStart(2,"0")}</span>
      </div>
    </div>
  );
}

function DeletionCountdown({ expiresAt }: { expiresAt: string }) {
    const deletionTime = new Date(expiresAt).getTime() + THIRTY_DAYS;
    return (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">Permanently Deleted In</p>
                <Countdown expiresAt={deletionTime} label="" />
            </div>
        </div>
    );
}

function MarketPageSkeleton() {
    return (
      <div className="pt-12 p-4 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    );
}

export default function Market() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [generators, setGenerators] = useState<any[]>([]);
  const [rentedGenerators, setRentedGenerators] = useState<RentedGenerator[]>([]);
  
  const [lowBalanceGen, setLowBalanceGen] = useState<{ name: string; price: number } | null>(null);
  const [isRenting, setIsRenting] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async function() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
          router.push('/login');
          return;
      }
      setUser(user);

      const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', user.id)
          .maybeSingle();
      
      if (profileError) {
          console.error("MarketPage: Profile fetch failed.");
      }
      setProfile(profileData as Profile | null);
      
      const { data: rentedData, error: rentedError } = await supabase
          .from('rented_generators')
          .select('*')
          .eq('user_id', user.id);

      if (rentedError) {
          toast({ title: 'Error fetching generators', variant: 'destructive'});
      } else {
          setRentedGenerators(rentedData as RentedGenerator[]);
      }

      const { data: allGenerators, error: generatorsError } = await supabase
        .from('generators')
        .select('*')
        .order('price', { ascending: true });

      if (generatorsError) {
          toast({ title: 'Error fetching market generators', variant: 'destructive'});
          setGenerators([]);
      } else {
          setGenerators(allGenerators);
      }
      
      setIsLoading(false);
  }, [router, supabase, toast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);
  
  const handleRentClick = async function(gen: any) {
    if (!profile) return;
    if (profile.balance < gen.price) {
       setLowBalanceGen({ name: gen.name, price: gen.price });
       return;
    }
    setIsRenting(gen.id);
    try {
      const result = await rentGeneratorAction(gen.id);

      if (result.error) {
        if (result.error === 'insufficient_funds') {
           setLowBalanceGen({ name: gen.name, price: gen.price });
        } else {
          throw new Error(result.error);
        }
      } else {
        toast({ title: "Generator rented!", description: "Moves to your Power page. Claim daily income every 24 hours." });
        await fetchData();
      }
    } catch (err: any) {
      toast({ title: "Action restricted", description: err.message || 'An unknown error occurred.', variant: "destructive" });
    } finally {
      setIsRenting(null);
    }
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  const now = Date.now();
  
  // FILTER: Only count rentals that aren't "permanently deleted" (expired > 30 days ago)
  const visibleRentals = rentedGenerators.filter(ug => {
    const expiresAt = new Date(ug.expires_at).getTime();
    if (expiresAt > now) return true;
    return expiresAt + THIRTY_DAYS > now;
  });

  const activeRentedCounts = new Map<string, number>();
  const totalRentedCounts = new Map<string, number>();

  visibleRentals.forEach(ug => {
    const genId = ug.generator_id;
    totalRentedCounts.set(genId, (totalRentedCounts.get(genId) || 0) + 1);
    if (new Date(ug.expires_at).getTime() > now) {
      activeRentedCounts.set(genId, (activeRentedCounts.get(genId) || 0) + 1);
    }
  });

  const colorMap: Record<string, { bg: string; border: string; badge: string; badgeText: string; gradS: string; gradE: string; badgeLabel: string }> = {
    "from-amber-400 to-orange-500": { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badge: "bg-amber-100", badgeText: "text-amber-700", gradS: "#f59e0b", gradE: "#f97316", badgeLabel: "Popular" },
    "from-green-400 to-emerald-600": { bg: "from-green-50 to-emerald-50", border: "border-green-200", badge: "bg-green-100", badgeText: "text-green-700", gradS: "#22c55e", gradE: "#059669", badgeLabel: "Recommended" },
    "from-blue-400 to-indigo-600": { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", badge: "bg-blue-100", badgeText: "text-blue-700", gradS: "#3b82f6", gradE: "#4f46e5", badgeLabel: "High Yield" },
    "from-purple-500 to-pink-600": { bg: "from-purple-50 to-pink-50", border: "border-purple-200", badge: "bg-purple-100", badgeText: "text-purple-700", gradS: "#8b5cf6", gradE: "#ec4899", badgeLabel: "Premium" },
    "from-teal-400 to-cyan-600": { bg: "from-teal-50 to-cyan-50", border: "border-teal-200", badge: "bg-teal-100", badgeText: "text-teal-700", gradS: "#2dd4bf", gradE: "#0891b2", badgeLabel: "Elite" },
  };

  const publishedGenerators = generators.filter(g => g.published);

  return (
    <div className="pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">

        <div className="text-center py-4 sm:py-8 mb-2">
          <Badge className="mb-2 bg-amber-100 text-amber-700 border-0 px-3 py-1">
            <TrendingUp className="w-3 h-3 mr-1" />Live Market
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Investment <span className="text-amber-600">Generators</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Choose a plan and start earning daily income. Each generator has a <span className="font-bold text-gray-800">lifetime limit</span> which is counted after your first rental.
          </p>
        </div>

        {publishedGenerators.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800">Market is Currently Empty</h3>
            <p className="text-gray-400 text-xs mt-3">Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {publishedGenerators.map((gen) => {
              const cm = colorMap[gen.color] || colorMap["from-amber-400 to-orange-500"];
              const activeCount = activeRentedCounts.get(gen.id) || 0;
              const totalCount = totalRentedCounts.get(gen.id) || 0;
              
              const activeLimit = gen.active_limit || 1;
              const lifetimeLimit = gen.lifetime_limit || 1;

              const isLifetimeMaxed = totalCount >= lifetimeLimit;
              const isActiveMaxed = activeCount >= activeLimit;
              
              const isPG1 = gen.id === 'pg1';
              
              const expiredRentalsOfThisType = visibleRentals.filter(ug => ug.generator_id === gen.id && new Date(ug.expires_at).getTime() <= now);
              const mostRecentExpired = expiredRentalsOfThisType.sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime())[0];

              return (
                <div key={gen.id} data-testid={'card-generator-' + gen.id}
                  className={'bg-white rounded-2xl border-2 ' + cm.border + ' shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ' + (isLifetimeMaxed ? "grayscale opacity-80" : "")}>

                  <div className={'bg-gradient-to-r ' + cm.bg + ' p-4 sm:p-5 border-b ' + cm.border}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">{gen.name}</h3>
                        <p className="text-gray-500 text-xs sm:text-sm">{gen.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={'text-xs font-semibold px-2 py-1 rounded-full ' + cm.badge + ' ' + cm.badgeText}>
                          {cm.badgeLabel}
                        </span>
                        {isLifetimeMaxed ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-sm">
                            <ShieldAlert className="w-3 h-3" /> DISCONNECTED
                          </span>
                        ) : !isPG1 && totalCount > 0 ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {totalCount}/{lifetimeLimit} Used
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden shadow-inner bg-white relative">
                        <img
                          src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                          alt={gen.name}
                          className="w-full h-full object-contain p-4"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.parentElement as HTMLElement).style.background = 'linear-gradient(135deg, ' + cm.gradS + ' 0%, ' + cm.gradE + ' 100%)'; }}
                        />
                        {isLifetimeMaxed && (
                           <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6">
                              <div className="bg-red-600 text-white text-xs font-black px-4 py-2 rounded-xl shadow-2xl tracking-widest border-2 border-white/50 animate-pulse text-center">
                                 LIFETIME LIMIT REACHED<br/><span className="text-[9px] opacity-80">PLAN PERMANENTLY DISCONNECTED</span>
                              </div>
                           </div>
                        )}
                    </div>

                    {!isPG1 && (
                      <div className={`grid ${totalCount > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-4`}>
                          <div className="bg-white/80 border border-amber-200 rounded-xl p-2 shadow-sm">
                              <div className="flex justify-between items-center mb-1">
                                  <span className="text-[9px] text-gray-500 font-bold uppercase">Current Slots</span>
                                  <span className="text-[10px] font-black text-gray-900">{activeCount}/{activeLimit}</span>
                              </div>
                              <Progress value={(activeCount / activeLimit) * 100} className="h-1.5 bg-gray-200" />
                          </div>
                          {totalCount > 0 && (
                            <div className="bg-white/80 border border-blue-200 rounded-xl p-2 shadow-sm">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] text-gray-500 font-bold uppercase">Lifetime Usage</span>
                                    <span className="text-[10px] font-black text-gray-900">{totalCount}/{lifetimeLimit}</span>
                                </div>
                                <Progress value={(totalCount / lifetimeLimit) * 100} className="h-1.5 bg-gray-200" />
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 sm:p-5">
                    {mostRecentExpired && !isActiveMaxed && !isLifetimeMaxed && (
                        <div className="mb-4">
                            <DeletionCountdown expiresAt={mostRecentExpired.expires_at} />
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={'rounded-xl px-2 py-2 text-center border ' + (gen.price === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100")}>
                        <p className={'text-[10px] font-medium ' + (gen.price === 0 ? "text-green-500" : "text-gray-400")}>Rent Price</p>
                        <p className={'font-black text-sm ' + (gen.price === 0 ? "text-green-700" : "text-gray-900")}>{gen.price === 0 ? "FREE" : '$' + gen.price.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl px-2 py-2 text-center border border-green-100">
                        <p className="text-green-500 text-[10px] font-medium">Daily</p>
                        <p className="text-green-700 font-black text-sm">${gen.daily_income}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl px-2 py-2 text-center border border-amber-100">
                        <p className="text-amber-500 text-[10px] font-medium">Total Earnings</p>
                        <p className="text-amber-700 font-black text-sm">${(gen.daily_income * gen.expire_days).toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-1.5 mb-3 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Duration</span>
                        <span className="text-xs font-black text-gray-800">{gen.expire_days} Days</span>
                    </div>

                    {isLifetimeMaxed ? (
                      <div className="space-y-3">
                          <Button disabled className="w-full bg-red-100 text-red-600 font-black rounded-xl h-11 border-2 border-red-200">
                             <ShieldAlert className="w-4 h-4 mr-2" /> PERMANENTLY DISCONNECTED
                          </Button>
                          {mostRecentExpired && <DeletionCountdown expiresAt={mostRecentExpired.expires_at} />}
                      </div>
                    ) : isActiveMaxed ? (
                        <div className="space-y-2">
                             <Button disabled className="w-full bg-amber-50 text-amber-700 font-bold rounded-xl h-11 border-2 border-amber-200">
                                <History className="w-4 h-4 mr-2" /> ACTIVE LIMIT REACHED
                             </Button>
                            <p className="text-[10px] text-gray-400 text-center">Wait for current rental to expire or upgrade plan.</p>
                        </div>
                    ) : (
                      <Button
                        data-testid={'button-rent-' + gen.id}
                        onClick={() => handleRentClick(gen)}
                        disabled={isRenting === gen.id}
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl h-11 shadow-md transition-all flex items-center gap-2 justify-center"
                      >
                        {isRenting === gen.id ? "Activating..." : gen.price === 0 ? "Activate Free Plan" : `Rent ${gen.name} — $${gen.price.toLocaleString()}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden" data-testid="dialog-low-balance">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-5 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-black mb-1">Insufficient Balance</DialogTitle>
          </div>
          <div className="p-5 space-y-4">
            {lowBalanceGen && profile && (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Generator</span>
                  <span className="font-bold text-gray-900 text-sm">{lowBalanceGen.name}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Required</span>
                  <span className="font-black text-red-600 text-sm">${lowBalanceGen.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm">Your Balance</span>
                  <span className="font-black text-gray-900 text-sm">${profile.balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <span className="text-red-600 text-sm font-medium">Shortfall</span>
                  <span className="font-black text-red-600 text-sm">
                    ${Math.max(0, lowBalanceGen.price - profile.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLowBalanceGen(null)} className="flex-1 rounded-xl h-11 font-semibold">Cancel</Button>
              <Button onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }} className="flex-1 rounded-xl h-11 font-bold bg-amber-500 text-white">Deposit Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
