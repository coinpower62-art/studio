'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function AboutPage() {
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
