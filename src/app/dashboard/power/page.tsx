
'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Zap, TrendingUp, CheckCircle, Gift, Timer, AlertTriangle, DollarSign, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createClient } from "@/lib/supabase/client";
import type { User } from '@supabase/supabase-js';

import { collectEarnings } from "./actions";
import type { Generator as BaseGenerator } from '@/lib/data';

export type RentedGenerator = {
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

function useOnVisible(fn: () => void) {
  useEffect(function() {
    const h = function() { if (!document.hidden) fn(); };
    document.addEventListener("visibilitychange", h);
    return function() { return document.removeEventListener("visibilitychange", h); };
  }, [fn]);
}

function RedCountdown({ targetMs }: { targetMs: number }) {
    const [remaining, setRemaining] = useState(Math.max(0, targetMs - Date.now()));
    const sync = useCallback(function() { return setRemaining(Math.max(0, targetMs - Date.now())); }, [targetMs]);
    useOnVisible(sync);
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
            <span className="inline-block bg-red-600 text-white text-xs font-black px-1.5 py-0.5 rounded min-w-[1.75rem] text-center">{String(val).padStart(2,"0")}</span>
            {i < 2 && <span className="text-red-500 font-black text-sm mx-0.5">:</span>}
          </span>
        ); })}
      </div>
    );
}

type PCandle = { o: number; h: number; l: number; c: number; v: number };

