export const runtime = 'edge';
import type {Metadata} from 'next';
import {Toaster} from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import { SplashProvider } from '@/components/SplashProvider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: 'CoinPower',
  description: 'Your powerhouse for crypto investment.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn("font-body antialiased", "min-h-screen bg-background font-sans")}>
        <TooltipProvider>
          <SplashProvider>
            {children}
            <Toaster />
          </SplashProvider>
        </TooltipProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
