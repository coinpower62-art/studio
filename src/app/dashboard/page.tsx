'use client';

import {
  TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, Activity, Zap, Globe, Star, BarChart2, Gift, Copy, CheckCircle, Play, Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser, useFirestore } from "@/firebase";
import { useUserStore } from "@/hooks/use-user-store";
import { doc, updateDoc } from 'firebase/firestore';

const recentActivities = [
  { type: "deposit", amount: "+$500.00", time: "2h ago" },
  { type: "profit", amount: "+$23.50", time: "5h ago" },
  { type: "withdraw", amount: "-$200.00", time: "1d ago" },
  { type: "deposit", amount: "+$1,000.00", time: "2d ago" },
];

const generators = [
  { name: "PG1 Generator", roi: "$0.20/day", period: "FREE · 3 days", color: "from-amber-400 to-orange-500" },
  { name: "PG2 Generator", roi: "$1.00/day", period: "$10 · Daily", color: "from-green-400 to-emerald-600" },
  { name: "PG3 Generator", roi: "$1.20/day", period: "$15 · Daily", color: "from-blue-400 to-indigo-600" },
  { name: "PG4 Generator", roi: "$1.50/day", period: "$20 · Daily", color: "from-purple-400 to-pink-600" },
];


export default function Dashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const { balance, fullName, country, referralCode, rentedGenerators } = useUserStore();
  const firestore = useFirestore();

  const [copied, setCopied] = useState(false);
  const [giftCode, setGiftCode] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState<{ amount: number } | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedCodes, setRedeemedCodes] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/signin");
    }
  }, [isUserLoading, user, router]);


  const handleRedeemCode = async () => {
    if (!giftCode.trim() || !user || !firestore) return;

    setIsRedeeming(true);
    // This is a mock implementation. In a real app, you'd verify the code against a database.
    const validCodes: { [key: string]: number } = {
        "WELCOME10": 10,
        "BONUS5": 5,
        "SPECIAL25": 25,
    };

    const amount = validCodes[giftCode.trim().toUpperCase()];

    if (amount) {
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, {
                balance: balance + amount
            });
            setGiftCode("");
            setRedeemSuccess({ amount });
            const newRedeemedCode = { id: Date.now().toString(), code: giftCode.trim().toUpperCase(), amount };
            setRedeemedCodes(prev => [newRedeemedCode, ...prev]);
        } catch (error) {
            toast({ title: "Error Redeeming Code", description: "Could not update balance.", variant: "destructive" });
        }
    } else {
        toast({ title: "Invalid Code", description: "The gift code you entered is not valid or has expired.", variant: "destructive" });
    }
    setIsRedeeming(false);
  };

  if (isUserLoading || !user) {
    return (
      <div className="pt-12 p-4 pb-20 sm:p-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const initials = fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "CP";

  const stats = [
    { label: "Total Balance", value: `$${balance.toFixed(2)}`, icon: Wallet, change: "+2.5%", up: true, color: "from-amber-400 to-amber-600" },
    { label: "Monthly Profit", value: "$0.00", icon: TrendingUp, change: "+0%", up: true, color: "from-green-400 to-green-600" },
    { label: "Active Plans", value: rentedGenerators.length, icon: Zap, change: `${rentedGenerators.length} active`, up: true, color: "from-blue-400 to-blue-600" },
    { label: "Total Earned", value: "$0.00", icon: BarChart2, change: "+0%", up: true, color: "from-purple-400 to-purple-600" },
  ];

  return (
    <div className="pt-12 pb-20 min-h-screen bg-[#f7f9f4]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 sm:py-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Welcome back, <span className="text-amber-600">{fullName?.split(" ")[0]}</span> 👋
            </h1>
            <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Here's your investment overview</p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm border border-amber-100 self-start sm:self-auto">
            <Avatar className="w-9 h-9 sm:w-11 sm:h-11 border-2 border-amber-300">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-green-600 text-white font-bold text-xs sm:text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900 text-sm" data-testid="text-username">{fullName}</p>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-500" data-testid="text-country">{country}</p>
                <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-0">Active</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {stats.map(({ label, value, icon: Icon, change, up, color }, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 sm:p-5 shadow-sm border border-amber-100/60">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? "text-green-600" : "text-red-500"}`}>
                  {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span className="hidden sm:inline">{change}</span>
                </span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900" data-testid={`stat-value-${i}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Video Tutorial Frame */}
        <div
          data-testid="button-tutorial-banner"
          className="w-full rounded-2xl overflow-hidden shadow-md border border-amber-100/60 group text-left mb-4 sm:mb-6"
        >
          {/* Thumbnail */}
          <div className="relative h-44 sm:h-52 bg-gradient-to-br from-gray-950 via-amber-950 to-gray-900 flex items-center justify-center overflow-hidden">

            {/* Scanline texture */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(255,255,255,0.08) 2px,rgba(255,255,255,0.08) 4px)" }} />

            {/* Floating scene previews */}
            <div className="absolute top-3 left-3 flex gap-2">
              {[
                { bg: "bg-amber-500", e: "⚡", label: "Welcome" },
                { bg: "bg-blue-500", e: "👤", label: "Sign Up" },
                { bg: "bg-yellow-500", e: "🏦", label: "Deposit" },
              ].map(({ bg, e, label }) => (
                <div key={label} className={`${bg} rounded-lg w-14 h-10 flex flex-col items-center justify-center gap-0.5 opacity-70`}>
                  <span className="text-base leading-none">{e}</span>
                  <span className="text-white text-[8px] font-semibold">{label}</span>
                </div>
              ))}
              <div className="bg-white/10 rounded-lg w-14 h-10 flex items-center justify-center opacity-60">
                <span className="text-white text-[10px] font-bold">+11 more</span>
              </div>
            </div>

            {/* Floating emoji coins (background) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {[
                { e: "💰", top: "55%", left: "12%", delay: "0s" },
                { e: "🪙", top: "65%", left: "72%", delay: "0.4s" },
                { e: "📈", top: "50%", left: "82%", delay: "0.8s" },
              ].map(({ e, top, left, delay }) => (
                <div
                  key={e}
                  className="absolute text-2xl opacity-20 animate-bounce"
                  style={{ top, left, animationDelay: delay, animationDuration: "2.5s" }}
                >
                  {e}
                </div>
              ))}
            </div>

            {/* Centre play button */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-white shadow-2xl shadow-black/60 flex items-center justify-center group-hover:scale-110 transition-all duration-200">
                <Play className="w-7 h-7 text-amber-500 ml-1" fill="currentColor" />
              </div>
              <span className="text-white/80 text-xs font-semibold bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">Tap to play</span>
            </div>

            {/* Top-right badge */}
            <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md tracking-wide flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
              TUTORIAL
            </div>

            {/* Bottom gradient + duration */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-2 right-3 bg-black/70 text-white text-[10px] font-semibold px-2 py-0.5 rounded">15 scenes</div>

            {/* Progress bar (at 0) */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
              <div className="h-full w-0 bg-amber-400" />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-white px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Play className="w-4 h-4 text-amber-600 ml-0.5" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm leading-tight">How to Deposit &amp; Start Earning</p>
              <p className="text-gray-400 text-xs mt-0.5">Animated cartoon tutorial • 15 scenes</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-amber-100/60 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Investment Generators</h2>
              <button className="text-amber-600 text-xs sm:text-sm font-medium hover:underline" onClick={() => router.push("/dashboard/market")}>
                View all
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {generators.map(({ name, roi, period, color }) => (
                <div
                  key={name}
                  className="relative overflow-hidden rounded-xl p-3 sm:p-4 border border-amber-100/60 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => router.push("/dashboard/market")}
                >
                  <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10 bg-gradient-to-bl ${color}`} />
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-2`}>
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm leading-tight">{name}</p>
                  <div className="flex items-center gap-1 sm:gap-2 mt-1">
                    <span className="text-green-600 font-bold text-base sm:text-lg">{roi}</span>
                    <span className="text-gray-400 text-xs">{period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-100/60 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Activity</h2>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentActivities.map(({ type, amount, time }, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-gray-50">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      type === "deposit" ? "bg-green-100" : type === "profit" ? "bg-amber-100" : "bg-red-100"
                    }`}>
                      {type === "deposit" ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" /> :
                       type === "profit" ? <Star className="w-3.5 h-3.5 text-amber-600" /> :
                       <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-gray-800 capitalize">{type}</p>
                      <p className="text-xs text-gray-400">{time}</p>
                    </div>
                  </div>
                  <span className={`text-xs sm:text-sm font-semibold ${amount.startsWith("+") ? "text-green-600" : "text-red-500"}`}>
                    {amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-base sm:text-lg">Boost Your Returns</h3>
              <p className="text-amber-100 text-xs sm:text-sm mt-0.5">Activate a power plan and earn up to 40% returns</p>
            </div>
            <button
              className="bg-white text-amber-600 font-bold px-5 py-2.5 rounded-xl shadow-md hover:bg-amber-50 transition-colors text-sm self-start sm:self-auto whitespace-nowrap"
              onClick={() => router.push("/dashboard/power")}
              data-testid="button-activate-power"
            >
              Activate Now
            </button>
          </div>
        </div>

        {referralCode && (
          <div className="mt-4 sm:mt-6 bg-white rounded-2xl shadow-sm border border-amber-100 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                <Gift className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">Refer & Earn</h3>
                <p className="text-xs text-gray-500">Invite friends using your unique referral link</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-amber-100/60 p-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Your Referral Link</p>
                <p className="text-xs text-gray-700 truncate font-mono" data-testid="text-referral-link">
                  {typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${referralCode}` : ''}
                </p>
              </div>
              <button
                data-testid="button-copy-referral"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${referralCode}`);
                  setCopied(true);
                  toast({ title: "Referral link copied!", description: "Share it with friends to invite them." });
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors flex-shrink-0"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-gray-400">Share your link and help friends start their investment journey on CoinPower.</p>
          </div>
        )}

        <div className="mt-4 sm:mt-6 bg-white rounded-2xl shadow-sm border border-amber-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center shadow-md">
              <Gift className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Gift Box 🎁</h3>
              <p className="text-xs text-gray-500">Enter a bonus code to claim your reward</p>
            </div>
          </div>

          {redeemSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center mb-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-black text-green-700 text-xl">+${redeemSuccess.amount.toFixed(2)}</p>
              <p className="text-green-600 text-sm font-semibold mt-0.5">Added to your balance!</p>
              <p className="text-green-500 text-xs mt-1">Your account has been credited successfully.</p>
              <button onClick={() => setRedeemSuccess(null)}
                className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline">Redeem another code</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                data-testid="input-gift-code"
                type="text"
                value={giftCode}
                onChange={e => setGiftCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && giftCode.trim() && handleRedeemCode()}
                placeholder="Enter code e.g. WELCOME10"
                className="flex-1 bg-gray-50 border border-amber-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-800 focus:outline-none focus:border-amber-400 placeholder:text-gray-400 placeholder:font-sans"
              />
              <button
                data-testid="button-redeem-code"
                onClick={handleRedeemCode}
                disabled={!giftCode.trim() || isRedeeming}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-shadow"
              >
                {isRedeeming ? "..." : "Claim"}
              </button>
            </div>
          )}

          {redeemedCodes.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Redeemed History</p>
              <div className="space-y-1.5">
                {redeemedCodes.slice(0, 5).map((c: any) => (
                  <div key={c.id} data-testid={`redeemed-code-${c.id}`}
                    className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                      <span className="text-xs font-mono text-gray-600">{c.code}</span>
                      {c.note && <span className="text-[10px] text-gray-400 italic">{c.note}</span>}
                    </div>
                    <span className="text-xs font-bold text-green-600">+${c.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── AVIATOR GAME ── */}
        <div
          data-testid="banner-play-and-win"
          className="mt-4 sm:mt-6 rounded-2xl overflow-hidden relative"
          style={{ background: "linear-gradient(135deg,#06101e 0%,#0a1a40 55%,#0d0a22 100%)" }}
        >
          {/* Glow effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full opacity-25"
              style={{ background: "radial-gradient(circle,#1a56db,transparent 70%)", animation: "pulse 3s ease-in-out infinite" }} />
            <div className="absolute -bottom-4 -left-4 w-28 h-28 rounded-full opacity-20"
              style={{ background: "radial-gradient(circle,#00e676,transparent 70%)", animation: "pulse 3s ease-in-out 1.5s infinite" }} />
          </div>

          <div className="relative z-10 p-5 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">✈️</span>
                <span className="text-xs font-bold rounded-full px-2 py-0.5 uppercase tracking-wide"
                  style={{ color: "#00e676", background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.35)" }}>
                  Play Now
                </span>
              </div>
              <h3 className="text-white font-black text-xl leading-tight">Aviator</h3>
              <p className="text-slate-400 text-xs mt-0.5">Bet → fly → cash out before the plane crashes!</p>
            </div>
            <div className="flex flex-col items-center gap-2 ml-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                style={{ background: "linear-gradient(135deg,#1a56db,#0a2a7a)" }}>
                ✈️
              </div>
              <span className="font-black text-[10px] tracking-widest uppercase" style={{ color: "#00e676" }}>Play Now</span>
            </div>
          </div>

          {/* Multiplier preview strip */}
          <div className="px-5 pb-3 flex items-center gap-3">
            {["1.5x","2x","5x","10x","25x","100x"].map((v, i) => (
              <span key={v} className="text-[10px] font-black"
                style={{ color: i < 2 ? "#94a3b8" : i < 4 ? "#60a5fa" : "#a78bfa" }}>{v}</span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
