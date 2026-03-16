'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/hooks/use-user-store';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

interface Generator {
    id: string;
    name: string;
    price: number;
    dailyIncome: number;
    duration: number;
    isFree: boolean;
    description: string;
}

interface GeneratorCardProps {
    generator: Generator;
    imageUrl: string;
    imageHint: string;
}

function formatTime(ms: number) {
  if (ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function GeneratorCard({ generator, imageUrl, imageHint }: GeneratorCardProps) {
    const { rentGenerator, rentedGenerators, collectEarnings } = useUserStore();
    const { toast } = useToast();
    const router = useRouter();
    const [showInsufficientFunds, setShowInsufficientFunds] = useState(false);

    const rentedInstance = rentedGenerators.find(rg => rg.generatorId === generator.id);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!rentedInstance) {
          setTimeLeft(null);
          return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const distance = rentedInstance.rentalEndTime - now;
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
        }
    };

    const handleCollect = () => {
        if (rentedInstance) {
            const result = collectEarnings(rentedInstance.id);
            if (result === 'collected') {
                toast({
                    title: 'Earnings Collected!',
                    description: `You've collected $${rentedInstance.dailyIncome.toFixed(2)}.`,
                });
            } else if (result === 'expired') {
                toast({
                    title: 'Generator Expired',
                    description: `${rentedInstance.name} has completed its rental duration.`,
                });
            }
        }
    };

    const isTimerFinished = timeLeft !== null && timeLeft <= 0;

    return (
        <>
            <Card className="shadow-md flex flex-col border-primary/20 hover:border-primary/60 transition-all">
                <CardHeader>
                    <CardTitle className="text-primary">{generator.name}</CardTitle>
                    <CardDescription>{generator.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="relative aspect-video w-full rounded-md overflow-hidden border">
                        {imageUrl ? (
                           <Image src={imageUrl} alt={generator.name} fill className="object-cover" data-ai-hint={imageHint} />
                        ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                                No Image
                            </div>
                        )}
                    </div>
                    <div className="text-sm space-y-1">
                        <p><strong>Price:</strong> <span className={generator.isFree ? "text-accent font-bold" : ""}>{generator.isFree ? 'Free' : `$${generator.price.toFixed(2)}`}</span></p>
                        <p><strong>Daily Income:</strong> <span className="font-bold text-growth">${generator.dailyIncome.toFixed(2)}</span></p>
                        <p><strong>Duration:</strong> {generator.duration} days</p>
                    </div>
                    {rentedInstance && timeLeft !== null && (
                        <div className="p-2 bg-muted rounded-md text-center">
                            <p className="text-xs text-muted-foreground">Time until next earning:</p>
                            <p className="text-lg font-mono font-bold text-primary">{formatTime(timeLeft)}</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    {rentedInstance ? (
                        <Button onClick={handleCollect} disabled={!isTimerFinished} className="w-full bg-accent hover:bg-accent/90">
                            {isTimerFinished ? 'Collect Earnings' : 'Earning...'}
                        </Button>
                    ) : (
                        <Button onClick={handleRent} className="w-full bg-primary hover:bg-primary/90">
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
                            Your balance is too low to rent this generator. Please go to the Bank to Deposit.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => router.push('#')}>Go to Bank</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
