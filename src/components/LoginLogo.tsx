'use client';

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function LoginLogo({ className }: { className?: string }) {
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

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
            setLoading(false);
        };
        fetchLogo();
    }, []);

    const SvgLogo = () => (
        <svg
            width="40"
            height="40"
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

    if (loading) {
        return <Skeleton className={cn("w-16 h-16 rounded-2xl mx-auto mb-3", className)} />
    }

    return (
        <div className={cn("w-16 h-16 rounded-2xl border-2 border-amber-500/50 shadow-lg overflow-hidden mx-auto mb-3", className)}>
            <div className="w-full h-full bg-black flex items-center justify-center">
                {logoUrl ? (
                    <img src={logoUrl} alt="CoinPower Logo" className="w-full h-full object-cover" />
                ) : (
                    <SvgLogo />
                )}
            </div>
        </div>
    );
}
