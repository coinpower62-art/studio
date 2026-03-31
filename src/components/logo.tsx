"use client";

import { cn } from "@/lib/utils";
import Image from 'next/image';

export function Logo({ className }: { className?: string }) {
    const logoUrl = "https://picsum.photos/seed/coinpowerlogo/32/32";

    return (
    <div className={cn("flex items-center gap-2", className)}>
        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white p-0.5">
            <Image
                src={logoUrl}
                alt="CoinPower Logo"
                width={28}
                height={28}
                className="rounded"
            />
        </div>
      <span className="text-xl font-bold text-foreground">CoinPower</span>
    </div>
  );
}
