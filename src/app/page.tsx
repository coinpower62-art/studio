import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const runtime = 'edge';

export default function HomePage() {
  const coverImageUrl = 'https://picsum.photos/seed/joyfulwoman/1080/1920';

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Using a standard img tag to ensure static analysis is simple */}
      <img
        src={coverImageUrl}
        alt="A joyful woman smiling, representing financial freedom with CoinPower."
        className="object-cover z-0 absolute inset-0 w-full h-full"
        data-ai-hint="woman smiling"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
      <div className="relative z-20 flex h-full flex-col items-center justify-end p-4 pb-24 text-center text-white sm:pb-32">
        <h1 className="text-4xl font-black leading-tight drop-shadow-xl sm:text-5xl">
          Welcome to <span className="text-primary">Coin</span>Power
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-200 drop-shadow-md md:text-xl">
          Your gateway to effortless earnings through crypto tracking.
        </p>
        <Link href="/login" className="mt-8">
          <Button
            size="lg"
            className="h-14 rounded-full bg-primary px-10 text-lg font-bold text-primary-foreground shadow-2xl transition-transform hover:scale-105 active:scale-100"
          >
            Get Started
          </Button>
        </Link>
      </div>
    </main>
  );
}
