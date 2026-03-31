"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";

export function LoginLogo({ className }: { className?: string }) {
    const logoUrl = "/icon-512x512.png";

    return (
        <div className={cn("w-16 h-16 rounded-2xl mx-auto mb-3 bg-white flex items-center justify-center p-1 shadow-md", className)}>
            <Image
                src={logoUrl}
                alt="CoinPower Logo"
                width={56}
                height={56}
                className="rounded-xl object-contain"
            />
        </div>
    );
}
