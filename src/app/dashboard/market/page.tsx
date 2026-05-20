'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, CheckCircle, Wallet, ArrowDownToLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { createClient } from "@/lib/supabase/client";
import { rentGeneratorAction } from "./actions";

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
    if (res.error) toast({ title: res.error, variant: "destructive" });
    else { toast({ title: "Generator Activated!" }); fetchData(); }
    setIsRenting(null);
  };

  if (isLoading || !profile) return <div className="p-8"><Skeleton className="h-96 w-full rounded-2xl" /></div>;

  return (
    <div className="pb-20 px-4 max-w-7xl mx-auto">
      <div className="text-center py-8">
        <h1 className="text-2xl font-black text-gray-900">Investment Market</h1>
        <p className="text-gray-500 text-sm">Strict lifetime limits applied to PG1 and PG2 tiers.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {generators.map(gen => {
          const lifetimeCount = rentedHistory.filter(r => r.generator_id === gen.id).length;
          const activeCount = rentedHistory.filter(r => r.generator_id === gen.id && new Date(r.expires_at).getTime() > Date.now()).length;
          
          let isPermanentlyLocked = false;
          let lockReason = "";

          if (gen.id === 'pg1' && lifetimeCount >= 1) {
            isPermanentlyLocked = true;
            lockReason = "Lifetime Limit Reached (1/1)";
          } else if (gen.id === 'pg2' && lifetimeCount >= 2) {
            isPermanentlyLocked = true;
            lockReason = "Lifetime Limit Reached (2/2)";
          }

          return (
            <div key={gen.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm space-y-4 ${isPermanentlyLocked ? 'opacity-70 grayscale' : 'border-amber-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-lg">{gen.name}</h3>
                  <p className="text-xs text-gray-500">{gen.subtitle}</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700">{gen.roi} ROI</Badge>
              </div>

              <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                <img src={gen.image_url || PlaceHolderImages.find(i => i.id === `gen-${gen.id}`)?.imageUrl} alt={gen.name} className="w-full h-full object-contain" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-[10px] text-gray-400">Price</p><p className="font-bold text-sm">${gen.price}</p></div>
                <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-[10px] text-gray-400">Daily</p><p className="font-bold text-sm">${gen.daily_income}</p></div>
                <div className="bg-gray-50 p-2 rounded-lg text-center"><p className="text-[10px] text-gray-400">Cycle</p><p className="font-bold text-sm">{gen.expire_days}d</p></div>
              </div>

              {isPermanentlyLocked ? (
                <Button disabled className="w-full h-12 bg-gray-200 text-gray-500 rounded-xl font-bold">{lockReason}</Button>
              ) : (
                <Button onClick={() => handleRentClick(gen)} disabled={isRenting === gen.id} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold">
                  {isRenting === gen.id ? "Processing..." : `Rent Tier - $${gen.price}`}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!lowBalanceGen} onOpenChange={() => setLowBalanceGen(null)}>
        <DialogContent className="rounded-3xl">
          <div className="text-center py-4">
             <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Wallet className="text-red-600" /></div>
             <h2 className="text-xl font-bold">Low Balance</h2>
             <p className="text-sm text-gray-500 mt-2">You need ${lowBalanceGen?.price} to activate this plan.</p>
             <Button onClick={() => router.push("/dashboard/bank")} className="mt-6 w-full bg-amber-500 h-12 rounded-xl text-white font-bold">Top Up Now</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
