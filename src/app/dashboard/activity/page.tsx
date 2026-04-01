'use client';
export const runtime = 'edge';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Users, MessageSquare, TrendingUp, Star, Globe, Clock, ArrowUpRight, Shield, Award, BadgeCheck, Building2, CheckCircle2, Landmark, FileText, Crown, Loader, AlertCircle, LogOut
} from "lucide-react";
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/login/actions';

type Profile = {
  balance: number;
  country: string;
  full_name: string;
  username: string;
};

const liveActivities = [
  { user: "Marco R.", country: "Italy", action: "Activated PG3 Generator", amount: "+$2,400", time: "2 min ago", avatar: "MR", color: "from-green-400 to-green-600" },
  { user: "Sarah K.", country: "United States", action: "Deposited funds", amount: "+$5,000", time: "5 min ago", avatar: "SK", color: "from-amber-400 to-amber-600" },
  { user: "Luca B.", country: "Italy", action: "Earned daily profit", amount: "+$320", time: "8 min ago", avatar: "LB", color: "from-blue-400 to-blue-600" },
  { user: "Emma W.", country: "United Kingdom", action: "Upgraded to Gold Power", amount: "$1,000/mo", time: "12 min ago", avatar: "EW", color: "from-purple-400 to-purple-600" },
  { user: "Carlos M.", country: "Mexico", action: "Withdrew profits", amount: "$800", time: "15 min ago", avatar: "CM", color: "from-red-400 to-red-600" },
  { user: "Yuki T.", country: "Japan", action: "Activated PG4 Generator", amount: "+$50,000", time: "20 min ago", avatar: "YT", color: "from-pink-400 to-pink-600" },
];

const topInvestors = [
  { name: "Alessio F.", country: "Italy", profit: "$48,200", rank: 1, avatar: "AF", color: "from-amber-400 to-amber-600" },
  { name: "Zhang W.", country: "China", profit: "$42,100", rank: 2, avatar: "ZW", color: "from-gray-400 to-gray-600" },
  { name: "Emma L.", country: "Germany", profit: "$38,500", rank: 3, avatar: "EL", color: "from-yellow-600 to-yellow-800" },
  { name: "David S.", country: "Canada", profit: "$31,800", rank: 4, avatar: "DS", color: "from-blue-400 to-blue-600" },
  { name: "Sofia G.", country: "Spain", profit: "$28,900", rank: 5, avatar: "SG", color: "from-green-400 to-green-600" },
];

const announcements = [
  { title: "New PG5 Generator Coming Soon!", date: "Mar 10, 2026", tag: "New", tagColor: "bg-green-100 text-green-700" },
  { title: "March Bonus: Extra 5% on all deposits", date: "Mar 8, 2026", tag: "Bonus", tagColor: "bg-amber-100 text-amber-700" },
  { title: "System maintenance scheduled for Mar 15", date: "Mar 7, 2026", tag: "Info", tagColor: "bg-blue-100 text-blue-700" },
];

function ActivityPageSkeleton() {
    return (
      <div className="pb-20 min-h-screen -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
        <Skeleton className="w-full aspect-[3/1] mb-4 sm:mb-6" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="lg:col-span-2"><Skeleton className="h-64 rounded-2xl" /></div>
                <div className="space-y-4">
                    <Skeleton className="h-48 rounded-2xl" />
                    <Skeleton className="h-48 rounded-2xl" />
                </div>
            </div>
        </div>
    </div>
    );
}

