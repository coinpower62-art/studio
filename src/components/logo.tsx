'use client';

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
    const logoUrl = '/icon-512x512.png';

    const SvgIcon = () => (
        <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="logo-gradient-small" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#F97316"/>
                    <stop offset="1" stop-color="#EC4899"/>
                </linearGradient>
            </defs>
            <path d="M11.9999 15.132C11.9999 15.132 10.5179 12.213 13.1329 10.899C15.7479 9.585 18.9999 10.461 18.9999 10.461C18.9999 10.461 16.9219 7.419 14.3059 8.64C11.6899 9.861 11.9999 15.132 11.9999 15.132Z" fill="url(#logo-gradient-small)"/>
            <path d="M12.0001 8.868C12.0001 8.868 13.4821 11.787 10.8671 13.101C8.25211 14.415 5.00012 13.539 5.00012 13.539C5.00012 13.539 7.07812 16.581 9.69412 15.36C12.3101 14.139 12.0001 8.868 12.0001 8.868Z" fill="url(#logo-gradient-small)"/>
        </svg>
    );

    return (
    <div className={cn("flex items-center gap-2", className)}>
        {logoUrl ? (
            <img src={logoUrl} alt="CoinPower" className="w-8 h-8 rounded-md object-contain" />
        ) : (
             <div className="w-8 h-8 rounded-md flex items-center justify-center">
                <SvgIcon />
            </div>
        )}
      <span className="text-xl font-bold text-foreground">CoinPower</span>
    </div>
  );
}
