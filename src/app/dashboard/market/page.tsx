'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from '@/hooks/use-user-store';
import { useUser as useAuthUser } from '@/firebase';
import { generators as allGenerators, type Generator } from '@/lib/data';
import { Zap, TrendingUp, Clock, Star, Users, Shield, CheckCircle, AlertCircle, Timer, Wallet, ArrowDownToLine, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import TickerTape from "@/components/TickerTape";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import type { RentedGenerator } from "@/hooks/use-user-store";

const CHART_PAIRS = [
  "BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","XRP/USDT",
  "ADA/USDT","DOGE/USDT","TON/USDT","TRX/USDT","MATIC/USDT",
  "AVAX/USDT","LINK/USDT","DOT/USDT","UNI/USDT","LTC/USDT",
];
const FIXED_PAIRS: Record<string, string> = {
  pg1: "BTC/USDT", pg2: "ETH/USDT", pg3: "BNB/USDT", pg4: "SOL/USDT",
};
function getGenPair(genId: string): string {
  if (FIXED_PAIRS[genId]) return FIXED_PAIRS[genId];
  let h = 5381;
  for (let i = 0; i < genId.length; i++) h = ((h << 5) + h) ^ genId.charCodeAt(i);
  return CHART_PAIRS[Math.abs(h) % CHART_PAIRS.length];
}

const generatorImages: Record<string, string | undefined> = {
  pg1: PlaceHolderImages.find(i => i.id === 'gen-pg1')?.imageUrl,
  pg2: PlaceHolderImages.find(i => i.id === 'gen-pg2')?.imageUrl,
  pg3: PlaceHolderImages.find(i => i.id === 'gen-pg3')?.imageUrl,
  pg4: PlaceHolderImages.find(i => i.id === 'gen-pg4')?.imageUrl,
};

function useOnVisible(fn: () => void) {
  useEffect(() => {
    const h = () => { if (!document.hidden) fn(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function Countdown({ expiresAt, label = "Expires" }: { expiresAt: number; label?: string }) {
  const [remaining, setRemaining] = useState(expiresAt - Date.now());
  const sync = () => setRemaining(expiresAt - Date.now());
  useOnVisible(sync);
  useEffect(() => {
    const t = setInterval(sync, 1000);
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

type Candle = { o: number; h: number; l: number; c: number; v: number };
function seedCandles(N: number): Candle[] {
  let p = 42 + Math.random() * 16;
  return Array.from({ length: N }, () => {
    const move = (Math.random() - 0.48) * 8;
    const o = p, c = Math.max(6, Math.min(94, p + move));
    const h = Math.min(98, Math.max(o, c) + Math.random() * 3.5);
    const l = Math.max(2, Math.min(o, c) - Math.random() * 3.5);
    p = c;
    return { o, h, l, c, v: 15 + Math.random() * 70 };
  });
}
function openCandle(closePrice: number): Candle {
  return { o: closePrice, c: closePrice, h: closePrice, l: closePrice, v: 2 + Math.random() * 6 };
}

function LiveChart({ genId, dailyIncome, color, isRented }: {
  genId: string; dailyIncome: number; color: string; isRented: boolean;
}) {
  const W = 300, H = 130, N = 20;
  const PAD_L = 3, PAD_R = 46, PAD_T = 22, PAD_B = 4;
  const chartW = W - PAD_L - PAD_R;
  const mainH = Math.round((H - PAD_T - PAD_B) * 0.70);
  const volH  = Math.round((H - PAD_T - PAD_B) * 0.22);
  const mainTop = PAD_T, mainBot = PAD_T + mainH;
  const volTop  = mainBot + 5, volBot = volTop + volH;

  const TICK_MS = 280, TICKS_PER_CANDLE = 18;
  const tickRef = useRef(0);
  const [candles, setCandles] = useState<Candle[]>(() => seedCandles(N));

  useEffect(() => {
    if (!isRented) return;
    tickRef.current = 0;
    const tick = () => {
      if (document.hidden) return;
      setCandles(prev => {
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
          return [...arr.slice(1), openCandle(live.c)];
        }
        return arr;
      });
    };
    const id = setInterval(tick, TICK_MS);
    /* Immediately continue chart when user returns to tab */
    const onVisible = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isRented]);

  const minP = Math.min(...candles.map(c => c.l)) - 2;
  const maxP = Math.max(...candles.map(c => c.h)) + 2;
  const pRange = maxP - minP || 1;
  const maxVol = Math.max(...candles.map(c => c.v)) || 1;
  const toX  = (i: number) => PAD_L + (i + 0.5) * (chartW / N);
  const toPY = (p: number) => mainTop + mainH * (1 - (p - minP) / pRange);
  const toVY = (v: number) => volBot  - volH  * (v / maxVol);
  const cw   = (chartW / N) * 0.62;

  const last  = candles[N - 1];
  const isUp  = last.c >= last.o;
  const priceColor = isRented ? (isUp ? "#22c55e" : "#f87171") : "#374151";
  const toPriceLabel = (p: number) => `$${(dailyIncome * (0.88 + (p / 96) * 0.26)).toFixed(3)}`;

  return (
    <div className="relative w-full rounded-xl overflow-hidden border" style={{
      height: H,
      background: "linear-gradient(170deg,#070b0f 0%,#0b1119 100%)",
      borderColor: isRented ? (isUp ? "#22c55e33" : "#f8717133") : "#ffffff0a",
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Horizontal grid lines */}
        {[0.25, 0.5, 0.75].map((f, i) => {
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
        {/* Vol separator */}
        <line x1={PAD_L} y1={(mainBot + 2).toFixed(1)} x2={W - PAD_R} y2={(mainBot + 2).toFixed(1)}
          stroke="#fff" strokeOpacity="0.06" strokeWidth="0.5" />
        {/* Candles + volume bars */}
        {candles.map((c, i) => {
          const cx   = toX(i);
          const bull = c.c >= c.o;
          const col  = isRented ? (bull ? "#22c55e" : "#f87171") : "#374151";
          const bY1  = toPY(Math.max(c.o, c.c)), bY2 = toPY(Math.min(c.o, c.c));
          const bH   = Math.max(1, bY2 - bY1);
          const isLast = i === N - 1;
          return (
            <g key={i}>
              {/* Wick */}
              <line x1={cx.toFixed(1)} y1={toPY(c.h).toFixed(1)} x2={cx.toFixed(1)} y2={toPY(c.l).toFixed(1)}
                stroke={col} strokeWidth={isLast ? "1.2" : "0.9"} strokeOpacity="0.95" />
              {/* Body */}
              <rect x={(cx - cw / 2).toFixed(1)} y={bY1.toFixed(1)}
                width={cw.toFixed(1)} height={bH.toFixed(1)}
                fill={col} fillOpacity={isLast ? "1" : "0.85"} rx="0.6" />
              {/* Volume bar */}
              <rect x={(cx - cw / 2).toFixed(1)} y={toVY(c.v).toFixed(1)}
                width={cw.toFixed(1)} height={(volBot - toVY(c.v)).toFixed(1)}
                fill={bull ? "#3b82f655" : "#a855f755"} rx="0.4" />
            </g>
          );
        })}
        {/* Current price dashed line + tag */}
        {isRented && (() => {
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

      {/* Top bar */}
      <div className="absolute top-1.5 left-2.5 right-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5">
          {isRented ? (
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />LIVE
            </span>
          ) : (
            <span className="bg-white/10 text-white/35 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/10">
              INACTIVE
            </span>
          )}
          <span className="text-[8px] text-white/20 font-mono">{getGenPair(genId)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-black font-mono" style={{ color: isRented ? priceColor : "#ffffff25" }}>
            ${dailyIncome.toFixed(2)}/day
          </span>
        </div>
      </div>

      {/* Frozen overlay */}
      {!isRented && (
        <div className="absolute inset-0 flex items-center justify-center z-20"
          style={{ background: "rgba(0,0,0,0.55)" }}>
          <div className="text-center">
            <p className="text-white/45 text-[10px] font-bold">📊 Signal Inactive</p>
            <p className="text-white/25 text-[9px] mt-0.5">Rent to activate live chart</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Market() {
  const router = useRouter();
  const { toast } = useToast();
  const [lowBalanceGen, setLowBalanceGen] = useState<{ name: string; price: number } | null>(null);
  const [isRenting, setIsRenting] = useState<string | null>(null);

  const { user, isUserLoading } = useAuthUser();
  const { balance, rentedGenerators, rentGenerator } = useUserStore();
  const generators = allGenerators;
  
  const handleRentClick = (gen: Generator) => {
    setIsRenting(gen.id);
    const result = rentGenerator(gen.id);

    if (result === 'insufficient_funds') {
      setLowBalanceGen({ name: gen.name, price: gen.price });
      setIsRenting(null);
    } else {
      toast({ title: "Generator rented!", description: "Moves to your Power page. Claim daily income every 24 hours." });
      setTimeout(() => setIsRenting(null), 1000);
    }
  };

  if (isUserLoading) return (
    <div className="pt-12 p-4 pb-20 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
      </div>
    </div>
  );
  if (!user) { router.push("/signin"); return null; }

  const now = Date.now();
  const activeRentedCounts = new Map<string, number>();
  rentedGenerators.filter((ug: RentedGenerator) => ug.rentalEndTime.toMillis() > now).forEach((ug: RentedGenerator) => {
    activeRentedCounts.set(ug.generatorId, (activeRentedCounts.get(ug.generatorId) || 0) + 1);
  });

  const colorMap: Record<string, { bg: string; border: string; badge: string; badgeText: string; gradS: string; gradE: string; badgeLabel: string }> = {
    amber: { bg: "from-amber-50 to-orange-50", border: "border-amber-200", badge: "bg-amber-100", badgeText: "text-amber-700", gradS: "#f59e0b", gradE: "#f97316", badgeLabel: "Popular" },
    green: { bg: "from-green-50 to-emerald-50", border: "border-green-200", badge: "bg-green-100", badgeText: "text-green-700", gradS: "#22c55e", gradE: "#059669", badgeLabel: "Recommended" },
    blue: { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", badge: "bg-blue-100", badgeText: "text-blue-700", gradS: "#3b82f6", gradE: "#4f46e5", badgeLabel: "High Yield" },
    purple: { bg: "from-purple-50 to-pink-50", border: "border-purple-200", badge: "bg-purple-100", badgeText: "text-purple-700", gradS: "#8b5cf6", gradE: "#ec4899", badgeLabel: "Premium" },
  };

  return (
    <div className="pt-12 pb-20 min-h-screen bg-[#f7f9f4]">
      <TickerTape />
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

        {rentedGenerators.filter(ug => ug.rentalEndTime.toMillis() > now).length > 0 && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-green-800 font-semibold text-sm">You have active generators!</p>
              <p className="text-green-600 text-xs">Go to the <button onClick={() => router.push("/dashboard/power")} className="underline font-bold">Power page</button> to claim your daily income every 24 hours.</p>
            </div>
          </div>
        )}

        {generators.length === 0 ? (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">No generators available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-10">
            {generators.map((gen) => {
              const cm = colorMap[gen.color] || colorMap["amber"];
              const rentedCount = activeRentedCounts.get(gen.id) || 0;
              const isRented = rentedCount > 0;
              const isMaxed = gen.id === "pg1" && rentedCount >= 1;
              const activeUg = rentedGenerators.find(ug => ug.generatorId === gen.id && ug.rentalEndTime.toMillis() > now);

              return (
                <div key={gen.id} data-testid={`card-generator-${gen.id}`}
                  className={`bg-white rounded-2xl border-2 ${cm.border} shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden ${isMaxed ? "ring-2 ring-amber-400 ring-offset-2" : isRented ? "ring-2 ring-green-400 ring-offset-2" : ""}`}>

                  <div className={`bg-gradient-to-r ${cm.bg} p-4 sm:p-5 border-b ${cm.border}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-tight">{gen.name}</h3>
                        <p className="text-gray-500 text-xs sm:text-sm">{gen.subtitle}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cm.badge} ${cm.badgeText}`}>
                          {cm.badgeLabel}
                        </span>
                        {isRented && gen.id === "pg1" && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Active (1 only)
                          </span>
                        )}
                        {isRented && gen.id !== "pg1" && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> {rentedCount} Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="w-full h-52 sm:h-64 rounded-xl overflow-hidden shadow-inner">
                      <img
                          src={generatorImages[gen.id]}
                          alt={gen.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.parentElement as HTMLElement).style.background = `linear-gradient(135deg, ${cm.gradS} 0%, ${cm.gradE} 100%)`; }}
                        />
                    </div>

                    {/* Info strip under image */}
                    <div className="flex items-center justify-between mt-3 px-1">
                      <div className="flex items-center gap-1.5 bg-white/80 border border-amber-200 rounded-lg px-2.5 py-1.5 shadow-sm">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-800">{gen.expireDays} Days</span>
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
                    <div className="mb-4">
                      <LiveChart genId={gen.id} dailyIncome={gen.dailyIncome} color={gen.color} isRented={isRented} />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className={`rounded-xl px-2 py-2 text-center border ${gen.price === 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-100"}`}>
                        <p className={`text-[10px] font-medium ${gen.price === 0 ? "text-green-500" : "text-gray-400"}`}>Rent Price</p>
                        <p className={`font-black text-sm ${gen.price === 0 ? "text-green-700" : "text-gray-900"}`}>{gen.price === 0 ? "FREE" : `$${gen.price.toLocaleString()}`}</p>
                      </div>
                      <div className="bg-green-50 rounded-xl px-2 py-2 text-center border border-green-100">
                        <p className="text-green-500 text-[10px] font-medium">Daily Income</p>
                        <p className="text-green-700 font-black text-sm">${gen.dailyIncome}</p>
                      </div>
                      <div className="bg-amber-50 rounded-xl px-2 py-2 text-center border border-amber-100">
                        <p className="text-amber-500 text-[10px] font-medium">Total Income</p>
                        <p className="text-amber-700 font-black text-sm">${(gen.dailyIncome * gen.expireDays).toFixed(2)}</p>
                      </div>
                    </div>

                    {activeUg && (
                      <div className="mb-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Timer className="w-4 h-4 text-red-500" />
                          <span className="text-red-700 text-xs font-semibold">Expires in</span>
                        </div>
                        <Countdown expiresAt={activeUg.rentalEndTime.toMillis()} label="" />
                      </div>
                    )}

                    {isMaxed ? (
                      <div className="flex flex-col gap-2">
                        <Button disabled
                          className="w-full bg-amber-50 border border-amber-300 text-amber-600 font-semibold rounded-xl h-10 sm:h-11 flex items-center gap-2 justify-center text-sm cursor-not-allowed"
                        >
                          <CheckCircle className="w-4 h-4" /> Already Active — 1 per account
                        </Button>
                        <Button variant="outline" onClick={() => router.push("/dashboard/power")}
                          className="w-full rounded-xl h-9 text-xs font-semibold border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1.5 justify-center">
                          <Zap className="w-3.5 h-3.5" /> Go to Power Page
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button
                          data-testid={`button-rent-${gen.id}`}
                          onClick={() => handleRentClick(gen)}
                          disabled={isRenting === gen.id}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl h-10 sm:h-11 shadow-md transition-all flex items-center gap-2 justify-center text-sm"
                        >
                          {isRenting === gen.id
                            ? (gen.price === 0 ? "Activating..." : "Renting...")
                            : isRented
                              ? `Rent Another — $${gen.price.toLocaleString()}`
                              : gen.price === 0 ? `Activate ${gen.name} — FREE` : `Rent ${gen.name} — $${gen.price.toLocaleString()}`
                          }
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
                <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${color}`} />
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
            {lowBalanceGen && (
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
                  <span className="font-black text-gray-900 text-sm">${(balance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <span className="text-red-600 text-sm font-medium">Shortfall</span>
                  <span className="font-black text-red-600 text-sm">
                    ${Math.max(0, lowBalanceGen.price - (balance)).toFixed(2)}
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