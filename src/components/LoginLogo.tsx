"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "./ui/skeleton";

export function LoginLogo({ className }: { className?: string }) {
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
            
            setLogoUrl(data?.url || "https://picsum.photos/seed/coinpowerlogo/64/64");
            setLoading(false);
        };
        fetchLogo();
    }, []);

    return (
        <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-3 bg-white flex items-center justify-center p-1 shadow-md", className)}>
             {loading ? (
                <Skeleton className="w-full h-full rounded-xl" />
             ) : (
                <Image
                    src={logoUrl!}
                    alt="CoinPower Logo"
                    width={56}
                    height={56}
                    className="rounded-xl object-contain"
                />
             )}
        </div>
    );
}
