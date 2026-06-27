'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, CheckCircle, AlertCircle, Timer, Wallet, ArrowDownToLine, LogOut, ShieldAlert, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function MarketPageSkeleton() {
    return (
      <div className="pt-12 p-4 pb-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      </div>
    );
}

function RedCountdown({ targetMs }: { targetMs: number }) {
    const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));
    const sync = useCallback(function() { return setRemaining(Math.max(0, targetMs - Date.now())); }, [targetMs]);
    useEffect(function() {
      const t = setInterval(sync, 1000);
      return function() { return clearInterval(t); };
    }, [sync]);
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    return (
      <div className="flex items-center justify-center gap-0.5">
        {[h, m, s].map(function(val, i) {
          return (
          <span key={i}>
            <span className="inline-block text-red-600 text-[10px] font-black min-w-[1rem] text-center">{String(val).padStart(2,"0")}</span>
            {i < 2 && <span className="text-red-600 font-black text-[10px] mx-0.5">:</span>}
          </span>
        ); })}
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

      const [pRes, rRes, gRes] = await Promise.all([
          supabase.from('profiles').select('balance').eq('id', user.id).maybeSingle(),
          supabase.from('rented_generators').select('*').eq('user_id', user.id),
          supabase.from('generators').select('*').order('price', { ascending: true })
      ]);
      
      setProfile(pRes.data as Profile | null);
      setRentedGenerators((rRes.data || []) as RentedGenerator[]);
      setGenerators(gRes.data || []);
      setIsLoading(false);
  }, [router, supabase]);

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
          toast({ title: "Action restricted", description: result.error, variant: "destructive" });
        }
      } else {
        toast({ title: "Generator rented!", description: "Check your Power page to collect daily income." });
        await fetchData();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || 'Error occurred.', variant: "destructive" });
    } finally {
      setIsRenting(null);
    }
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  const now = Date.now();
  
  const activeRentedCounts = new Map<string, number>();
  const totalRentedCounts = new Map<string, number>();
  const hasEverRentedPg1 = rentedGenerators.some(g => g.generator_id === 'pg1');

  rentedGenerators.forEach(ug => {
    totalRentedCounts.set(ug.generator_id, (totalRentedCounts.get(ug.generator_id) || 0) + 1);
    if (new Date(ug.expires_at).getTime() > now) {
      activeRentedCounts.set(ug.generator_id, (activeRentedCounts.get(ug.generator_id) || 0) + 1);
    }
  });

  const colorMap: Record<string, { bg: string; border: string; badge: string; badgeText: string; gradS: string; gradE: string; badgeLabel: string }> = {
    "from-amber-400 to-orange-500": { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badge: "bg-amber-100", badgeText: "text-amber-700", gradS: "#f59e0b", gradE: "#f97316", badgeLabel: "Popular" },
    "from-green-400 to-emerald-600": { bg: "from-green-50 to-emerald-50", border: "border-green-200", badge: "bg-green-100", badgeText: "text-green-700", gradS: "#22c55e", gradE: "#059669", badgeLabel: "Recommended" },
    "from-blue-400 to-indigo-600": { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", badge: "bg-blue-100", badgeText: "text-blue-700", gradS: "#3b82f6", gradE: "#4f46e5", badgeLabel: "High Yield" },
    "from-purple-500 to-pink-600": { bg: "from-purple-50 to-pink-50", border: "border-purple-200", badge: "bg-purple-100", badgeText: "text-purple-700", gradS: "#8b5cf6", gradE: "#ec4899", badgeLabel: "Premium" },
    "from-teal-400 to-cyan-600": { bg: "from-cyan-50 to-blue-50", border: "border-cyan-200", badge: "bg-cyan-100", badgeText: "text-cyan-700", gradS: "#22d3ee", gradE: "#0891b2", badgeLabel: "Elite" },
  };

  const publishedGenerators = generators.filter(g => {
    if (!g.published) return false;
    if (g.id === 'pg1' && hasEverRentedPg1) return false;
    return true;
  });

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
            Rent a generator and claim daily income. Once your plan expires, it is permanently counted toward your account limit.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
          {publishedGenerators.map((gen) => {
            const cm = colorMap[gen.color] || colorMap["from-amber-400 to-orange-500"];
            const activeCount = activeRentedCounts.get(gen.id) || 0;
            const totalCount = totalRentedCounts.get(gen.id) || 0;
            
            const activeLimit = gen.active_limit || 1;
            const lifetimeLimit = gen.lifetime_limit || 1;

            const isLifetimeMaxed = totalCount >= lifetimeLimit;
            const isActiveMaxed = activeCount >= activeLimit;
            
            // Find most recent expiry to show clearing timer
            const lastExpiry = rentedGenerators
              .filter(ug => ug.generator_id === gen.id)
              .map(ug => new Date(ug.expires_at).getTime())
              .sort((a, b) => b - a)[0];
            const clearingAt = lastExpiry + THIRTY_DAYS;

            return (
              <div key={gen.id} data-testid={'card-generator-' + gen.id}
                className={cn(
                    'bg-white rounded-2xl border-2 ' + cm.border + ' shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ',
                    isLifetimeMaxed ? "grayscale opacity-80" : ""
                )}>

                <div className={'bg-gradient-to-r ' + cm.bg + ' p-4 sm:p-5 border-b ' + cm.border}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-black text-gray-900 text-base sm:text-lg leading-tight uppercase">{gen.name}</h3>
                      <p className="text-gray-500 text-xs sm:text-sm font-medium">{gen.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full ' + cm.badge + ' ' + cm.badgeText}>
                        {cm.badgeLabel}
                      </span>
                      {isLifetimeMaxed && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-md uppercase tracking-tighter">
                          <ShieldAlert className="w-3 h-3" /> Permanent Disconnect
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden shadow-inner bg-white relative">
                      <img
                        src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                        alt={gen.name}
                        className="w-full h-full object-contain p-4"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.parentElement as HTMLElement).style.background = 'linear-gradient(135deg, ' + cm.gradS + ' 0%, ' + cm.gradE + ' 100%)'; }}
                      />
                  </div>

                  <div className="grid gap-2 mt-4 grid-cols-2">
                      <div className="bg-white/80 border border-amber-200 rounded-xl p-2.5 shadow-sm">
                          <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] text-gray-500 font-black uppercase">Active Slot</span>
                              <span className="text-[10px] font-black text-gray-900">{activeCount}/{activeLimit}</span>
                          </div>
                          <Progress value={(activeCount / activeLimit) * 100} className="h-1.5 bg-gray-200" />
                      </div>
                      <div className="bg-white/80 border border-blue-200 rounded-xl p-2.5 shadow-sm">
                          <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] text-gray-500 font-black uppercase">Lifetime</span>
                              <span className="text-[10px] font-black text-gray-900">{totalCount}/{lifetimeLimit}</span>
                          </div>
                          <Progress value={(totalCount / lifetimeLimit) * 100} className="h-1.5 bg-gray-200" />
                      </div>
                  </div>
                  
                  {isLifetimeMaxed && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center gap-1.5 text-red-600">
                            <Trash2 className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Slot Clears In</span>
                        </div>
                        <RedCountdown targetMs={clearingAt} />
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className={'rounded-xl px-2 py-2 text-center border ' + (gen.price === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100 shadow-sm")}>
                      <p className={'text-[9px] font-bold uppercase ' + (gen.price === 0 ? "text-green-500" : "text-gray-400")}>Price</p>
                      <p className={'font-black text-sm ' + (gen.price === 0 ? "text-green-700" : "text-gray-900")}>{gen.price === 0 ? "FREE" : '$' + gen.price.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl px-2 py-2 text-center border border-green-100 shadow-sm">
                      <p className="text-green-500 text-[9px] font-bold uppercase">Daily</p>
                      <p className="text-green-700 font-black text-sm">${gen.daily_income}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl px-2 py-2 text-center border border-amber-100 shadow-sm">
                      <p className="text-amber-500 text-[9px] font-bold uppercase">ROI</p>
                      <p className="text-amber-700 font-black text-sm">{gen.roi}</p>
                    </div>
                  </div>

                  {isLifetimeMaxed ? (
                    <Button disabled className="w-full bg-red-50 text-red-600 font-black rounded-xl h-11 border-2 border-red-200 uppercase text-xs tracking-widest shadow-inner">
                       <ShieldAlert className="w-4 h-4 mr-2" /> Disconnected
                    </Button>
                  ) : isActiveMaxed ? (
                       <Button disabled className="w-full bg-amber-50 text-amber-700 font-black rounded-xl h-11 border-2 border-amber-200 uppercase text-xs tracking-tighter">
                          <Timer className="w-4 h-4 mr-2" /> Current Slots Occupied
                       </Button>
                  ) : (
                    <Button
                      data-testid={'button-rent-' + gen.id}
                      onClick={() => handleRentClick(gen)}
                      disabled={isRenting === gen.id}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black rounded-xl h-11 shadow-lg transition-all flex items-center gap-2 justify-center uppercase text-xs tracking-wide active:scale-95"
                    >
                      {isRenting === gen.id ? "Initializing..." : gen.price === 0 ? "Activate Free Trial" : `Rent ${gen.name} — $${gen.price.toLocaleString()}`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl p-0 overflow-hidden border-0 shadow-2xl" data-testid="dialog-low-balance">
          <div className="bg-gradient-to-br from-red-600 to-orange-500 p-8 text-white text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
              <Wallet className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-white text-2xl font-black mb-2 uppercase tracking-wide">Insufficient Funds</DialogTitle>
            <DialogDescription className="text-red-100 text-sm font-medium">
              You need a higher balance to rent this generator.
            </DialogDescription>
          </div>
          <div className="p-6 bg-white space-y-4">
            {lowBalanceGen && profile && (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 shadow-sm">
                  <span className="text-gray-500 text-xs font-bold uppercase">Generator</span>
                  <span className="font-black text-gray-900 text-sm">{lowBalanceGen.name}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-5 py-4 border border-gray-100 shadow-sm">
                  <span className="text-gray-500 text-xs font-bold uppercase">Cost</span>
                  <span className="font-black text-gray-900 text-sm">${lowBalanceGen.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 border-2 border-red-100 rounded-2xl px-5 py-4">
                  <span className="text-red-600 text-xs font-black uppercase">Shortfall</span>
                  <span className="font-black text-red-600 text-base">
                    ${Math.max(0, lowBalanceGen.price - profile.balance).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setLowBalanceGen(null)}
                className="flex-1 rounded-2xl h-12 font-bold border-gray-200 text-gray-500"
              >
                Later
              </Button>
              <Button
                onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }}
                className="flex-1 rounded-2xl h-12 font-black bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-xl flex items-center gap-2 justify-center uppercase text-xs"
              >
                <ArrowDownToLine className="w-4 h-4" /> Deposit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