function LiveChart({ genId, dailyIncome, genColor, suspended, canCollect }: {
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

  const [candles, setCandles] = useState<PCandle[]>(function() { return pSeed(N); });

  const pOpen = function(closePrice: number): PCandle {
    return { o: closePrice, c: closePrice, h: closePrice, l: closePrice, v: 2 + Math.random() * 6 };
  };

  useEffect(function() {
    if (!isActive) return;
    tickRef.current = 0;
    const tick = function() {
      if (document.hidden) return;
      setCandles(function(prev) {
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
          return [...arr.slice(1), pOpen(live.c)];
        }
        return arr;
      });
    };
    const id = setInterval(tick, TICK_MS);
    const onVisible = function() { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return function() {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isActive, pSeed]);

  const minP   = Math.min(...candles.map(function(c) { return c.l; })) - 2;
  const maxP   = Math.max(...candles.map(function(c) { return c.h; })) + 2;
  const pRange = maxP - minP || 1;
  const maxVol = Math.max(...candles.map(function(c) { return c.v; })) || 1;
  const toX    = function(i: number) { return PAD_L + (i + 0.5) * (chartW / N); };
  const toPY   = function(p: number) { return mainTop + mainH * (1 - (p - minP) / pRange); };
  const toVY   = function(v: number) { return volBot  - volH  * (v / maxVol); };
  const cw     = (chartW / N) * 0.62;

  const last   = candles[N - 1];
  const isUp   = last.c >= last.o;
  const priceColor = isActive ? (isUp ? "#22c55e" : "#f87171") : "#374151";
  const toPriceLabel = function(p: number) { return `$${(dailyIncome * (0.88 + (p / 96) * 0.26)).toFixed(3)}`; };

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
        <line x1={PAD_L} y1={(mainBot + 2).toFixed(1)} x2={W - PAD_R} y2={(mainBot + 2).toFixed(1)}
          stroke="#fff" strokeOpacity="0.06" strokeWidth="0.5" />
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
              <rect x={(cx - cw / 2).toFixed(1)} y={toVY(c.v).toFixed(1)}
                width={cw.toFixed(1)} height={(volBot - toVY(c.v)).toFixed(1)}
                fill={bull ? "#3b82f655" : "#a855f755"} rx="0.4" />
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
            <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
              ⚡ INCOME READY
            </span>
          ) : suspended ? (
            <span className="bg-red-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
              ⏸ SUSPENDED
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />LIVE
            </span>
          )}
          <span className="text-[8px] text-white/20 font-mono">{getGenPairP(genId)}</span>
        </div>
        <span className="text-[10px] font-black font-mono" style={{ color: isActive ? priceColor : "#ffffff25" }}>
          ${dailyIncome.toFixed(2)}/day
        </span>
      </div>

      {canCollect && (
        <div className="absolute inset-0 flex items-center justify-center z-20"
          style={{ background: "rgba(0,0,0,0.52)" }}>
          <div className="text-center">
            <p className="text-amber-400 font-black text-xs tracking-wide">⚡ Income Cycle Complete</p>
            <p className="text-white/45 text-[9px] mt-0.5">Chart resumes after you collect</p>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveEarningsCounter({ lastRef, dailyIncome, active }: {
  lastRef: number; dailyIncome: number; active: boolean;
}) {
  const calc = useCallback(function() {
    if (!active) return dailyIncome;
    const elapsed = Date.now() - lastRef;
    const fraction = Math.min(1, elapsed / TWENTY_FOUR_H);
    return fraction * dailyIncome;
  }, [active, dailyIncome, lastRef]);

  const [earned, setEarned] = useState(calc);
  useOnVisible(function() { return setEarned(calc()); });
  useEffect(function() {
    if (!active) { setEarned(dailyIncome); return; }
    const id = setInterval(function() { if (!document.hidden) setEarned(calc()); }, 80);
    return function() { return clearInterval(id); };
  }, [active, dailyIncome, calc]);

  const formatted = earned.toFixed(6);
  const [whole, dec] = formatted.split(".");

  if (typeof dec !== 'string') {
    return (
      <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-0.5 font-mono">
              <span className="text-lg font-black text-gray-400 tracking-tight leading-none">--.--</span>
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5">Calculating...</p>
      </div>
    );
  }

  const dec1 = dec.slice(0, 2);
  const dec2 = dec.slice(2, 4);
  const dec3 = dec.slice(4, 6);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-0.5 font-mono">
        <span className="text-[10px] text-green-600 font-bold">$</span>
        <span className="text-lg font-black text-green-700 tracking-tight leading-none">{whole}.{dec1}</span>
        <span className="text-xs font-black text-green-600 leading-none">.{dec2}</span>
        <span className="text-[10px] font-bold text-green-500 leading-none">.{dec3}</span>
      </div>
      <p className="text-[9px] text-gray-400 mt-0.5">of ${dailyIncome.toFixed(2)}</p>
    </div>
  );
}

function ExpiryBar({ rentedAt, expiresAt }: { rentedAt: number; expiresAt: number }) {
  const [now, setNow] = useState(Date.now());
  useOnVisible(function() { return setNow(Date.now()); });
  useEffect(function() {
    const t = setInterval(function() { return setNow(Date.now()); }, 10000);
    return function() { return clearInterval(t); };
  }, []);
  const total = expiresAt - rentedAt;
  const elapsed = now - rentedAt;
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const daysLeft = Math.max(0, Math.ceil((expiresAt - now) / 86400000));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{daysLeft} days remaining</span>
        <span>{Math.round(pct)}% elapsed</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function GeneratorCard({ ug, onClaim, isClaiming }: { ug: RentedGenerator; onClaim: (id: string) => void; isClaiming: boolean; }) {
  const router = useRouter();
  const now = Date.now();
  const expiresAtMs = new Date(ug.expires_at).getTime();
  const isSuspended = ug.suspended && expiresAtMs > now;
  
  const lastRef = ug.last_claimed_at ? new Date(ug.last_claimed_at).getTime() : new Date(ug.rented_at).getTime();
  
  const endOfCollection = Math.min(now, expiresAtMs);
  const actualDailyIncome = ug.daily_income;
  const periodsReady = !isSuspended ? Math.floor((endOfCollection - lastRef) / TWENTY_FOUR_H) : 0;
  const canCollect = !isSuspended && periodsReady > 0;
  const isExpired = expiresAtMs <= now;
  const pendingIncome = periodsReady * actualDailyIncome;
  const nextCreditAt = lastRef + TWENTY_FOUR_H;

  const borderColor = isExpired && !canCollect ? "border-gray-200 opacity-60"
    : isSuspended ? "border-red-300 bg-red-50/30"
    : "border-amber-200 hover:shadow-xl hover:border-amber-400";
  
  const colorMap = {
      amber: 'from-amber-400 to-orange-500',
      green: 'from-green-400 to-emerald-600',
      blue: 'from-blue-400 to-indigo-600',
      purple: 'from-purple-500 to-pink-600',
  };
  // @ts-ignore
  const cardColor = colorMap[ug.color] || 'from-gray-400 to-gray-500';

  const imageUrl = ug.image_url || PlaceHolderImages.find(function(i) { return i.id === `gen-${ug.generator_id}`; })?.imageUrl;

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden transition-all ${borderColor}`}>
      <div className={`bg-gradient-to-r ${isSuspended ? "from-gray-400 to-gray-500" : cardColor} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg flex-shrink-0 bg-white">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={ug.name}
                className={`w-full h-full object-contain ${isSuspended ? "grayscale" : ""}`}
                onError={function(e) { const el = e.currentTarget; el.style.display = "none"; const fb = el.nextElementSibling as HTMLElement; if (fb) fb.style.display = "flex"; }}
              />
            ) : null}
            <span className={`w-full h-full ${imageUrl ? "hidden" : "flex"} items-center justify-center text-2xl`}>{ug.icon}</span>
          </div>
          <div>
            <p className="font-black text-white text-base">{ug.name}</p>
            <p className="text-white/70 text-xs">${ug.price.toLocaleString()} · {ug.expire_days} days</p>
          </div>
        </div>
        <div className="text-right">
          {isSuspended ? (
            <span className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg">SUSPENDED</span>
          ) : (
            <>
              <p className="text-white text-xl font-black">${actualDailyIncome.toFixed(2)}</p>
              <p className="text-white/70 text-xs">per day</p>
            </>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <ExpiryBar rentedAt={new Date(ug.rented_at).getTime()} expiresAt={expiresAtMs} />

        {!isExpired && !canCollect && (
          <LiveChart genId={ug.id} dailyIncome={actualDailyIncome} genColor={ug.color} suspended={isSuspended} canCollect={canCollect} />
        )}

        {canCollect ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-green-800 font-bold text-sm">
                            {periodsReady > 1 ? `${periodsReady} days of income ready!` : "Daily income ready!"}
                        </p>
                        <p className="text-green-600 text-xs">
                           Total ready to collect: <span className="font-black">${pendingIncome.toFixed(2)}</span>
                        </p>
                    </div>
                    <form action={function() { return onClaim(ug.id); }}>
                      <Button
                          data-testid={`button-claim-${ug.id}`}
                          type="submit"
                          disabled={isClaiming}
                          className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl px-4 h-9 text-sm shadow-md hover:shadow-lg"
                      >
                          {isClaiming ? "Collecting..." : "Collect"}
                      </Button>
                    </form>
                </div>
            </div>
        ) : isExpired ? (
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                <AlertTriangle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-gray-500 text-sm">This generator has expired. Rent a new one from the Market.</p>
            </div>
        ) : isSuspended ? (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-red-800 font-bold text-sm">Generator Suspended</p>
                        {ug.price > 0 ? (
                           <p className="text-red-600 text-xs">Your balance may be too low. Deposit funds to resume income.</p>
                        ) : (
                           <p className="text-red-600 text-xs">This generator is suspended. Please contact support.</p>
                        )}
                    </div>
                </div>
                {ug.price > 0 && (
                    <button
                        onClick={function() { return router.push("/dashboard/bank"); }}
                        className="w-full text-center text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg py-1.5 transition-colors"
                    >
                        Deposit Now to Resume →
                    </button>
                )}
            </div>
        ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                        <div>
                            <p className="text-amber-800 font-semibold text-xs">Earning • Live</p>
                            <p className="text-amber-600 text-[10px]">Tracking crypto</p>
                        </div>
                    </div>
                    <LiveEarningsCounter lastRef={lastRef} dailyIncome={actualDailyIncome} active={true} />
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200">
                    <p className="text-amber-700 text-[10px] font-semibold">Collectable in</p>
                    <RedCountdown targetMs={nextCreditAt} />
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-2 border border-amber-100/60">
            <p className="text-gray-400 text-[10px]">Last Credit</p>
            <p className="text-gray-700 text-xs font-semibold">
              {ug.last_claimed_at ? new Date(ug.last_claimed_at).toLocaleDateString([], { month: "short", day: "numeric" }) + " " + new Date(ug.last_claimed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2 border border-amber-100/60">
            <p className="text-gray-400 text-[10px]">Status</p>
            <p className={`text-xs font-bold ${isExpired && !canCollect ? "text-gray-400" : isSuspended ? "text-red-600" : canCollect ? "text-green-600" : "text-amber-600"}`}>
              {canCollect ? "Collect Now" : isExpired ? "Expired" : isSuspended ? "Suspended" : "Earning"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimSuccessOverlay({ amount, generatorName, onDone }: { amount: number; generatorName: string; onDone: () => void }) {
  useEffect(function() {
    const timer = setTimeout(onDone, 4000);
    return function() { return clearTimeout(timer); };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={onDone}
    >
      <div
        className="mx-4 w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-90 slide-in-from-bottom-10"
        onClick={function(e) { return e.stopPropagation(); }}
      >
        <div className="bg-card pt-8 pb-6 flex flex-col items-center gap-2 relative">
          <Star className="absolute top-3 left-6 text-amber-400/60 w-5 h-5 animate-in zoom-in-50 delay-200" />
          <Star className="absolute top-5 right-8 text-amber-400/50 w-4 h-4 animate-in zoom-in-50 delay-300" />
          <Star className="absolute top-2 right-5 text-amber-400/40 w-3 h-3 animate-in zoom-in-50 delay-400" />
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center shadow-lg animate-in zoom-in-75 delay-100">
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-foreground font-black text-xl tracking-wide mt-1">Income Collected!</p>
        </div>

        <div className="px-6 pt-5 pb-2 text-center animate-in fade-in slide-in-from-bottom-3 delay-200">
          <p className="text-5xl font-black text-green-600 tracking-tight">+${amount.toFixed(2)}</p>
          <p className="text-gray-500 text-sm mt-1">Successfully credited to your balance</p>
        </div>

        <div className="px-5 py-3 mx-4 my-2 bg-amber-50 border border-amber-100 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-3 delay-300">
          <p className="text-amber-800 text-sm font-bold">Great job! 🎉</p>
          <p className="text-amber-700 text-xs mt-0.5">Continue your hard work!</p>
        </div>

        <div className="px-6 pb-5 pt-2 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-3 delay-400">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-700 text-xs font-semibold">{generatorName}</span>
          </div>
          <button
            onClick={onDone}
            className="w-full py-3 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const powerPlans = [
  { name: "Bronze Power", price: "$100/mo", boost: "2x", multiplier: 2, color: "from-amber-600 to-yellow-700", features: ["2x return multiplier", "Priority processing", "Weekly reports", "Email support"] },
  { name: "Silver Power", price: "$500/mo", boost: "5x", multiplier: 5, color: "from-gray-400 to-gray-600", features: ["5x return multiplier", "Instant processing", "Daily reports", "Phone support"], popular: true },
  { name: "Gold Power", price: "$1,000/mo", boost: "10x", multiplier: 10, color: "from-amber-400 to-amber-600", features: ["10x return multiplier", "Dedicated manager", "Real-time analytics", "24/7 VIP support"] },
];

function PowerPageSkeleton() {
    return <div className="pt-12 p-4 pb-20 max-w-6xl mx-auto"><Skeleton className="h-96 rounded-2xl" /></div>;
}

export default function Power() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [rentedGenerators, setRentedGenerators] = useState<RentedGenerator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [media, setMedia] = useState<any[]>([]);

  const [claimedInfo, setClaimedInfo] = useState<{ amount: number; generatorName: string } | null>(null);
  const [isClaimingId, setIsClaimingId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = useCallback(async function() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);

    const [rentedResult, mediaResult] = await Promise.all([
      supabase
        .from('rented_generators')
        .select(`
          *,
          generators ( * )
        `)
        .eq('user_id', user.id),
      supabase.from('media').select('*')
    ]);

    const { data, error } = rentedResult;
    
    if (error) {
      toast({ title: 'Error fetching generators', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const enrichedData = data.map(function(rg) {
      const baseGen = rg.generators as BaseGenerator | null;
      return {
        ...rg,
        name: baseGen?.name ?? 'Unknown Generator',
        price: baseGen?.price ?? 0,
        daily_income: baseGen?.daily_income ?? 0,
        expire_days: baseGen?.expire_days ?? 0,
        color: baseGen?.color ?? 'gray',
        icon: baseGen?.icon ?? '?',
        subtitle: baseGen?.subtitle ?? '',
        roi: baseGen?.roi ?? '',
        period: baseGen?.period ?? '',
        investors: baseGen?.investors ?? '0',
        image_url: baseGen?.image_url,
      }
    });

    // @ts-ignore
    setRentedGenerators(enrichedData);
    
    const { data: mediaData, error: mediaError } = mediaResult;
    if (mediaError) {
      toast({ title: 'Error fetching media', description: mediaError.message, variant: 'destructive' });
    } else {
      setMedia(mediaData || []);
    }

    setIsLoading(false);
  }, [supabase, router, toast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);


  const handleClaim = async function(rentedGeneratorId: string) {
    setIsClaimingId(rentedGeneratorId);
    const result = await collectEarnings(rentedGeneratorId);
    if (result.success && result.earned) {
      const claimedGen = rentedGenerators.find(function(g) { return g.id === rentedGeneratorId; });
      setClaimedInfo({ amount: result.earned, generatorName: claimedGen?.name || 'Generator' });
      fetchData();
    } else {
      toast({ variant: "destructive", title: "Cannot claim yet", description: result.message });
    }
    setIsClaimingId(null);
  };
  
  if (isLoading) {
    return <PowerPageSkeleton />;
  }

  const now = Date.now();
  const activeGenerators = rentedGenerators.filter(function(ug) {
    if (!ug || !ug.expires_at) return false;
    const expiresAtMs = new Date(ug.expires_at).getTime();
    if (expiresAtMs <= now) {
      // It's expired, but can we still collect?
      const lastRef = ug.last_claimed_at ? new Date(ug.last_claimed_at).getTime() : new Date(ug.rented_at).getTime();
      const periodsReady = Math.floor((expiresAtMs - lastRef) / TWENTY_FOUR_H);
      return periodsReady > 0 && !ug.suspended;
    }
    return true; // Not expired
  });

  const expiredGenerators = rentedGenerators.filter(function(ug) {
    return !activeGenerators.some(ag => ag.id === ug.id);
  });
  
  const powerHeaderBanner = media.find(m => m.id === 'power-header-banner')?.url;

  return (
    <div className="pb-20 min-h-screen">
      
      {claimedInfo && (
        <ClaimSuccessOverlay
          amount={claimedInfo.amount}
          generatorName={claimedInfo.generatorName}
          onDone={function() { return setClaimedInfo(null); }}
        />
      )}
      <div className="max-w-6xl mx-auto">

        <div
          className="relative overflow-hidden bg-gradient-to-br from-orange-400 to-yellow-500 rounded-b-2xl sm:rounded-b-3xl p-5 sm:p-8 text-white shadow-2xl -mt-6 -mx-6 sm:mb-6"
          style={powerHeaderBanner ? { backgroundImage: `url(${powerHeaderBanner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
            {powerHeaderBanner && <div className="absolute inset-0 bg-black/50" />}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute w-[200px] h-[200px] rounded-full border border-white -top-12 -left-12" />
                <div className="absolute w-[300px] h-[300px] rounded-full border border-white -bottom-20 -right-16" />
                <div className="absolute w-[150px] h-[150px] rounded-full border border-white top-1/4 right-1/4" />
            </div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium text-white">Power Center</span>
                </div>
                
                <h1 className="text-3xl font-bold text-white mb-4">Your Active Generators</h1>
                <p className="text-white/90 mb-8 leading-relaxed max-w-md">
                    You must click 'Collect' on each generator every 24 hours to add its income to your balance.
                </p>

                <div className="bg-white/20 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10">
                    <p className="text-white/80 text-sm uppercase tracking-wider">Active Generators</p>
                    <div className="text-6xl font-bold text-white my-2">{activeGenerators.length}</div>
                    <p className="text-white/70 italic">running now</p>
                </div>
            </div>
        </div>
        
        <div className="px-3 sm:px-6">
            {activeGenerators.length > 0 && (
              <div className="mb-6 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h2 className="font-bold text-gray-900">Active Generators</h2>
                  <Badge className="bg-green-100 text-green-700 border-0">{activeGenerators.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {activeGenerators.map(function(ug) {
                    return (
                    <GeneratorCard key={ug.id} ug={ug}
                      onClaim={handleClaim}
                      isClaiming={isClaimingId === ug.id}
                    />
                  ); })}
                </div>
              </div>
            )}

            {rentedGenerators.length === 0 && !isLoading && (
              <div className="bg-white rounded-2xl border border-amber-100/60 shadow-sm p-10 text-center mb-6 mt-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-amber-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">No generators yet</h3>
                <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
                  Go to the Market to rent a generator. Your generators will appear here with a 24-hour claim timer.
                </p>
                <Button onClick={function() { return router.push("/dashboard/market"); }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl px-6 h-10 shadow-md">
                  Browse Market
                </Button>
              </div>
            )}

            {expiredGenerators.length > 0 && (
              <div className="mb-6 mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="font-semibold text-gray-500 text-sm">Expired Generators</h2>
                  <Badge className="bg-gray-100 text-gray-500 border-0 text-xs">{expiredGenerators.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {expiredGenerators.map(function(ug) {
                    return (
                    <GeneratorCard key={ug.id} ug={ug}
                      onClaim={handleClaim}
                      isClaiming={isClaimingId === ug.id}
                    />
                  ); })}
                </div>
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1 mt-4">Boost Power Plans</h2>
            <p className="text-gray-500 text-center text-sm mb-5 sm:mb-8">Multiply your returns even further</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {powerPlans.map(function(plan) {
                return (
                <div key={plan.name}
                  data-testid={`card-power-${plan.name.toLowerCase().replace(" ", "-")}`}
                  className={`relative bg-white rounded-2xl border-2 ${plan.popular ? "border-amber-400 shadow-xl shadow-amber-100" : "border-gray-200 shadow-sm"} p-5 sm:p-6 hover:shadow-lg transition-all duration-300`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 px-3 py-1 shadow-md whitespace-nowrap">Most Popular</Badge>
                    </div>
                  )}
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1">{plan.name}</h3>
                  <div className="flex items-end gap-1 mb-3">
                    <span className="text-3xl font-black text-gray-900">{plan.boost}</span>
                    <span className="text-gray-500 text-sm mb-1">Return Boost</span>
                  </div>
                  <p className="text-amber-600 font-semibold text-base sm:text-lg mb-4 sm:mb-5">{plan.price}</p>
                  <div className="space-y-2 mb-5">
                    {plan.features.map(function(f) {
                      return (
                      <div key={f} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-600">{f}</span>
                      </div>
                    ); })}
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Power Level</span><span>{plan.multiplier * 10}%</span>
                    </div>
                    <Progress value={plan.multiplier * 10} className="h-2" />
                  </div>
                  <Button
                    data-testid={`button-activate-${plan.name.toLowerCase().replace(" ", "-")}`}
                    onClick={function() { return toast({ title: `${plan.name} Activated!`, description: "This is a demo. Your power plan has been activated." }); }}
                    className="w-full h-10 sm:h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm">
                    Activate {plan.name}
                  </Button>
                </div>
              ); })}
            </div>
        </div>
      </div>
    </div>
  );
}
