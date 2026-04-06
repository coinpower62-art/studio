'use client';
export const runtime = 'edge';

import {
  Shield, Globe, TrendingUp, Users, Award, CheckCircle, MapPin,
  Mail, Phone, Gift, UserPlus, Cpu, Trophy, Star, Rocket, BarChart3
} from "lucide-react";
import { SiTelegram } from "react-icons/si";
import { Badge } from "@/components/ui/badge";
import { countries as COUNTRIES_DATA } from "@/lib/data";
import { useState, useEffect } from 'react';
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Skeleton } from "@/components/ui/skeleton";

const team = [
  { id: 'ceo-portrait', name: "Alessandro Romano", role: "CEO & Founder", country: "Italy", avatar: "AR", color: "from-amber-400 to-amber-600" },
  { id: 'leader-tn', name: "Themba Nkosi", role: "CTO", country: "South Africa", avatar: "TN", color: "from-green-400 to-green-600" },
  { id: 'leader-jc', name: "James Carter", role: "Head of Investments", country: "United States", avatar: "JC", color: "from-blue-400 to-blue-600" },
  { id: 'leader-sm', name: "Sophie Müller", role: "Risk Manager", country: "Germany", avatar: "SM", color: "from-purple-400 to-purple-600" },
];

const milestones = [
  { year: "2018", title: "Founded in Rome", desc: "CoinPower was founded with a vision to democratize investment for everyone" },
  { year: "2020", title: "First 1,000 Investors", desc: "Reached our first milestone with investors across 5 countries" },
  { year: "2022", title: "Expanded to 15 Countries", desc: "Grew our presence across Europe, Africa and Asia" },
  { year: "2023", title: "$10M in Returns Paid", desc: "Paid over $10 million in returns to our investors" },
  { year: "2025", title: "21 Countries, 26K+ Users", desc: "Now serving investors in 21 countries worldwide" },
];

const earningWays = [
  {
    icon: UserPlus,
    title: "Referral Program",
    desc: "Invite friends and earn more without depositing a dime. The more you refer, the more you earn!",
    color: "from-blue-400 to-blue-600",
    badge: "No Deposit Needed",
  },
  {
    icon: Cpu,
    title: "Generator Rental",
    desc: "Rent our powerful generators to earn daily income, tailored to your chosen level.",
    color: "from-amber-400 to-amber-600",
    badge: "Daily Income",
  },
  {
    icon: Trophy,
    title: "Staged Win Rewards",
    desc: "Participate in exciting win stages and stand a chance to travel to Italy, experience our culture and enjoy unforgettable experiences with our team.",
    color: "from-green-400 to-green-600",
    badge: "Travel to Italy",
  },
];

