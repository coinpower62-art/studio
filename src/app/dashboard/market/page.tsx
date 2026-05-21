
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
  const [profile, setProfile] = useState<any>(null);
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
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsRenting(null);
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  const now = Date.now();
  const historicalRentedCounts = new Map<string, number>();
  rentedHistory.forEach(ug => historicalRentedCounts.set(ug.generator_id, (historicalRentedCounts.get(ug.generator_id) || 0) + 1));

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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {generators.filter(g => g.published).map((gen) => {
              const count = historicalRentedCounts.get(gen.id) || 0;
              const max = gen.id === 'pg2' ? 2 : (gen.max_rentals ?? 1);
              const isMaxed = count >= max;
              const activeUg = rentedHistory.find(ug => ug.generator_id === gen.id && new Date(ug.expires_at).getTime() > now);

              return (
                <div key={gen.id} className={cn(
                    "bg-white rounded-2xl border-2 p-5 transition-all duration-300",
                    isMaxed 
                        ? "opacity-60 border-gray-100 cursor-not-allowed shadow-none scale-100" 
                        : "border-amber-100 hover:shadow-2xl hover:-translate-y-1 shadow-sm"
                )}>
                  <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-gray-900 leading-tight">{gen.name}</h3>
                        <p className="text-gray-500 text-xs">{gen.subtitle}</p>
                      </div>
                      <Badge variant={isMaxed ? 'secondary' : 'default'} className={isMaxed ? "bg-gray-200" : "bg-amber-100 text-amber-700"}>
                        {isMaxed ? 'Limit Reached' : 'Available'}
                      </Badge>
                  </div>

                  <div className="w-full h-48 sm:h-56 rounded-xl overflow-hidden mb-4 bg-gray-50 flex items-center justify-center">
                      <img
                        src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-' + gen.id)?.imageUrl}
                        alt={gen.name}
                        className="max-h-full max-w-full object-contain"
                      />
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Price</p>
                        <p className="font-black text-sm text-gray-900">${gen.price}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-[10px] text-green-500 font-bold uppercase">Daily</p>
                        <p className="font-black text-sm text-green-700">${gen.daily_income}</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-2">
                        <p className="text-[10px] text-amber-500 font-bold uppercase">Usage</p>
                        <p className="font-black text-sm text-amber-700">{count}/{max}</p>
                    </div>
                  </div>

                  {activeUg && (
                    <div className="mb-3 bg-red-50 p-3 rounded-xl flex justify-between items-center border border-red-100">
                      <span className="text-xs font-bold text-red-600">Active Cycle</span>
                      <Countdown expiresAt={new Date(activeUg.expires_at).getTime()} label="" />
                    </div>
                  )}
                  
                  <Button 
                    disabled={isMaxed || isRenting === gen.id} 
                    onClick={() => handleRentClick(gen)} 
                    className={cn(
                        "w-full h-12 font-black shadow-lg transition-all",
                        isMaxed ? "bg-gray-100 text-gray-400" : "bg-amber-500 hover:bg-amber-600 text-white"
                    )}
                  >
                    {isRenting === gen.id ? 'PROCESSING...' : isMaxed ? 'LIMIT REACHED' : `RENT ${gen.name.toUpperCase()}`}
                  </Button>
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
            <DialogDescription className="text-red-100 text-sm">
                Add funds to rent this plan.
            </DialogDescription>
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
