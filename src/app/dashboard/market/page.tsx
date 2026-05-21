'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, CheckCircle, Timer, Wallet, ArrowDownToLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';
import { rentGeneratorAction } from "./actions";
import { cn } from "@/lib/utils";

type RentedGenerator = {
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

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);
  
  const handleRentClick = async (gen: Generator) => {
    if (profile.balance < gen.price) { setLowBalanceGen(gen); return; }
    setIsRenting(gen.id);
    const result = await rentGeneratorAction(gen.id);
    if (!result.error) { toast({ title: "Generator rented!" }); fetchData(); }
    else toast({ title: "Error", description: result.error, variant: "destructive" });
    setIsRenting(null);
  };

  if (isLoading || !profile) return <div className="p-10 text-center text-gray-500">Loading Market...</div>;

  const now = Date.now();
  const historicalRentedCounts = new Map<string, number>();
  rentedHistory.forEach(ug => historicalRentedCounts.set(ug.generator_id, (historicalRentedCounts.get(ug.generator_id) || 0) + 1));

  return (
    <div className="pb-20 max-w-7xl mx-auto px-4">
      <div className="text-center py-8">
          <Badge className="bg-amber-100 text-amber-700 px-3 py-1 mb-2"><TrendingUp className="w-3 h-3 mr-1" />Live Market</Badge>
          <h1 className="text-3xl font-black text-gray-900">Investment <span className="text-amber-600">Generators</span></h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {generators.filter(g => g.published).map(gen => {
          const count = historicalRentedCounts.get(gen.id) || 0;
          const max = gen.id === 'pg2' ? 2 : (gen.max_rentals ?? 1);
          const isMaxed = count >= max;
          const activeUg = rentedHistory.find(ug => ug.generator_id === gen.id && new Date(ug.expires_at).getTime() > now);

          return (
            <div key={gen.id} className={cn(
                "bg-white rounded-2xl border-2 p-5 transition-all duration-300",
                isMaxed ? "opacity-60 border-gray-100" : "border-amber-100 hover:shadow-2xl hover:-translate-y-1"
            )}>
              <div className="flex justify-between items-start mb-4">
                  <div><h3 className="font-black text-lg text-gray-900">{gen.name}</h3><p className="text-xs text-gray-500">{gen.subtitle}</p></div>
                  <Badge variant={isMaxed ? 'secondary' : 'default'} className={isMaxed ? "bg-gray-200" : "bg-amber-100 text-amber-700"}>{isMaxed ? 'Limit Reached' : 'Available'}</Badge>
              </div>
              <div className="h-48 bg-gray-50 rounded-xl mb-4 overflow-hidden"><img src={gen.image_url || PlaceHolderImages.find(i => i.id === 'gen-'+gen.id)?.imageUrl} className="w-full h-full object-contain" /></div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-[10px] text-gray-400 font-bold uppercase">Price</p><p className="font-black text-sm text-gray-900">${gen.price}</p></div>
                  <div className="bg-green-50 rounded-lg p-2"><p className="text-[10px] text-green-500 font-bold uppercase">Daily</p><p className="font-black text-sm text-green-700">${gen.daily_income}</p></div>
                  <div className="bg-amber-50 rounded-lg p-2"><p className="text-[10px] text-amber-500 font-bold uppercase">Usage</p><p className="font-black text-sm text-amber-700">{count}/{max}</p></div>
              </div>
              {activeUg && <div className="bg-red-50 p-3 rounded-xl mb-3 flex justify-between items-center"><span className="text-xs font-bold text-red-600">Active Cycle</span><Countdown expiresAt={new Date(activeUg.expires_at).getTime()} label="" /></div>}
              <Button disabled={isMaxed || isRenting === gen.id} onClick={() => handleRentClick(gen)} className={cn("w-full h-12 font-black shadow-lg", isMaxed ? "bg-gray-100 text-gray-400" : "bg-amber-500 hover:bg-amber-600 text-white")}>
                {isRenting === gen.id ? 'PROCESSING...' : isMaxed ? 'LIMIT REACHED' : `RENT ${gen.name.toUpperCase()}`}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}