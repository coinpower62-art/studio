'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, CheckCircle, Gift, Timer, AlertTriangle, DollarSign, Star, Play, Users, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';

import { collectEarnings } from "./actions";

type RentedGenerator = {
  id: string;
  user_id: string;
  generator_id: string;
  rented_at: string;
  expires_at: string;
  last_claimed_at: string | null;
  suspended: boolean;
  name: string;
  price: number;
  daily_income: number;
  expire_days: number;
  color: string;
  icon: string;
  subtitle: string;
  roi: string;
  period: string;
  investors: string;
  image_url?: string;
};

const CHART_PAIRS_P = [
  "BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","XRP/USDT",
  "ADA/USDT","DOGE/USDT","TON/USDT","TRX/USDT","MATIC/USDT",
  "AVAX/USDT","LINK/USDT","DOT/USDT","UNI/USDT","LTC/USDT",
];
const FIXED_PAIRS_P: Record<string, string> = {
  pg1: "BTC/USDT", pg2: "ETH/USDT", pg3: "BNB/USDT", pg4: "SOL/USDT",
};
function getGenPairP(genId: string): string {
  if (FIXED_PAIRS_P[genId]) return FIXED_PAIRS_P[genId];
  let h = 5381;
  for (let i = 0; i < genId.length; i++) h = ((h << 5) + h) ^ genId.charCodeAt(i);
  return CHART_PAIRS_P[Math.abs(h) % CHART_PAIRS_P.length];
}

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function RedCountdown({ targetMs }: { targetMs: number }) {
    const [remaining, setRemaining] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
      const tick = () => setRemaining(Math.max(0, targetMs - Date.now()));
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    }, [targetMs]);

    if (!isMounted) return <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" />;

    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    
    return (
      <div className="flex items-center justify-center gap-0.5">
        {[h, m, s].map(function(val, i) {
          return (
          <span key={i}>
            <span className="inline-block bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded min-w-[1.75rem] text-center">{String(val).padStart(2,"0")}</span>
            {i < 2 && <span className="text-red-500 font-black text-sm mx-0.5">:</span>}
          </span>
        ); })}
      </div>
    );
}

type PCandle = { o: number; h: number; l: number; c: number; v: number };

