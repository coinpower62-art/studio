'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [rentedHistory, setRentedHistory] = useState<RentedGenerator[]>([]);
  
  const [lowBalanceGen, setLowBalanceGen] = useState<any>(null);
  const [isRenting, setIsRenting] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async function() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [pRes, rRes, gRes] = await Promise.all([
          supabase.from('profiles').select('balance').eq('id', user.id).maybeSingle(),
          supabase.from('rented_generators').select('*').eq('user_id', user.id),
          supabase.from('generators').select('*').order('price', { ascending: true })
      ]);
      
      setProfile(pRes.data);
      setRentedHistory(rRes.data || []);
      setGenerators(gRes.data || []);
      setIsLoading(false);
  }, [router, supabase]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);
  
  const handleRentClick = async function(gen: Generator) {
    if (!profile) return;
    if (profile.balance < gen.price) {
       setLowBalanceGen(gen);
       return;
    }
    setIsRenting(gen.id);
    const result = await rentGeneratorAction(gen.id);
    if (!result.error) {
        toast({ title: "Generator rented!" });
        fetchData();
    } else {
        toast({ title: "Action Restricted", description: result.error, variant: "destructive" });
    }
    setIsRenting(null);
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  // Calculate lifetime rental counts for each generator
  const historicalRentedCounts = new Map<string, number>();
  rentedHistory.forEach(ug => historicalRentedCounts.set(ug.generator_id, (historicalRentedCounts.get(ug.generator_id) || 0) + 1));

  const colorMap: Record<string, any> = {
    "from-amber-400 to-orange-500": { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badgeLabel: "Popular" },
    "from-green-400 to-emerald-600": { bg: "from-green-50 to-emerald-50", border: "border-green-200", badgeLabel: "Recommended" },
    "from-blue-400 to-indigo-600": { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", badgeLabel: "High Yield" },
    "from-purple-500 to-pink-600": { bg: "from-purple-50 to-pink-50", border: "border-purple-200", badgeLabel: "Premium" },
  };

  return (
    <div className="pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">

        <div className="text-center py-4 sm:py-8 mb-2">
          <Badge className="mb-2 bg-amber-100 text-amber-700 border-0 px-3 py-1">
            <TrendingUp className="w-3 h-3 mr-1" />Live Market
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
            Investment <span className="text-amber-600">Generators</span>
          </h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Rent a generator and claim daily income every 24 hours.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {generators.filter(g => g.published).map((gen) => {
              const cm = colorMap[gen.color] || colorMap["from-amber-400 to-orange-500"];
              const count = historicalRentedCounts.get(gen.id) || 0;
              
              // Define permanent lifetime limits
              let max = gen.max_rentals ?? 1;
              if (gen.id === 'pg1') max = 1; // PG1 Trial can only be used once ever
              if (gen.id === 'pg2') max = 2; // PG2 can only be used twice ever

              const isMaxed = count >= max;

              return (
                <div key={gen.id} className={cn(
                    "bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden relative",
                    cm.border,
                    isMaxed 
                        ? "opacity-75 border-gray-200 shadow-none grayscale-[0.4]" 
                        : "border-amber-100 shadow-sm hover:shadow-xl hover:-translate-y-1"
                )}>
                  {isMaxed && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                      <div className="bg-red-600/90 text-white px-4 py-2 rounded-xl font-black text-sm rotate-[-12deg] shadow-2xl border-2 border-white">
                        PERMANENTLY DISCONNECTED
                      </div>
                    </div>
                  )}

                  <div className={cn("bg-gradient-to-r p-4 sm:p-5 border-b", cm.bg, cm.border)}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-gray-900 leading-tight">{gen.name}</h3>
                        <p className="text-gray-500 text-xs">{gen.subtitle}</p>
                      </div>
                      <Badge variant={isMaxed ? 'secondary' : 'default'} className={isMaxed ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700"}>
                        {isMaxed ? 'Limit Reached' : cm.badgeLabel}
                      </Badge>
                    </div>

                    <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden shadow-inner bg-white flex items-center justify-center">
                        <img
                          src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                          alt={gen.name}
                          className={cn("max-h-full max-w-full object-contain", isMaxed && "opacity-40")}
                        />
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Price</p>
                          <p className="font-black text-sm text-gray-900">${gen.price}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 border border-green-100">
                          <p className="text-[10px] text-green-500 font-bold uppercase">Daily</p>
                          <p className="font-black text-sm text-green-700">${gen.daily_income}</p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                          <p className="text-[10px] text-amber-500 font-bold uppercase">Used</p>
                          <p className={cn("font-black text-sm", isMaxed ? "text-red-600" : "text-amber-700")}>{count}/{max}</p>
                      </div>
                    </div>
                    
                    <Button 
                      disabled={isMaxed || isRenting === gen.id} 
                      onClick={() => handleRentClick(gen)} 
                      className={cn(
                          "w-full h-12 font-black shadow-lg transition-all relative z-20",
                          isMaxed ? "bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 text-white"
                      )}
                    >
                      {isRenting === gen.id ? 'PROCESSING...' : isMaxed ? 'UPGRADE REQUIRED' : `RENT ${gen.name.toUpperCase()}`}
                    </Button>
                    
                    {isMaxed && (
                      <p className="text-[10px] text-red-500 text-center mt-2 font-bold uppercase tracking-wider">
                        Lifetime usage limit reached for this plan.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-br from-red-500 to-orange-500 p-6 text-white text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-white text-xl font-black mb-1">Low Balance</DialogTitle>
            <DialogDescription className="text-red-100 text-sm">Add funds to rent this plan.</DialogDescription>
          </div>
          <div className="p-6 space-y-4">
             <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-xs font-bold uppercase">Plan Cost</span>
                  <span className="font-black text-gray-900">${lowBalanceGen?.price}</span>
            </div>
            <Button onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }} className="w-full bg-amber-50 h-12 font-black">DEPOSIT NOW</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
