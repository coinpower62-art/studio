'use client';
import { useState, useEffect, ReactNode } from 'react';
import { SplashScreen } from './SplashScreen';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Paths where the splash screen should NOT appear
const NO_SPLASH_PATHS = ["/admin", "/admin/dashboard", "/video-tutorial"];

export function SplashProvider({children}: {children: ReactNode}) {
    const pathname = usePathname();
    const isSpecialPath = NO_SPLASH_PATHS.some(p => pathname.startsWith(p));
    
    // Default to not showing splash screen, then check on client. This prevents flashes.
    const [showSplash, setShowSplash] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
        const splashDone = sessionStorage.getItem("cp_splash_done") === "1";
        if (splashDone || isSpecialPath) {
            setShowSplash(false);
        } else {
            setShowSplash(true);
            document.body.style.overflow = 'hidden';
            
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
        }
    }, [isSpecialPath, pathname]);

    // Register service worker for PWA capabilities
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('CoinPower Engine Active');
            });
        }
    }, []);


    const handleSplashDone = () => {
        sessionStorage.setItem("cp_splash_done", "1");
        setShowSplash(false);
        document.body.style.overflow = '';
    };

    return (
        <>
            {isClient && showSplash && <SplashScreen onDone={handleSplashDone} logoUrl={logoUrl} />}
            {children}
        </>
    )
}
