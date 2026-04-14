'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, CheckCircle, AlertCircle, Timer, Wallet, ArrowDownToLine, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';
import { logout } from "@/app/login/actions";
import { rentGeneratorAction } from "./actions";

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
  if (remaining <= 0) return <span className="text-red-500 text-xs font-bold">EXPIRED</span>;
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  return (
    <div className="text-center">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <div className="flex items-center gap-0.5 justify-center">
        {d > 0 && <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">{String(d).padStart(2,"0")}d</span>}
        <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">{String(h).padStart(2,"0")}</span>
        <span className="text-red-500 font-black text-xs">:</span>
        <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">{String(m).padStart(2,"0")}</span>
        <span className="text-red-500 font-black text-xs">:</span>
        <span className="bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded">{String(s).padStart(2,"0")}</span>
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
  const [generators, setGenerators] = useState<Generator[]>([]);
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
          setGenerators(allGenerators as Generator[]);
      }
      
      setIsLoading(false);
  }, [router, supabase, toast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);
  
  const handleRentClick = async function(gen: Generator) {
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
      toast({ title: "Could not rent the generator", description: err.message || 'An unknown error occurred.', variant: "destructive" });
    } finally {
      setIsRenting(null);
    }
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  const now = Date.now();
  const activeRentedCounts = new Map<string, number>();
  rentedGenerators.filter(function(ug: RentedGenerator) { return new Date(ug.expires_at).getTime() > now; }).forEach(function(ug: RentedGenerator) {
    activeRentedCounts.set(ug.generator_id, (activeRentedCounts.get(ug.generator_id) || 0) + 1);
  });
  const hasEverRentedPg1 = rentedGenerators.some(g => g.generator_id === 'pg1');

  const colorMap: Record<string, { bg: string; border: string; badge: string; badgeText: string; gradS: string; gradE: string; badgeLabel: string }> = {
    "from-amber-400 to-orange-500": { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badge: "bg-amber-100", badgeText: "text-amber-700", gradS: "#f59e0b", gradE: "#f97316", badgeLabel: "Popular" },
    "from-green-400 to-emerald-600": { bg: "from-green-50 to-emerald-50", border: "border-green-200", badge: "bg-green-100", badgeText: "text-green-700", gradS: "#22c55e", gradE: "#059669", badgeLabel: "Recommended" },
    "from-blue-400 to-indigo-600": { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", badge: "bg-blue-100", badgeText: "text-blue-700", gradS: "#3b82f6", gradE: "#4f46e5", badgeLabel: "High Yield" },
    "from-purple-500 to-pink-600": { bg: "from-purple-50 to-pink-50", border: "border-purple-200", badge: "bg-purple-100", badgeText: "text-purple-700", gradS: "#8b5cf6", gradE: "#ec4899", badgeLabel: "Premium" },
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
            Rent a generator and claim your daily income every 24 hours in the Power page.
          </p>
        </div>

        {rentedGenerators.filter(ug => new Date(ug.expires_at).getTime() > now).length > 0 && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-green-800 font-semibold text-sm">You have active generators!</p>
              <p className="text-green-600 text-xs">Go to the <button onClick={() => router.push("/dashboard/power")} className="underline font-bold">Power page</button> to claim your daily income every 24 hours.</p>
            </div>
          </div>
        )}

        {publishedGenerators.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800">Market is Currently Empty</h3>
            <p className="text-gray-500 text-sm mt-1">There are no generators available for rent at the moment.</p>
            <p className="text-gray-400 text-xs mt-3">Please check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {publishedGenerators.map((gen) => {
              const cm = colorMap[gen.color] || colorMap["from-amber-400 to-orange-500"];
              const rentedCount = activeRentedCounts.get(gen.id) || 0;
              const isRented = rentedCount > 0;
              
              const maxRentals = 
                gen.id === 'pg1' ? 1 :
                gen.id === 'pg2' ? 2 :
                gen.id === 'pg3' ? 1 :
                2; // Default for pg4 and others.

              const isMaxed = gen.id === 'pg1' ? hasEverRentedPg1 : rentedCount >= maxRentals;
              
              const activeUg = rentedGenerators.find(ug => ug.generator_id === gen.id && new Date(ug.expires_at).getTime() > now);

              return (
                <div key={gen.id} data-testid={'card-generator-' + gen.id}
                  className={'bg-white rounded-2xl border-2 ' + cm.border + ' shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ' + (isMaxed ? "ring-2 ring-amber-400 ring-offset-2" : isRented ? "ring-2 ring-green-400 ring-offset-2" : "")}>

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
                        {gen.id === "pg1" && hasEverRentedPg1 ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Rented (1 only)
                          </span>
                        ) : isRented ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {rentedCount}/{maxRentals} Active
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden shadow-inner bg-white">
                        <img
                          src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                          alt={gen.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.parentElement as HTMLElement).style.background = 'linear-gradient(135deg, ' + cm.gradS + ' 0%, ' + cm.gradE + ' 100%)'; }}
                        />
                    </div>

                    <div className="flex items-center justify-between mt-3 px-1">
                      <div className="flex items-center gap-1.5 bg-white/80 border border-amber-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{gen.expire_days} Days</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 border border-green-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <TrendingUp className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{gen.roi}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/80 border border-blue-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <Users className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{gen.investors}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={'rounded-xl px-2 py-2 text-center border ' + (gen.price === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100")}>
                        <p className={'text-[10px] font-medium ' + (gen.price === 0 ? "text-green-500" : "text-gray-400")}>Rent Price</p>
                        <p className={'font-black text-sm ' + (gen.price === 0 ? "text-green-700" : "text-gray-900")}>{gen.price === 0 ? "FREE" : '$' + gen.price.toLocaleString()}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl px-2 py-2 text-center border border-green-100">
                        <p className="text-green-500 text-[10px] font-medium">Daily Income</p>
                        <p className="text-green-700 font-black text-sm">${gen.daily_income}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl px-2 py-2 text-center border border-amber-100">
                        <p className="text-amber-500 text-[10px] font-medium">Total Income</p>
                        <p className="text-amber-700 font-black text-sm">${(gen.daily_income * gen.expire_days).toFixed(2)}</p>
                      </div>
                    </div>

                    {activeUg && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-red-500" />
                          <span className="text-red-700 text-xs font-semibold">Expires in</span>
                        </div>
                        <Countdown expiresAt={new Date(activeUg.expires_at).getTime()} label="" />
                      </div>
                    )}
                    
                    {isMaxed ? (
                      <div className="flex flex-col gap-2">
                        <Button disabled
                          className="w-full bg-gray-100 border border-gray-300 text-gray-400 font-semibold rounded-xl h-10 sm:h-11 flex items-center gap-2 justify-center text-sm cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" /> {gen.id === 'pg1' ? 'Rented (1 only)' : `Max Reached (${rentedCount}/${maxRentals})`}
                        </Button>
                         { isRented &&
                            <Button variant="outline" onClick={() => router.push("/dashboard/power")}
                            className="w-full rounded-xl h-9 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1.5 justify-center">
                                <Zap className="w-3.5 h-3.5" /> Go to Power Page
                            </Button>
                         }
                        </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button
                          data-testid={'button-rent-' + gen.id}
                          onClick={() => handleRentClick(gen)}
                          disabled={isRenting === gen.id}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl h-10 sm:h-11 shadow-md transition-all flex items-center gap-2 justify-center text-sm"
                        >
                          {(() => {
                            const verb = gen.id === 'pg4' ? 'Buy' : 'Rent';
                            const verbing = gen.id === 'pg4' ? 'Purchasing' : 'Renting';
                            
                            if (isRenting === gen.id) {
                              return gen.price === 0 ? "Activating..." : `${verbing}...`;
                            }
                            if (isRented) {
                              return `${verb} Again (${rentedCount}/${maxRentals}) — ${gen.price === 0 ? "FREE" : '$' + gen.price.toLocaleString()}`;
                            }
                            return gen.price === 0 ? `Activate ${gen.name} — FREE` : `${verb} ${gen.name} — $${gen.price.toLocaleString()}`;
                          })()}
                        </Button>
                        {isRented && (
                          <Button variant="outline" onClick={() => router.push("/dashboard/power")}
                            className="w-full rounded-xl h-9 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1.5 justify-center">
                            <Zap className="w-3.5 h-3.5" /> Go to Power Page
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-amber-100/60 shadow-sm p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { icon: Shield, label: "Secured", value: "$50M+", color: "text-amber-600" },
              { icon: Users, label: "Investors", value: "26K+", color: "text-green-600" },
              { icon: TrendingUp, label: "Paid Out", value: "$8.2M+", color: "text-blue-600" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 sm:gap-2">
                <Icon className={'w-6 h-6 sm:w-8 sm:h-8 ' + color} />
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-gray-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden" data-testid="dialog-low-balance">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-5 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-black mb-1">Insufficient Balance</DialogTitle>
            <DialogDescription className="text-red-100 text-sm">
              You don't have enough funds to rent this generator.
            </DialogDescription>
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
            <p className="text-gray-500 text-xs text-center leading-relaxed">
              Deposit funds via MTN MOMO on the Bank page to top up your balance and activate this generator.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLowBalanceGen(null)}
                className="flex-1 rounded-xl h-11 font-semibold border-gray-200"
                data-testid="button-low-balance-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }}
                className="flex-1 rounded-xl h-11 font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md flex items-center gap-2 justify-center"
                data-testid="button-low-balance-deposit"
              >
                <ArrowDownToLine className="w-4 h-4" /> Deposit Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
