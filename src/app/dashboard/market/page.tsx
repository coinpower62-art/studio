'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, Wallet, Clock, Shield, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import { rentGeneratorAction } from "./actions";
import { cn } from "@/lib/utils";

function MarketPageSkeleton() {
  return (
    <div className="p-4 sm:p-8 space-y-6">
      <Skeleton className="h-20 w-3/4 mx-auto rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 w-full rounded-2xl" />)}
      </div>
    </div>
  );
}

export default function Market() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [generators, setGenerators] = useState<any[]>([]);
  const [rentedHistory, setRentedHistory] = useState<any[]>([]);
  const [lowBalanceGen, setLowBalanceGen] = useState<any>(null);
  const [isRenting, setIsRenting] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async function() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [pRes, rRes, gRes] = await Promise.all([
          supabase.from('profiles').select('balance').eq('id', user.id).maybeSingle(),
          supabase.from('rented_generators').select('*').eq('user_id', user.id),
          supabase.from('generators').select('*').eq('published', true).order('price', { ascending: true })
      ]);
      
      setProfile(pRes.data);
      setRentedHistory(rRes.data || []);
      setGenerators(gRes.data || []);
      setIsLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  const handleRentClick = async (gen: any) => {
    if (profile.balance < gen.price) return setLowBalanceGen(gen);
    setIsRenting(gen.id);
    const res = await rentGeneratorAction(gen.id);
    if (res.error) {
        toast({ title: "Rental Failed", description: res.error, variant: "destructive" });
    } else {
        toast({ title: "Generator Activated!" });
        fetchData();
    }
    setIsRenting(null);
  };

  if (isLoading || !profile) return <MarketPageSkeleton />;

  return (
    <div className="pb-20 px-4 max-w-7xl mx-auto">
      <div className="text-center py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Investment Market</h1>
        <p className="text-gray-500 text-sm mt-2">Rent a power generator and start earning daily returns.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {generators.map(gen => {
          const lifetimeCount = rentedHistory.filter(r => r.generator_id === gen.id).length;
          const activeCount = rentedHistory.filter(r => r.generator_id === gen.id && new Date(r.expires_at).getTime() > Date.now()).length;
          
          let isMaxed = false;
          let lockLabel = "";

          if (gen.id === 'pg1' && lifetimeCount >= 1) {
            isMaxed = true;
            lockLabel = "Trial Used (1/1)";
          } else if (gen.id === 'pg2' && lifetimeCount >= 2) {
            isMaxed = true;
            lockLabel = "Limit Reached (2/2)";
          } else if (activeCount >= 1) {
            isMaxed = true;
            lockLabel = "Plan Currently Active";
          }

          return (
            <div key={gen.id} className={cn(
                "bg-white rounded-3xl border-2 p-5 shadow-sm space-y-4 transition-all duration-300",
                isMaxed 
                  ? "border-gray-200 opacity-80 cursor-default" 
                  : "border-amber-200 hover:shadow-xl hover:border-amber-400 hover:-translate-y-1"
            )}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg text-gray-900">{gen.name}</h3>
                  <p className="text-xs text-gray-500 font-medium">{gen.subtitle}</p>
                </div>
                <Badge className={cn("border-0 font-bold px-3 py-1", isMaxed ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700")}>
                    {gen.roi} ROI
                </Badge>
              </div>

              <div className="aspect-video bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center p-4">
                <img src={gen.image_url || PlaceHolderImages.find(i => i.id === `gen-${gen.id}`)?.imageUrl} alt={gen.name} className={cn("w-full h-full object-contain", isMaxed && "grayscale opacity-50")} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-2.5 rounded-xl text-center"><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price</p><p className="font-bold text-sm text-gray-900">${gen.price}</p></div>
                <div className="bg-green-50 p-2.5 rounded-xl text-center"><p className="text-[10px] text-green-600 font-bold uppercase tracking-wider">Daily</p><p className="font-bold text-sm text-green-700">${gen.daily_income}</p></div>
                <div className="bg-amber-50 p-2.5 rounded-xl text-center"><p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Cycle</p><p className="font-bold text-sm text-amber-700">{gen.expire_days}d</p></div>
              </div>

              {isMaxed ? (
                <div className="w-full h-12 bg-gray-100 border border-gray-200 text-gray-500 rounded-2xl flex items-center justify-center font-bold text-sm gap-2">
                  <Shield className="w-4 h-4" /> {lockLabel}
                </div>
              ) : (
                <Button 
                  onClick={() => handleRentClick(gen)} 
                  disabled={isRenting === gen.id} 
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black shadow-lg shadow-amber-200/50"
                >
                  {isRenting === gen.id ? "Activating Plan..." : `Rent Tier - $${gen.price}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={() => setLowBalanceGen(null)}>
        <DialogContent className="rounded-3xl border-0 p-0 overflow-hidden max-w-sm mx-auto">
          <div className="bg-gradient-to-br from-red-500 to-orange-600 p-8 text-white text-center">
             <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-white" />
             </div>
             <h2 className="text-2xl font-black">Low Balance</h2>
             <p className="text-red-100 text-sm mt-2">You need at least <strong>${lowBalanceGen?.price}</strong> to activate this generator.</p>
          </div>
          <div className="p-6 bg-white space-y-3">
             <Button onClick={() => router.push("/dashboard/bank")} className="w-full bg-amber-500 h-12 rounded-xl text-white font-black shadow-lg">Deposit Now</Button>
             <button onClick={() => setLowBalanceGen(null)} className="w-full text-center text-xs font-bold text-gray-400 py-2">Maybe later</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