function AboutPageSkeleton() {
  return (
    <div className="pb-20 min-h-screen -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
      <Skeleton className="h-64" />
      <div className="max-w-6xl mx-auto px-7 sm:px-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-8 sm:my-10">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-24 rounded-2xl mb-8 sm:mb-10" />
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5 mb-8 sm:mb-12">
           {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    </div>
  )
}

export default function AboutPage() {
  const [media, setMedia] = useState<any[]>([]);
  const [generators, setGenerators] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const supabase = createClient();
    const fetchData = async () => {
      setIsLoading(true);
      const [mediaResult, generatorsResult] = await Promise.all([
        supabase.from('media').select('*'),
        supabase.from('generators').select('id, name, daily_income, expire_days').order('price', { ascending: true })
      ]);

      const { data: mediaData, error: mediaError } = mediaResult;
      if (mediaError) {
          toast({ title: 'Error fetching images', description: mediaError.message, variant: 'destructive'});
      } else {
          setMedia(mediaData || []);
      }

      const { data: generatorsData, error: generatorsError } = generatorsResult;
      if (generatorsError) {
          toast({ title: 'Error fetching generators', description: generatorsError.message, variant: 'destructive'});
      } else {
          setGenerators(generatorsData || []);
      }
      
      setIsLoading(false);
    }
    fetchData();
  }, [toast]);

  const COUNTRIES = COUNTRIES_DATA;
  
  if (isLoading) {
    return <AboutPageSkeleton />;
  }

  const staticProfitData = {
    pg1: { name: 'PG1 Generator', daily: 0.5 },
    pg2: { name: 'PG2 Generator', daily: 2.5 },
    pg3: { name: 'PG3 Generator', daily: 10 },
    pg4: { name: 'PG4 Generator', daily: 55 },
  };

  const profitTable = Object.keys(staticProfitData)
    .map((id) => {
      const gen = generators.find(g => g.id === id);
      const expire_days = gen ? gen.expire_days : (id === 'pg1' ? 2 : id === 'pg3' ? 45 : 30); // fallback to original static values
      const staticData = staticProfitData[id as keyof typeof staticProfitData];

      return {
        level: staticData.name,
        daily: staticData.daily,
        cycle: `${expire_days} Days`,
        total: staticData.daily * expire_days,
        monthly: id === 'pg1' ? null : staticData.daily * 30,
        asterisk: id === 'pg1',
      };
    });

  return (
    <div className="pb-20 min-h-screen -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-7 sm:px-12">
            <div className="absolute inset-0 opacity-10">
                {[...Array(4)].map((_, i) => (
                <div key={i} className="absolute rounded-full border border-amber-400"
                    style={{ width: `${(i + 1) * 100}px`, height: `${(i + 1) * 100}px`, bottom: "-50px", right: "-40px" }} />
                ))}
            </div>
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 py-10 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-2xl flex-shrink-0">
                <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                <Badge className="mb-2 bg-amber-400/20 text-amber-300 border-amber-400/30 text-xs">Est. 2018 · Rome, Italy</Badge>
                <h1 className="text-2xl sm:text-4xl font-black mb-2">
                    Welcome to <span className="text-amber-400">CoinPower</span>
                </h1>
                <p className="text-amber-300 text-base sm:text-lg font-semibold mb-2">Your Gateway to Effortless Earnings 🚀</p>
                <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                    We're passionate about empowering individuals to achieve financial freedom through cryptocurrency investments. Since 2018, our team has been dedicated to creating a secure and rewarding platform for investors worldwide.
                </p>
                </div>
            </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-6">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 my-8 sm:my-10">
          {[
            { label: "Years Active", value: "7+", icon: "📅" },
            { label: "Active Users", value: "26K+", icon: "👥" },
            { label: "Returns Paid", value: "$10M+", icon: "💰" },
            { label: "Countries", value: "21", icon: "🌍" },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-amber-100/60">
              <p className="text-2xl mb-1">{icon}</p>
              <p className="text-xl sm:text-2xl font-black text-gray-900">{value}</p>
              <p className="text-gray-500 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Free $1 Welcome Bonus ── */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-5 sm:p-7 mb-8 sm:mb-10 text-white shadow-xl">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Gift className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg sm:text-xl font-black">Get Started with a Free $1! 🎁</h2>
              </div>
              <p className="text-green-100 text-sm sm:text-base leading-relaxed">
                Join CoinPower and receive a complimentary <span className="font-bold text-white">$1</span> to kickstart your investment journey. Create an account and you'll be eligible to earn daily income without any initial deposit. As you grow with us, upgrade to higher levels and unlock greater rewards.
              </p>
            </div>
          </div>
        </div>

        {/* ── Multiple Ways to Earn ── */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">Multiple Ways to Earn</h2>
          <p className="text-gray-500 text-center text-xs sm:text-sm mb-5 sm:mb-7">Choose how you want to grow your wealth with CoinPower</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {earningWays.map(({ icon: Icon, title, desc, color, badge }) => (
              <div key={title} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-100/60 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight">{title}</h3>
                    <Badge className="mt-0.5 text-xs px-1.5 py-0 bg-amber-100 text-amber-700 border-0">{badge}</Badge>
                  </div>
                </div>
                <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Why Choose CoinPower ── */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">Why Choose CoinPower?</h2>
          <p className="text-gray-500 text-center text-xs sm:text-sm mb-5 sm:mb-8">The principles that guide everything we do</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            {[
              { icon: Star, title: "Proven Track Record", desc: "5+ years of reliable investment platform experience — trusted by 26,000+ investors worldwide.", color: "from-amber-400 to-amber-600" },
              { icon: Shield, title: "Secure & Transparent", desc: "Your investments are protected with top-notch security measures and full transparency at every step.", color: "from-green-400 to-green-600" },
              { icon: Globe, title: "Global Community", desc: "Join a vibrant community of like-minded investors across 21 countries, with Italy as our home base.", color: "from-blue-400 to-blue-600" },
              { icon: TrendingUp, title: "Consistent Growth", desc: "Our algorithms ensure consistent, predictable returns across all plans — from beginner to expert level.", color: "from-purple-400 to-purple-600" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-100/60 flex items-start gap-3 sm:gap-4">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm sm:text-base">{title}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Quick Profit Table ── */}
        <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1 flex items-center justify-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-500" />
                CoinPower Quick Profit Table
            </h2>
            <p className="text-gray-500 text-center text-xs sm:text-sm mb-5 sm:mb-8">An overview of potential earnings</p>
            <div className="bg-white rounded-2xl shadow-sm border border-amber-300 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-amber-50 border-b border-amber-200">
                                <th className="px-2 sm:px-4 py-3 text-left font-semibold text-amber-800 text-xs">Level</th>
                                <th className="px-2 sm:px-4 py-3 text-right font-semibold text-amber-800 text-xs">Daily</th>
                                <th className="px-2 sm:px-4 py-3 text-right font-semibold text-amber-800 text-xs">Cycle</th>
                                <th className="px-2 sm:px-4 py-3 text-right font-semibold text-amber-800 text-xs">Total</th>
                                <th className="px-2 sm:px-4 py-3 text-right font-semibold text-amber-800 text-xs">Monthly</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-100">
                            {profitTable.map((row) => (
                                <tr key={row.level}>
                                    <td className="px-2 sm:px-4 py-3 font-semibold text-amber-900">{row.level}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-gray-700">${row.daily.toFixed(2)}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right text-gray-700">{row.cycle}</td>
                                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-amber-600">
                                        ${row.total.toFixed(2)}{row.asterisk && '*'}
                                    </td>
                                    <td className="px-2 sm:px-4 py-3 text-right font-bold text-amber-600">
                                      {row.monthly ? `$${row.monthly.toFixed(2)}` : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-2 bg-amber-50/50 border-t border-amber-200 text-right">
                    <p className="text-xs text-amber-700 opacity-90">*Total for PG1 is based on a 2-day free trial period. The monthly amount assumes continuous rental.</p>
                </div>
            </div>
        </div>

        {/* ── Our Journey ── */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">Our Journey</h2>
          <p className="text-gray-500 text-center text-xs sm:text-sm mb-5 sm:mb-8">From a small startup in Rome to a global platform</p>
          <div className="space-y-3">
            {milestones.map(({ year, title, desc }) => (
              <div key={year} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-amber-100/60 flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <Badge className="mb-1 bg-amber-100 text-amber-700 border-0 text-xs">{year}</Badge>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{title}</h3>
                  <p className="text-gray-500 text-xs sm:text-sm mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Leadership ── */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">Leadership Team</h2>
          <p className="text-gray-500 text-center text-xs sm:text-sm mb-5 sm:mb-8">Experienced professionals dedicated to your success</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {team.map(({ id, name, role, country, avatar, color }) => {
              const imageUrl = media.find(m => m.id === id)?.url || PlaceHolderImages.find(i => i.id === id)?.imageUrl;
              return (
                <div key={name} className="bg-white rounded-2xl p-4 sm:p-5 text-center shadow-sm border border-amber-100/60">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-lg sm:text-xl mx-auto mb-3 shadow-md overflow-hidden`}>
                    {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-cover" /> : avatar}
                  </div>
                  <p className="font-bold text-gray-900 text-xs sm:text-sm">{name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{role}</p>
                  <div className="flex items-center justify-center gap-1 mt-1.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{country}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Countries ── */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 text-center mb-1">Where We Operate</h2>
          <p className="text-gray-500 text-center text-xs sm:text-sm mb-4 sm:mb-6">Serving investors in 21 countries worldwide</p>
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-100/60">
            <div className="flex flex-wrap gap-2 justify-center">
              {COUNTRIES.map((country) => (
                <div
                  key={country}
                  data-testid={`badge-country-${country.toLowerCase().replace(" ", "-")}`}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-medium transition-all ${
                    country === "Italy"
                      ? "bg-gradient-to-r from-green-50 to-red-50 border-green-300 text-green-700 font-semibold shadow-sm"
                      : country === "Ghana"
                      ? "bg-gradient-to-r from-yellow-50 to-green-50 border-yellow-300 text-yellow-800 font-semibold shadow-sm"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  {country === "Italy" && <span>🇮🇹</span>}
                  {country === "Ghana" && <span>🇬🇭</span>}
                  {country}
                  {country === "Italy" && <Badge className="text-xs px-1 py-0 bg-green-100 text-green-700 border-0 ml-0.5">HQ</Badge>}
                  {country === "Ghana" && <Badge className="text-xs px-1 py-0 bg-yellow-100 text-yellow-700 border-0 ml-0.5">New</Badge>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA Footer ── */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 sm:p-8 text-white text-center shadow-xl">
          <Award className="w-8 h-8 sm:w-10 sm:h-10 mx-auto mb-3 text-amber-100" />
          <h3 className="text-xl sm:text-2xl font-black mb-2">Ready to unlock your financial potential?</h3>
          <p className="text-amber-100 text-sm mb-5 sm:mb-6">Sign up now and start earning with CoinPower — join over 26,000 investors already building their wealth.</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 justify-center items-center">
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <span className="text-xs sm:text-sm">support@coinpower.com</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
              <Phone className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs sm:text-sm text-amber-100">Platform Manager</p>
                <p className="text-xs sm:text-sm font-semibold">+1 (856) 528-1086</p>
              </div>
            </div>
            <a href="https://t.me/coinpowerofficial" target="_blank" rel="noopener noreferrer"
              data-testid="link-telegram-about"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 transition-colors cursor-pointer">
              <SiTelegram className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-semibold">t.me/coinpowerofficial</span>
            </a>
            <div className="flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
              <span className="text-xs sm:text-sm">Via Roma 1, Rome, Italy</span>
            </div>
          </div>
        </div>

        {/* ── Copyright ── */}
        <div className="text-center py-6 border-t border-gray-200 mt-2">
          <p className="text-gray-500 text-xs sm:text-sm">
            © {new Date().getFullYear()} <span className="font-semibold text-gray-700">CoinPower</span>. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            Registered in <span className="font-medium text-gray-500 ml-1">Italy</span> &nbsp;·&nbsp; Via Roma 1, Rome, IT
          </p>
        </div>

      </div>
    </div>
  );
}
