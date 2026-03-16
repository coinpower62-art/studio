'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useImageStore } from '@/hooks/use-image-store';

export default function AboutPage() {
  const { aboutImages } = useImageStore();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">About CoinPower</h1>
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>Our Mission</CardTitle>
          <CardDescription>
            Empowering your financial journey through innovative crypto solutions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            CoinPower is a leading platform for crypto investment, providing users with powerful tools and insights to navigate the dynamic world of digital assets. Our mission is to make cryptocurrency accessible, secure, and profitable for everyone, from beginners to seasoned investors.
          </p>
          <p>
            We believe in the transformative power of blockchain technology and are dedicated to building a robust ecosystem that fosters financial freedom and innovation. Our team is composed of financial experts, seasoned developers, and passionate crypto enthusiasts who are committed to delivering a world-class experience.
          </p>
        </CardContent>
      </Card>
      
      {aboutImages.length > 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Uploaded Pictures</CardTitle>
            <CardDescription>Images you've uploaded from the Upload Room.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {aboutImages.map((image) => (
                <Card key={image.id} className="overflow-hidden shadow-md">
                  <CardContent className="p-0">
                    <div className="relative aspect-video">
                      <Image
                        src={image.url}
                        alt={image.description}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>Contact Us</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Have questions? Reach out to our support team at <a href="mailto:support@coinpower.com" className="font-medium text-primary hover:underline">support@coinpower.com</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
