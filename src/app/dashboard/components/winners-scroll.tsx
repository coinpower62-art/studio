'use client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { winners } from "@/lib/data";

export function WinnersScroll() {
  // Duplicate the list for a seamless scrolling effect
  const duplicatedWinners = [...winners, ...winners];

  return (
    <Card className="shadow-md h-full">
      <CardHeader>
        <CardTitle>2026 Live Earnings 🏆</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative overflow-hidden">
          <div className="absolute top-0 flex flex-col w-full animate-scroll-up">
            {duplicatedWinners.map((winner, index) => (
              <div key={index} className="flex justify-between items-center p-2 border-b">
                <span className="font-medium">{winner.name}</span>
                <span className="text-growth font-bold">${winner.earnings.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
