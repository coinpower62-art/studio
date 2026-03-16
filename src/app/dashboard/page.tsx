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
import { useUser, useFirestore, useUserStore } from "@/firebase";
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

  const announcements = [
    "🎉 NEW MEMBERS receive a FREE $1 bonus — start earning today with no deposit required!",
    "💸 Earn 15% FREE referral commission every time a friend joins CoinPower — no limits!",
    "⚡ Rent PG1–PG4 Generators and claim daily income every 24 hours on the Power page",
    "🏆 Win exciting rewards and travel to Italy — participate in our Staged Win Program!",
    "📈 Over $10 Million paid to 26,000+ investors across 21 countries worldwide",
    "🔒 Secure & transparent — your balance is fully protected with bank-level security",
  ].join("   ✦   ");

  const stats = [
    { label: "Total Balance", value: `$${balance.toFixed(2)}`, icon: Wallet, change: "+2.5%", up: true, color: "from-amber-400 to-amber-600" },
    { label: "Monthly Profit", value: "$0.00", icon: TrendingUp, change: "+0%", up: true, color: "from-green-400 to-green-600" },
    { label: "Active Plans", value: rentedGenerators.length, icon: Zap, change: `${rentedGenerators.length} active`, up: true, color: "from-blue-400 to-blue-600" },
    { label: "Total Earned", value: "$0.00", icon: BarChart2, change: "+0%", up: true, color: "from-purple-400 to-purple-600" },
  ];

  return (
    <div className="pt-12 pb-20 min-h-screen bg-[#f7f9f4]">
      <div className="w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 border-b border-amber-400 overflow-hidden" style={{ height: "36px" }}>
        <div className="flex items-center h-full">
          <div className="flex-shrink-0 bg-amber-700 text-white text-xs font-black px-3 h-full flex items-center gap-1.5 z-10 shadow-md">
            <span>📢</span>
            <span className="hidden sm:inline tracking-wide">ANNOUNCEMENT</span>
          </div>
          <div className="overflow-hidden flex-1 relative h-full flex items-center">
             <style>{`
                @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                .marquee-track { display: flex; animation: marquee 120s linear infinite; }
             `}</style>
            <div className="marquee-track whitespace-nowrap text-amber-900 text-xs font-semibold" aria-live="polite">
              <span className="px-4">{announcements}</span>
              <span className="px-4">{announcements}</span>
            </div>
          </div>
        </div>
      </div>

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

      </div>
    </div>
  );
}
