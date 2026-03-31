"use client";

import { cn } from "@/lib/utils";
import Image from 'next/image';
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "./ui/skeleton";

export function Logo({ className }: { className?: string }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        const fetchLogo = async () => {
            const { data } = await supabase
                .from('media')
                .select('url')
                .eq('id', 'app-logo')
                .single();
            
            setLogoUrl(data?.url || "https://picsum.photos/seed/coinpowerlogo/32/32");
            setLoading(false);
        };
        fetchLogo();
    }, []);

    return (
    <div className={cn("flex items-center gap-2", className)}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white p-0.5">
            {loading ? (
                <Skeleton className="w-full h-full rounded-sm" />
            ) : (
                <Image
                    src={logoUrl!}
                    alt="CoinPower Logo"
                    width={28}
                    height={28}
                    className="rounded object-contain"
                />
            )}
        </div>
      <span className="text-xl font-bold text-foreground">CoinPower</span>
    </div>
  );
}
