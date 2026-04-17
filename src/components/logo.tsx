"use client";

import { cn } from "@/lib/utils";
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
    const logoUrl = "/icon-512x512.png";

    return (
    <div className={cn("flex items-center gap-2", className)}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center">
            <Image
                src={logoUrl}
                alt="CoinPower Logo"
                width={32}
                height={32}
                className="rounded-md object-contain"
            />
        </div>
      <span className="text-xl font-bold text-foreground">
        <span className="text-primary">Coin</span>Power
      </span>
    </div>
  );
}