function LiveChart({ genId, dailyIncome, suspended, canCollect }: {
  genId: string; dailyIncome: number; genColor: string; suspended: boolean; canCollect: boolean;
}) {
  const W = 300, H = 130, N = 20;
  const PAD_L = 3, PAD_R = 46, PAD_T = 22, PAD_B = 4;
  const chartW = W - PAD_L - PAD_R;
  const mainH  = Math.round((H - PAD_T - PAD_B) * 0.70);
  const volH   = Math.round((H - PAD_T - PAD_B) * 0.22);
  const mainTop = PAD_T, mainBot = PAD_T + mainH;
  const volTop  = mainBot + 5, volBot = volTop + volH;

  const isActive = !suspended && !canCollect;
  const TICK_MS = 280, TICKS_PER_CANDLE = 18;
  const tickRef = useRef(0);
  
  const pSeed = useCallback(function(N: number): PCandle[] {
    let p = 42 + Math.random() * 16;
    return Array.from({ length: N }, function() {
      const move = (Math.random() - 0.48) * 8;
      const o = p, c = Math.max(6, Math.min(94, p + move));
      const h = Math.min(98, Math.max(o, c) + Math.random() * 3.5);
      const l = Math.max(2, Math.min(o, c) - Math.random() * 3.5);
      p = c;
      return { o, h, l, c, v: 15 + Math.random() * 70 };
    });
  }, []);

  const [candles, setCandles] = useState<PCandle[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCandles(pSeed(N));
  }, [pSeed]);

  useEffect(function() {
    if (!isActive || !isMounted) return;
    tickRef.current = 0;
    const tick = function() {
      setCandles(function(prev) {
        if (prev.length === 0) return prev;
        const arr = [...prev];
        const live = { ...arr[arr.length - 1] };
        const delta = (Math.random() - 0.49) * 2.4 + (Math.random() - 0.5) * 0.8;
        live.c = Math.max(5, Math.min(95, live.c + delta));
        if (live.c > live.h) live.h = live.c;
        if (live.c < live.l) live.l = live.c;
        live.v = Math.min(98, live.v + 1.5 + Math.random() * 3.5);
        arr[arr.length - 1] = live;
        tickRef.current += 1;
        if (tickRef.current >= TICKS_PER_CANDLE) {
          tickRef.current = 0;
          const lastC = live.c;
          return [...arr.slice(1), { o: lastC, c: lastC, h: lastC, l: lastC, v: 2 + Math.random() * 6 }];
        }
        return arr;
      });
    };
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [isActive, isMounted]);

  if (!isMounted || candles.length === 0) return <div className="w-full rounded-xl border bg-slate-900" style={{ height: H }} />;

  const minP   = Math.min(...candles.map(c => c.l)) - 2;
  const maxP   = Math.max(...candles.map(c => c.h)) + 2;
  const pRange = maxP - minP || 1;
  const maxVol = Math.max(...candles.map(c => c.v)) || 1;
  const toX    = (i: number) => PAD_L + (i + 0.5) * (chartW / N);
  const toPY   = (p: number) => mainTop + mainH * (1 - (p - minP) / pRange);
  const cw     = (chartW / N) * 0.62;

  const last   = candles[N - 1];
  const isUp   = last.c >= last.o;
  const priceColor = isActive ? (isUp ? "#22c55e" : "#f87171") : "#374151";
  const toPriceLabel = (p: number) => `$${(dailyIncome * (0.88 + (p / 96) * 0.26)).toFixed(3)}`;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border" style={{
      height: H,
      background: "linear-gradient(170deg,#070b0f 0%,#0b1119 100%)",
      borderColor: isActive ? (isUp ? "#22c55e33" : "#f8717133") : "#ffffff0a",
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {[0.25, 0.5, 0.75].map(function(f, i) {
          const y = mainTop + mainH * f;
          return (
            <g key={i}>
              <line x1={PAD_L} y1={y.toFixed(1)} x2={W - PAD_R} y2={y.toFixed(1)}
                stroke="#fff" strokeOpacity="0.05" strokeWidth="0.7" strokeDasharray="3,6" />
              <text x={W - PAD_R + 3} y={y + 3.5} fontSize="7" fill="#ffffff40" fontFamily="monospace">
                {toPriceLabel(minP + pRange * (1 - f))}
              </text>
            </g>
          );
        })}
        {candles.map(function(c, i) {
          const cx   = toX(i);
          const bull = c.c >= c.o;
          const col  = isActive ? (bull ? "#22c55e" : "#f87171") : "#374151";
          const bY1  = toPY(Math.max(c.o, c.c)), bY2 = toPY(Math.min(c.o, c.c));
          const bH   = Math.max(1, bY2 - bY1);
          const isLast = i === N - 1;
          return (
            <g key={i}>
              <line x1={cx.toFixed(1)} y1={toPY(c.h).toFixed(1)} x2={cx.toFixed(1)} y2={toPY(c.l).toFixed(1)}
                stroke={col} strokeWidth={isLast ? "1.2" : "0.9"} strokeOpacity="0.95" />
              <rect x={(cx - cw / 2).toFixed(1)} y={bY1.toFixed(1)}
                width={cw.toFixed(1)} height={bH.toFixed(1)}
                fill={col} fillOpacity={isLast ? "1" : "0.85"} rx="0.6" />
            </g>
          );
        })}
        {isActive && (function() {
          const py = toPY(last.c);
          return (
            <>
              <line x1={PAD_L} y1={py.toFixed(1)} x2={W - PAD_R} y2={py.toFixed(1)}
                stroke={priceColor} strokeOpacity="0.55" strokeWidth="0.8" strokeDasharray="4,3" />
              <rect x={W - PAD_R} y={(py - 7).toFixed(1)} width={PAD_R} height="14"
                fill={priceColor} fillOpacity="0.9" rx="2" />
              <text x={W - PAD_R + 3} y={(py + 3.5).toFixed(1)} fontSize="7.5" fill="#fff" fontFamily="monospace" fontWeight="bold">
                {toPriceLabel(last.c)}
              </text>
            </>
          );
        })()}
      </svg>
      <div className="absolute top-1.5 left-2.5 right-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          {canCollect ? (
            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">⚡ INCOME READY</span>
          ) : suspended ? (
            <span className="bg-red-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">⏸ SUSPENDED</span>
          ) : (
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />LIVE
            </span>
          )}
          <span className="text-[8px] text-white/20 font-mono">{getGenPairP(genId)}</span>
        </div>
      </div>
    </div>
  );
}

