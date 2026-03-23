'use client';

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

export function Logo({ className }: { className?: string }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
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
    }, []);

    const SvgIcon = () => (
        <svg
            width="32"
            height="32"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
        >
            <circle cx="16" cy="16" r="14" fill="currentColor" />
            <path
                d="M19 12L14.5 19L17 19L13 26L17.5 18L15 18L19 12Z"
                fill="black"
            />
        </svg>
    );

    return (
    <div className={cn("flex items-center gap-2", className)}>
        {logoUrl ? (
            <div className="w-8 h-8 rounded-md bg-black flex items-center justify-center overflow-hidden">
                <img src={logoUrl} alt="CoinPower" className="w-full h-full object-cover" />
            </div>
        ) : (
            <SvgIcon />
        )}
      <span className="text-xl font-bold text-foreground">CoinPower</span>
    </div>
  );
}
