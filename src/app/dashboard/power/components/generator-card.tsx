'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUserStore, type RentedGenerator } from '@/hooks/use-user-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import type { Generator } from '@/lib/data';
import { Users, TrendingUp, Clock, Tag } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface GeneratorCardProps {
    generator: Generator;
    rentedInstance?: RentedGenerator;
}

function formatTime(ms: number) {
  if (ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function GeneratorCard({ generator, rentedInstance }: GeneratorCardProps) {
    const { rentGenerator, collectEarnings, balance } = useUserStore();
    const { toast } = useToast();
    const router = useRouter();
    const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);

    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!rentedInstance || !(rentedInstance.rentalEndTime instanceof Timestamp)) {
          setTimeLeft(null);
          return;
        }

        const rentalEndTimeMs = rentedInstance.rentalEndTime.toMillis();

        const updateTimer = () => {
            const now = Date.now();
            const distance = rentalEndTimeMs - now;
            setTimeLeft(distance);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [rentedInstance]);

    const handleRent = () => {
        const result = rentGenerator(generator.id);
        if (result === 'insufficient_funds') {
            setShowInsufficientFunds(true);
        } else {
            toast({
                title: 'Success!',
                description: `${generator.name} has been rented.`,
            });
            router.push('/dashboard/power');
        }
    };

    const handleCollect = () => {
        if (rentedInstance) {
            const result = collectEarnings(rentedInstance);
            if (result === 'collected') {
                toast({
                    title: 'Earnings Collected!',
                    description: `You've collected $${generator.dailyIncome.toFixed(2)}.`,
                });
            } else if (result === 'expired') {
                toast({
                    title: 'Generator Expired',
                    description: `${generator.name} has completed its rental duration.`,
                });
            }
        }
    };

    const isTimerFinished = timeLeft !== null && timeLeft <= 0;

    const colorMap: { [key: string]: { gradient: string, button: string } } = {
        amber: { gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', button: 'bg-gradient-to-r from-amber-400 to-orange-500' },
        green: { gradient: 'bg-gradient-to-br from-green-400 to-emerald-600', button: 'bg-gradient-to-r from-green-400 to-emerald-600' },
        blue: { gradient: 'bg-gradient-to-br from-blue-400 to-indigo-600', button: 'bg-gradient-to-r from-blue-400 to-indigo-600' },
        purple: { gradient: 'bg-gradient-to-br from-purple-500 to-pink-600', button: 'bg-gradient-to-r from-purple-500 to-pink-600' },
    };
    const cardColors = colorMap[generator.color] || { gradient: 'bg-gradient-to-br from-gray-400 to-gray-600', button: 'bg-gradient-to-r from-gray-400 to-gray-600' };

    return (
        <div>
            <Card className="shadow-lg flex flex-col h-full border-border/20 hover:border-primary/60 transition-all bg-card overflow-hidden rounded-xl">
                <CardHeader className={`p-4 ${cardColors.gradient} text-white`}>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-bold">{generator.name}</CardTitle>
                        <span className="text-4xl">{generator.icon}</span>
                    </div>
                    <CardDescription className="text-white/80">{generator.subtitle}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> <span><strong className="font-semibold text-foreground">ROI:</strong> {generator.roi}</span></div>
                        <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> <span><strong className="font-semibold text-foreground">Investors:</strong> {generator.investors}</span></div>
                        <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-primary" /> <span><strong className="font-semibold text-foreground">Price:</strong> <span className={generator.isFree ? "text-accent font-bold" : "font-bold text-foreground"}>{generator.price === 0 ? 'Free' : `$${generator.price.toFixed(2)}`}</span></span></div>
                        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> <span><strong className="font-semibold text-foreground">Duration:</strong> {generator.duration} days</span></div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-center space-y-1 border">
                        <p className="font-bold text-lg text-growth">${generator.dailyIncome.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Daily Income</p>
                    </div>

                    {rentedInstance && timeLeft !== null && (
                        <div className="p-2 bg-muted rounded-md text-center border">
                            <p className="text-xs text-muted-foreground">Time until next earning:</p>
                            <p className="text-lg font-mono font-bold text-primary">{formatTime(timeLeft)}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="p-4 mt-auto">
                    {rentedInstance ? (
                        <Button onClick={handleCollect} disabled={!isTimerFinished} className="w-full bg-growth hover:bg-growth/90 text-white">
                            {isTimerFinished ? 'Collect Earnings' : 'Earning...'}
                        </Button>
                    ) : (
                        <Button onClick={handleRent} className={`w-full ${cardColors.button} text-white hover:opacity-90 shadow-md`}>
                            Rent Now
                        </Button>
                    )}
                </CardFooter>
            </Card>

            <AlertDialog open={showInsufficientFunds} onOpenChange={setShowInsufficientFunds}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Insufficient Funds</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your balance is too low to rent this generator. Please go to the Bank to make a deposit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push('/dashboard/bank')}>Go to Bank</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
