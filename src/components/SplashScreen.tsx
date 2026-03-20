'use client';

import { useState, useEffect } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("out"), 2200);
    const t3 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-green-900 via-zinc-800 to-amber-800 transition-opacity duration-700 ease-in-out ${phase === "out" ? "opacity-0" : "opacity-100"}`}
      style={{pointerEvents: phase === 'out' ? 'none' : 'all'}}
    >
      <div
        className={`relative mb-7 transition-all duration-500 ease-custom-in-out ${phase === "in" ? "opacity-0 scale-60" : "opacity-100 scale-100"}`}
      >
        <div className="absolute -inset-2.5 rounded-full bg-radial-glow animate-pulse-glow" />
        <div className="w-[108px] h-[108px] rounded-[28px] border-[3px] border-amber-500/70 shadow-[0_0_40px_rgba(201,137,26,0.4),_0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="w-full h-full bg-black flex items-center justify-center">
                 <svg
                    width="64"
                    height="64"
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-primary"
                >
                    <circle cx="16" cy="16" r="14" fill="currentColor" />
                    <path
                        d="M19 12L14.5 19L17 19L13 26L17.5 18L15 18L19 12Z"
                        fill="#000"
                    />
                </svg>
            </div>
        </div>
      </div>

      <div
        className={`text-center transition-all duration-500 delay-150 ${phase === "in" ? "opacity-0 translate-y-5" : "opacity-100 translate-y-0"}`}
      >
        <h1 className="text-4xl font-extrabold text-white leading-none -tracking-wide">
          Coin<span className="text-amber-400">Power</span>
        </h1>
        <p className="text-amber-300/75 text-sm font-medium mt-2 tracking-wider">
          Digital Energy Mining Platform
        </p>
      </div>

      <div
        className={`mt-12 flex gap-2 transition-opacity duration-400 delay-300 ${phase === "in" ? "opacity-0" : "opacity-100"}`}
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
