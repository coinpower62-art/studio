import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  const { data: mediaData } = await supabase
    .from('media')
    .select('url')
    .eq('id', 'homepage-cover')
    .single();

  const coverImageUrl = mediaData?.url || 'https://picsum.photos/seed/joyfulwoman/1080/1920';

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background">
      <Image
        src={coverImageUrl}
        alt="A joyful woman smiling, representing financial freedom with CoinPower."
        fill
        className="object-cover z-0"
        data-ai-hint="woman smiling"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10" />
      <div className="relative z-20 flex h-full flex-col items-center justify-end p-4 pb-24 text-center text-white sm:pb-32">
        <h1 className="text-5xl font-black text-white drop-shadow-lg md:text-7xl">
          Welcome to <span className="text-primary">Coin</span>Power
        </h1>
        <p className="mt-4 max-w-xl text-lg text-gray-200 drop-shadow-md md:text-xl">
          Your gateway to effortless earnings through digital energy mining.
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
