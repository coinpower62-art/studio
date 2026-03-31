"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function SplashScreen({ onDone }: { onDone: () => void; }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    // Splash screen timings
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 2200);
    const t3 = setTimeout(() => onDone(), 2900);
    
    // Fetch logo in parallel
    const fetchLogo = async () => {
        const supabase = createClient();
        const { data } = await supabase
            .from('media')
            .select('url')
            .eq('id', 'app-logo')
            .single();
        if (data?.url) {
            setLogoUrl(data.url);
        }
    };

    fetchLogo();

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const finalLogoUrl = logoUrl || "https://picsum.photos/seed/coinpowerlogo/80/80";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-700 ease-in-out ${phase === "out" ? "opacity-0" : "opacity-100"}`}
      style={{pointerEvents: phase === 'out' ? 'none' : 'all'}}
    >
      <div
        className={`relative mb-4 transition-all duration-500 ease-custom-in-out ${phase === "in" ? "opacity-0 scale-75" : "opacity-100 scale-100"}`}
      >
        <div className="w-24 h-24 rounded-3xl bg-white flex items-center justify-center p-2 shadow-lg">
            <Image 
                src={finalLogoUrl}
                alt="CoinPower Logo"
                width={80}
                height={80}
                className="rounded-2xl object-contain"
                priority
            />
        </div>
      </div>

      <div
        className={`text-center transition-all duration-500 delay-150 ${phase === "in" ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"}`}
      >
        <h1 className="text-4xl font-black text-zinc-800 leading-none">
          CoinPower
        </h1>
        <p className="text-zinc-500 text-sm font-bold mt-2 tracking-widest">
          DIGITAL ENERGY MINING
        </p>
      </div>

      <div
        className={`mt-16 flex gap-2 transition-opacity duration-400 delay-300 ${phase === "in" ? "opacity-0" : "opacity-100"}`}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-amber-400 animate-dot-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
