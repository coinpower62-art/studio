'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, Timer, Wallet, ArrowDownToLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';
import { rentGeneratorAction } from "./actions";
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
      
      if (profileError) console.error("MarketPage: Profile fetch failed.");
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
  const totalRentedCounts = new Map<string, number>();

  rentedGenerators.forEach(function(ug: RentedGenerator) {
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

        {publishedGenerators.map((gen) => {
          const cm = colorMap[gen.color] || colorMap["from-amber-400 to-orange-500"];
          
          const totalHistory = totalRentedCounts.get(gen.id) || 0;
          const isActive = (activeRentedCounts.get(gen.id) || 0) > 0;
          
          // Use dynamic limit from database
          const limit = gen.max_rentals || 1;
          const isMaxed = totalHistory >= limit || isActive;
          
          let limitLabel = `Usage: ${totalHistory}/${limit}`;
          if (totalHistory >= limit) limitLabel = `Limit Reached (${totalHistory}/${limit})`;
          if (isActive) limitLabel = "Active Plan running";

          return (
            <div key={gen.id} data-testid={'card-generator-' + gen.id}
              className={cn(
                "bg-white rounded-2xl border-2 mb-6 shadow-sm overflow-hidden",
                cm.border,
                isMaxed ? "opacity-80 grayscale-[0.5]" : "hover:shadow-lg transition-all duration-300"
              )}>

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
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", isMaxed ? "text-red-700 bg-red-100 border-red-200" : "text-amber-700 bg-amber-100/50 border-amber-200")}>
                        {limitLabel}
                    </span>
                  </div>
                </div>

                <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden shadow-inner bg-white mb-3">
                    <img
                      src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                      alt={gen.name}
                      className={cn("w-full h-full object-contain", isMaxed && "opacity-50")}
                    />
                </div>

                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 bg-white/80 border border-amber-200 rounded-lg px-2 py-1 shadow-sm">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span className="text-[10px] font-bold text-gray-800">{gen.expire_days} Days</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 border border-green-200 rounded-lg px-2 py-1 shadow-sm">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] font-bold text-gray-800">{gen.roi}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/80 border border-blue-200 rounded-lg px-2 py-1 shadow-sm">
                    <Users className="w-3 h-3 text-blue-500" />
                    <span className="text-[10px] font-bold text-gray-800">{gen.investors}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className={'rounded-xl px-2 py-2 text-center border ' + (gen.price === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100")}>
                    <p className="text-[10px] font-medium text-gray-400">Rent Price</p>
                    <p className="font-black text-sm text-gray-900">{gen.price === 0 ? "FREE" : '$' + gen.price.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl px-2 py-2 text-center border border-green-100">
                    <p className="text-green-500 text-[10px] font-medium">Daily Income</p>
                    <p className="text-green-700 font-black text-sm">${gen.daily_income.toFixed(2)}</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl px-2 py-2 text-center border border-amber-100">
                    <p className="text-amber-500 text-[10px] font-medium">Total Income</p>
                    <p className="text-amber-700 font-black text-sm">${(gen.daily_income * gen.expire_days).toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    data-testid={'button-rent-' + gen.id}
                    onClick={() => handleRentClick(gen)}
                    disabled={isRenting === gen.id || isMaxed}
                    className={cn(
                      "w-full h-11 font-black rounded-xl flex items-center gap-2 justify-center text-sm",
                      isMaxed 
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" 
                      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md transition-all"
                    )}
                  >
                    {isRenting === gen.id ? "Processing..." : isMaxed ? "Plan Restricted" : gen.price === 0 ? "Activate Free Plan" : `Rent ${gen.name} — $${gen.price.toLocaleString()}`}
                  </Button>
                  
                  {isActive && (
                    <Button variant="outline" onClick={() => router.push("/dashboard/power")}
                      className="w-full rounded-xl h-10 text-xs font-bold border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1.5 justify-center">
                      <Zap className="w-3.5 h-3.5" /> View Active Plan
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-2xl border border-amber-100/60 shadow-sm p-6 text-center">
          <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-4">Secured Platform</p>
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-6 h-6 text-amber-600" />
              <p className="text-sm font-bold text-gray-900">Protected</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Users className="w-6 h-6 text-green-600" />
              <p className="text-sm font-bold text-gray-900">26K+ Members</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Timer className="w-6 h-6 text-blue-600" />
              <p className="text-sm font-bold text-gray-900">Fast Payouts</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 text-white text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-inner">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-white text-2xl font-black mb-1">Low Balance</DialogTitle>
            <DialogDescription className="text-red-100 text-sm">
              Your account balance is insufficient for this rental.
            </DialogDescription>
          </div>
          <div className="p-6 space-y-4 bg-white">
            {lowBalanceGen && profile && (
              <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs font-bold uppercase">Required</span>
                  <span className="font-black text-gray-900">${lowBalanceGen.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-gray-500 text-xs font-bold uppercase">Balance</span>
                  <span className="font-black text-red-600">${profile.balance.toFixed(2)}</span>
                </div>
              </div>
            )}
            <Button
                onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }}
                className="w-full rounded-2xl h-12 font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg flex items-center gap-2 justify-center"
              >
                <ArrowDownToLine className="w-4 h-4" /> Go to Bank
            </Button>
            <button onClick={() => setLowBalanceGen(null)} className="w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Cancel and Return
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
