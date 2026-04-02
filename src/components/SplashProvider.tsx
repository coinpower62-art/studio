'use client';
import { useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export function SplashProvider({children}: {children: ReactNode}) {
    const pathname = usePathname();

    // Register service worker for PWA capabilities
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('CoinPower Engine Active');
            });
        }
    }, []);
    
    useEffect(() => {
        const chunkLoadErrorHandler = (event: PromiseRejectionEvent) => {
            if (event.reason && event.reason.name === 'ChunkLoadError') {
                console.warn('ChunkLoadError detected, forcing page reload.');
                window.location.reload();
            }
        };

        window.addEventListener('unhandledrejection', chunkLoadErrorHandler);

        return () => {
            window.removeEventListener('unhandledrejection', chunkLoadErrorHandler);
        };
    }, []);

    // Ensure body overflow is reset on navigation
    useEffect(() => {
      document.body.style.overflow = '';
    }, [pathname]);


    return (
        <>
            {children}
        </>
    )
}