export default function ActivityPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [media, setMedia] = useState<any[]>([]);

  const heroImg = media.find(m => m.id === 'hero')?.url || PlaceHolderImages.find(i => i.id === 'activity-hero')?.imageUrl;
  const teamWorkImg = media.find(m => m.id === 'teamwork')?.url || PlaceHolderImages.find(i => i.id === 'activity-teamwork')?.imageUrl;
  
  // For now, admin posts are static.
  const adminPosts: any[] = [];

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setIsLoading(true);

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      toast({ title: "Authentication Error", description: "Could not get user session. Redirecting to login.", variant: "destructive" });
      router.push('/login');
      return;
    }
    setUser(authUser);

    const [profileResult, mediaResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('balance, country, full_name, username')
        .eq('id', authUser.id)
        .maybeSingle(),
      supabase.from('media').select('*')
    ]);

    const { data: profileData, error: profileError } = profileResult;
    if (profileError) {
      console.error("ActivityPage: Profile fetch failed.", profileError);
      toast({ title: "Error Fetching Profile", description: profileError.message, variant: "destructive" });
    }
    setProfile(profileData as Profile | null);
    
    const { data: mediaData, error: mediaError } = mediaResult;
    if (mediaError) {
        console.error("ActivityPage: Media fetch failed.", mediaError);
        toast({ title: 'Error fetching images', description: mediaError.message, variant: 'destructive'});
    } else {
        setMedia(mediaData || []);
    }
    
    setIsLoading(false);
  }, [router, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading || !profile) {
    return <ActivityPageSkeleton />;
  }

  const licenseCards = [
    {
      id: "license-consob",
      icon: Landmark,
      body: "CONSOB",
      bodyFull: "Commissione Nazionale per le Società e la Borsa",
      ref: "IT-CONSOB-2019-04821",
      desc: "Italian Securities & Exchange Commission — authorisation to operate as a licensed investment intermediary on Italian and EU financial markets.",
      issued: "14 March 2019",
      expires: "14 March 2029",
      badge: "Active",
      stampColor: "#1a3c6e",
      headerColor: "from-[#1a3c6e] to-[#2d5fa3]",
    },
    {
      id: "license-banca",
      icon: Building2,
      body: "Banca d'Italia",
      bodyFull: "Bank of Italy — Financial Intelligence Unit",
      ref: "BI-FIU-2020-00374",
      desc: "Authorised by the Central Bank of Italy for cross-border capital management, digital asset custody and regulated fund distribution.",
      issued: "02 June 2020",
      expires: "02 June 2030",
      badge: "Active",
      stampColor: "#7a5200",
      headerColor: "from-[#7a5200] to-[#c48a00]",
    },
    {
      id: "license-camera",
      icon: FileText,
      body: "Camera di Commercio",
      bodyFull: "Italian Chamber of Commerce — Rome",
      ref: "P.IVA IT 04837612009",
      desc: "Registered legal entity in the Italian Business Registry with full trading rights across all 27 EU member states.",
      issued: "08 January 2019",
      expires: "Permanent",
      badge: "Registered",
      stampColor: "#8b0000",
      headerColor: "from-[#8b0000] to-[#c0392b]",
    },
    {
      id: "license-mica",
      icon: Award,
      body: "EU MiCA Compliance",
      bodyFull: "Markets in Crypto-Assets Regulation — European Union",
      ref: "EU-MiCA-2024-IT-0091",
      desc: "Fully compliant with the EU Markets in Crypto-Assets framework, enabling regulated digital asset investment services across all EU countries.",
      issued: "01 January 2024",
      expires: "01 January 2027",
      badge: "Certified",
      stampColor: "#4a1080",
      headerColor: "from-[#4a1080] to-[#7b2fbe]",
    },
  ];

  return (
    <div className="pb-20 min-h-screen -mx-4 sm:-mx-6 -mt-4 sm:-mt-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden mb-4 sm:mb-6 shadow-lg">
          <img src={heroImg} alt="CoinPower Team" className="w-full h-auto block" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs font-semibold uppercase tracking-wide">Live</span>
              </div>
              <h1 className="text-white text-xl sm:text-2xl font-black drop-shadow">Activity Room</h1>
              <p className="text-white/75 text-xs sm:text-sm">Live global investment activity · CoinPower HQ</p>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h2 className="font-bold text-gray-900 text-sm sm:text-base">Live Activity Feed</h2>
              </div>
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                {adminPosts.length + liveActivities.length} Live
              </Badge>
            </div>
            <div className="divide-y divide-gray-50">
              {adminPosts.map(function(p: any) {
                return (
                <div key={p.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarFallback className={`bg-gradient-to-br ${p.color} text-white text-xs font-bold`}>
                      {p.avatar || p.username?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">{p.username}</p>
                      <div className="flex items-center gap-1 hidden sm:flex">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{p.country}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.action}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-green-600 flex items-center gap-0.5 justify-end">
                      <ArrowUpRight className="w-3 h-3" />
                      {p.amount}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      Just now
                    </p>
                  </div>
                </div>
              )})}
              {liveActivities.map(function({ user: u, country, action, amount, time, avatar, color }, i) {
                return (
                <div key={i} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                  <Avatar className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0">
                    <AvatarFallback className={`bg-gradient-to-br ${color} text-white text-xs font-bold`}>
                      {avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs sm:text-sm font-semibold text-gray-900">{u}</p>
                      <div className="flex items-center gap-1 hidden sm:flex">
                        <Globe className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{country}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{action}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-green-600 flex items-center gap-0.5 justify-end">
                      <ArrowUpRight className="w-3 h-3" />
                      {amount}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-0.5 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {time}
                    </p>
                  </div>
                </div>
              )})}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="font-bold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Top Investors
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Live
                </span>
              </div>
              <div className="overflow-hidden" style={{ height: "220px" }}>
                <div className="animate-scroll-up">
                  {[...topInvestors, ...topInvestors].map(function({ name, country, profit, rank, avatar, color }, i) {
                    return (
                    <div key={i} className="flex items-center gap-2 sm:gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        rank === 1 ? "bg-amber-500" : rank === 2 ? "bg-gray-400" : rank === 3 ? "bg-yellow-700" : "bg-gray-300"
                      }`}>
                        {rank}
                      </div>
                      <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                        <AvatarFallback className={`bg-gradient-to-br ${color} text-white text-xs font-bold`}>
                          {avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{name}</p>
                        <p className="text-xs text-gray-400">{country}</p>
                      </div>
                      <span className="text-xs font-bold text-green-600 flex-shrink-0">{profit}</span>
                    </div>
                  )})}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
              <h2 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Announcements
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {announcements.map(function({ title, date, tag, tagColor }) {
                  return (
                  <div key={title} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tagColor} mb-1 inline-block`}>{tag}</span>
                    <p className="text-xs sm:text-sm font-medium text-gray-800">{title}</p>
                    <p className="text-xs text-gray-400 mt-1">{date}</p>
                  </div>
                )})}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4 sm:mb-6">
            <div className="bg-white rounded-t-2xl px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl shadow-md flex-shrink-0 overflow-hidden flex border border-gray-200">
                  <div className="flex-1 bg-[#009246]" />
                  <div className="flex-1 bg-white" />
                  <div className="flex-1 bg-[#ce2b37]" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-base sm:text-lg leading-tight">Italy Investment Licences</h2>
                  <p className="text-gray-500 text-xs sm:text-sm">Officially registered &amp; regulated in the Italian Republic</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">
                  <Shield className="w-3.5 h-3.5" /> EU Compliant
                </span>
              </div>
            </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {licenseCards.map((card) => {
              const { id, icon: Icon, body, bodyFull, ref, desc, issued, expires, badge, stampColor, headerColor } = card;
              const imageUrl = media.find(m => m.id === id)?.url;
              const cardStyles = imageUrl ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};
              return (
              <div key={id} className="relative rounded-2xl overflow-hidden shadow-lg h-80"
                style={{ border: "3px solid #c9a84c", ...cardStyles }}>
                {!imageUrl && (
                    <div style={{background: "linear-gradient(135deg,#fffdf4 0%,#fff8e1 50%,#fffdf4 100%)"}} className="absolute inset-0">
                        <div className="absolute inset-[6px] rounded-xl pointer-events-none z-10"
                        style={{ border: "1.5px solid #c9a84c", opacity: 0.5 }} />
                        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map(function(pos) {
                        return (
                        <div key={pos} className={`absolute ${pos} w-4 h-4 z-20 pointer-events-none`}
                            style={{ background: "radial-gradient(circle,#c9a84c 30%,transparent 70%)", opacity: 0.7 }} />
                        )})}
                        <div className={`bg-gradient-to-r ${headerColor}`}>
                        <div className="px-4 py-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                            <p className="text-white font-black text-sm leading-tight">{body}</p>
                            <p className="text-white/70 text-[10px] italic truncate">{bodyFull}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-400/30 text-green-100 border border-green-300/40 flex-shrink-0">{badge}</span>
                        </div>
                        </div>
                        <div className="p-4 relative">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-[0.04] z-0">
                            <span className="text-7xl font-black text-gray-800 rotate-[-25deg] tracking-widest">CERTIFIED</span>
                        </div>
                        <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
                            <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-0.5">Certificate of Authorization</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{desc}</p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-center" style={{ minWidth: 60 }}>
                            <div className="relative w-[58px] h-[58px]">
                                <svg viewBox="0 0 58 58" className="absolute inset-0 w-full h-full">
                                <circle cx="29" cy="29" r="27" fill="none" stroke={stampColor} strokeWidth="2.5" strokeDasharray="4 2" />
                                <circle cx="29" cy="29" r="22" fill="none" stroke={stampColor} strokeWidth="1" opacity="0.5" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-[22px] rounded-sm overflow-hidden flex shadow-sm border border-gray-300">
                                    <div className="flex-1 bg-[#009246]" />
                                    <div className="flex-1 bg-white" />
                                    <div className="flex-1 bg-[#ce2b37]" />
                                </div>
                                </div>
                                <svg viewBox="0 0 58 58" className="absolute inset-0 w-full h-full">
                                <path id={`arc-${body}`} d="M 29,29 m -20,0 a 20,20 0 1,1 40,0" fill="none" />
                                <text fontSize="5.5" fill={stampColor} fontWeight="700" letterSpacing="1.5">
                                    <textPath href={`#arc-${body}`} startOffset="10%">ITALIA · UFFICIALE · 🇮🇹</textPath>
                                </text>
                                </svg>
                            </div>
                            <p className="text-[8px] font-bold text-center mt-1" style={{ color: stampColor }}>TIMBRO UFFICIALE</p>
                            </div>
                        </div>
                        <div className="relative z-10 flex items-center gap-2 mb-3 p-2 rounded-lg"
                            style={{ background: `rgba(${parseInt(stampColor.slice(1, 3), 16)}, ${parseInt(stampColor.slice(3, 5), 16)}, ${parseInt(stampColor.slice(5, 7), 16)}, 0.12)`, border: `1px solid rgba(${parseInt(stampColor.slice(1, 3), 16)}, ${parseInt(stampColor.slice(3, 5), 16)}, ${parseInt(stampColor.slice(5, 7), 16)}, 0.4)` }}>
                            <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: stampColor }} />
                            <p className="text-[10px] font-mono font-black tracking-wide" style={{ color: stampColor }}>Ref No. {ref}</p>
                        </div>
                        <div className="relative z-10 flex gap-2">
                            <div className="flex-1 bg-white/70 rounded-lg p-2 border border-amber-200/60">
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider">Date Issued</p>
                            <p className="text-[10px] font-bold text-gray-700">{issued}</p>
                            </div>
                            <div className="flex-1 bg-white/70 rounded-lg p-2 border border-amber-200/60">
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider">Valid Until</p>
                            <p className="text-[10px] font-bold text-gray-700">{expires}</p>
                            </div>
                            <div className="flex-1 bg-white/70 rounded-lg p-2 border border-amber-200/60 flex flex-col items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mb-0.5" />
                            <p className="text-[9px] font-bold text-green-700">VERIFIED</p>
                            </div>
                        </div>
                        <div className="relative z-10 mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                            <div>
                                <div className="h-0.5 w-24 bg-gray-400/40 mb-0.5" />
                                <p className="text-[9px] text-gray-400">Authorised Signatory</p>
                            </div>
                            <p className="text-[9px] text-gray-400 italic">CoinPower Italy S.r.l.</p>
                        </div>
                        </div>
                    </div>
                )}
              </div>
            )})}
          </div>

          <div className="border-t border-gray-100 px-4 sm:px-6 py-3 bg-gray-50/50 flex items-center gap-2 rounded-b-2xl">
            <BadgeCheck className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-gray-500">All licences are publicly verifiable through the respective Italian and European regulatory authority portals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
              <h3 className="font-bold text-white text-sm sm:text-base">Community Stats</h3>
              <p className="text-green-100 text-xs">Global CoinPower network</p>
            </div>
            <div>
              <div className="relative overflow-hidden">
                <img src={teamWorkImg} alt="CoinPower Team at Work" className="w-full h-auto block" />
                <div className="absolute inset-0 bg-black/55" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <p className="text-xl sm:text-2xl font-black">26,160</p>
                  <p className="text-gray-200 text-xs sm:text-sm">Active Investors Worldwide</p>
                  <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-3">
                    {[{ flag: "🇮🇹", count: "2,340" }, { flag: "🇬🇭", count: "890" }, { flag: "🇺🇸", count: "5,120" }].map(function({ flag, count }) {
                      return (
                      <div key={flag} className="text-center">
                        <p className="text-base sm:text-lg">{flag}</p>
                        <p className="text-xs text-gray-200">{count}</p>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Countries", value: "21", icon: "🌍" },
                    { label: "Daily Volume", value: "$2.4M", icon: "📈" },
                    { label: "Satisfaction", value: "98%", icon: "⭐" },
                  ].map(function({ label, value, icon }) {
                    return (
                    <div key={label} className="bg-gray-50 rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-xl mb-0.5">{icon}</p>
                      <p className="font-bold text-gray-900 text-xs sm:text-sm">{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  )})}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
