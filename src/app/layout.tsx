import type {Metadata, Viewport} from 'next';
import {Toaster} from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import { SplashProvider } from '@/components/SplashProvider';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  title: "CoinPower",
  description: "Digital Energy Mining",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CoinPower',
  },
  icons: {
    icon: '/icon-512x512.png',
    apple: '/icon-512x512.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#b8860b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
      </body>
    </html>
  );
}