function LiveEarningsCounter({ lastRef, dailyIncome, active }: {
  lastRef: number; dailyIncome: number; active: boolean;
}) {
  const [earned, setEarned] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!active) { setEarned(dailyIncome); return; }
    const tick = () => {
      const elapsed = Date.now() - lastRef;
      const fraction = Math.min(1, elapsed / TWENTY_FOUR_H);
      setEarned(fraction * dailyIncome);
    };
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [active, dailyIncome, lastRef]);

  if (!isMounted) return <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />;

  const [whole, dec] = earned.toFixed(6).split(".");

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-0.5 font-mono">
        <span className="text-[10px] text-green-600 font-bold">$</span>
        <span className="text-lg font-black text-green-700 tracking-tight leading-none">{whole}.{dec?.slice(0, 2)}</span>
        <span className="text-xs font-black text-green-600 leading-none">.{dec?.slice(2, 4)}</span>
        <span className="text-[10px] font-bold text-green-500 leading-none">.{dec?.slice(4, 6)}</span>
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5">of ${dailyIncome.toFixed(2)}</p>
    </div>
  );
}

function GeneratorCard({ ug, onClaim, isClaiming }: { ug: RentedGenerator; onClaim: (id: string) => void; isClaiming: boolean; }) {
  const router = useRouter();
  const now = Date.now();
  const expiresAtMs = new Date(ug.expires_at).getTime();
  const isSuspended = ug.suspended && expiresAtMs > now;
  const lastRef = ug.last_claimed_at ? new Date(ug.last_claimed_at).getTime() : new Date(ug.rented_at).getTime();
  const periodsReady = !isSuspended ? Math.floor((Math.min(now, expiresAtMs) - lastRef) / TWENTY_FOUR_H) : 0;
  const canCollect = !isSuspended && periodsReady > 0;
  const isExpired = expiresAtMs <= now;
  const nextCreditAt = lastRef + TWENTY_FOUR_H;

  const cardColor = ug.color || 'from-gray-400 to-gray-500';
  const imageUrl = ug.image_url || PlaceHolderImages.find(i => i.id === `gen-${ug.generator_id}`)?.imageUrl;

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${isExpired && !canCollect ? "border-gray-200 opacity-60" : "border-amber-200"}`}>
      <div className={`bg-gradient-to-r ${isSuspended ? "from-gray-400 to-gray-500" : cardColor} p-4 flex items-center justify-between text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0 bg-white">
            {imageUrl && <img src={imageUrl} alt={ug.name} className="w-full h-full object-contain" />}
          </div>
          <div>
            <p className="font-black text-base">{ug.name}</p>
            <p className="text-white/70 text-xs">${ug.price.toLocaleString()} · {ug.expire_days}d</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xl font-black">${ug.daily_income.toFixed(2)}</p>
          <p className="text-white/70 text-xs">per day</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {!isExpired && !canCollect && <LiveChart genId={ug.id} dailyIncome={ug.daily_income} genColor={ug.color} suspended={isSuspended} canCollect={canCollect} />}

        {canCollect ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <div>
                    <p className="text-green-800 font-bold text-sm">Income Ready!</p>
                    <p className="text-green-600 text-xs">Total: <span className="font-black">${(periodsReady * ug.daily_income).toFixed(2)}</span></p>
                </div>
                <Button onClick={() => onClaim(ug.id)} disabled={isClaiming} className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl h-9">
                    {isClaiming ? "..." : "Collect"}
                </Button>
            </div>
        ) : isSuspended ? (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
                <p className="text-red-800 font-bold text-sm">Suspended</p>
                <Button onClick={() => router.push("/dashboard/bank")} size="sm" className="mt-2 bg-red-600 text-white">Deposit to Resume</Button>
            </div>
        ) : !isExpired && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-amber-800 font-semibold text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Earning</span>
                    <LiveEarningsCounter lastRef={lastRef} dailyIncome={ug.daily_income} active={true} />
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                    <p className="text-amber-700 text-[10px] font-semibold uppercase">Collectable in</p>
                    <RedCountdown targetMs={nextCreditAt} />
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default function Power() {
  const router = useRouter();
  const { toast } = useToast();
  const [rentedGenerators, setRentedGenerators] = useState<RentedGenerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimedInfo, setClaimedInfo] = useState<{ amount: number; generatorName: string } | null>(null);
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: rentedResult } = await supabase.from('rented_generators').select('*, generators(*)').eq('user_id', user.id);

    if (rentedResult) {
      setRentedGenerators(rentedResult.map(rg => ({
        ...rg,
        name: rg.generators?.name ?? 'Generator',
        price: rg.generators?.price ?? 0,
        daily_income: rg.generators?.daily_income ?? 0,
        expire_days: rg.generators?.expire_days ?? 0,
        color: rg.generators?.color ?? 'gray',
        icon: rg.generators?.icon ?? '?',
        image_url: rg.generators?.image_url,
      })));
    }
    setIsLoading(false);
  }, [supabase, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClaim = async (id: string) => {
    setIsClaimingId(id);
    const result = await collectEarnings(id);
    if (result.success) {
      const gen = rentedGenerators.find(g => g.id === id);
      setClaimedInfo({ amount: result.earned!, generatorName: gen?.name || 'Generator' });
      fetchData();
    } else {
      toast({ variant: "destructive", title: "Cannot claim", description: result.message });
    }
    setIsClaimingId(null);
  };

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 rounded-2xl" /></div>;

  const now = Date.now();
  const active = rentedGenerators.filter(ug => new Date(ug.expires_at).getTime() > now || (new Date(ug.expires_at).getTime() <= now && Math.floor((new Date(ug.expires_at).getTime() - (ug.last_claimed_at ? new Date(ug.last_claimed_at).getTime() : new Date(ug.rented_at).getTime())) / TWENTY_FOUR_H) > 0));

  return (
    <div className="pb-20 min-h-screen -mx-4 -mt-6">
        <div className="bg-gradient-to-b from-amber-600 to-amber-700 p-6 pt-10 rounded-b-3xl shadow-xl text-white mb-6">
            <h1 className="text-3xl font-black">Power Center</h1>
            <p className="text-amber-100 text-sm mt-1">Collect your daily mining returns every 24 hours.</p>
        </div>

        <div className="px-4 space-y-4">
            {active.length === 0 ? (
                <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-200">
                    <Zap className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-medium">No active generators.</p>
                    <Button onClick={() => router.push("/dashboard/market")} className="mt-4 bg-amber-500">Visit Market</Button>
                </div>
            ) : (
                active.map(ug => <GeneratorCard key={ug.id} ug={ug} onClaim={handleClaim} isClaiming={isClaimingId === ug.id} />)
            )}
        </div>

        {claimedInfo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-6 text-center max-w-xs w-full shadow-2xl animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <DollarSign className="text-green-600 w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900">Income Collected!</h3>
                    <p className="text-4xl font-black text-green-600 mt-2">+${claimedInfo.amount.toFixed(2)}</p>
                    <p className="text-gray-500 text-xs mt-2">Added to your main balance.</p>
                    <Button onClick={() => setClaimedInfo(null)} className="mt-6 w-full bg-amber-500 font-bold h-12 rounded-xl">Awesome!</Button>
                </div>
            </div>
        )}
    </div>
  );
}
