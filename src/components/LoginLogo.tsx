"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

export function LoginLogo({ className }: { className?: string }) {
    const logoUrl = "/logo.png";

    return (
        <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center", className)}>
            <Image
                src={logoUrl}
                alt="CoinPower Logo"
                width={64}
                height={64}
                className="rounded-2xl object-contain"
            />
        </div>
    );
}
