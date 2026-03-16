'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, serverTimestamp, doc } from 'firebase/firestore';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useUser } from '@/firebase';
import { useUserStore } from '@/hooks/use-user-store';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const depositSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Please enter a valid amount.' }),
  txId: z.string().min(4, { message: 'Please enter a valid Transaction ID.' }),
});

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive({ message: 'Please enter a valid amount.' }),
  momoNumber: z.string().min(10, { message: 'Please enter a valid MoMo number.' }),
});

const WITHDRAWAL_FEE_PERCENTAGE = 0.15;

export default function BankPage() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { balance, username, fullName, country } = useUserStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('deposit');

  const depositForm = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 0, txId: '' },
  });

  const withdrawalForm = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: { amount: 0, momoNumber: '' },
  });

  const withdrawalAmount = withdrawalForm.watch('amount');
  const withdrawalFee = withdrawalAmount * WITHDRAWAL_FEE_PERCENTAGE;
  const netWithdrawal = withdrawalAmount - withdrawalFee;

  function handleDepositSubmit(values: z.infer<typeof depositSchema>) {
    if (!firestore || !user) return;

    const depositRequestsRef = collection(firestore, 'depositRequests');
    const newDeposit = {
      userId: user.uid,
      username,
      fullName,
      amount: values.amount,
      txId: values.txId,
      date: new Date().toLocaleDateString(),
      status: 'pending',
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(depositRequestsRef, newDeposit);

    toast({
      title: 'Deposit Request Submitted',
      description: 'Your deposit is being reviewed and will be credited upon approval.',
    });
    depositForm.reset();
  }

  function handleWithdrawalSubmit(values: z.infer<typeof withdrawalSchema>) {
    if (!firestore || !user) return;

    const totalWithdrawalCost = values.amount; // User enters gross amount
    if (totalWithdrawalCost > balance) {
      withdrawalForm.setError('amount', {
        type: 'manual',
        message: "You don't have enough funds for this withdrawal.",
      });
      return;
    }

    const withdrawalRequestsRef = collection(firestore, 'withdrawalRequests');
    const newWithdrawal = {
      userId: user.uid,
      username,
      fullName,
      country,
      method: 'MTN Mobile Money',
      amount: values.amount,
      netAmount: netWithdrawal,
      fee: withdrawalFee,
      details: values.momoNumber,
      status: 'pending',
      createdAt: serverTimestamp(),
    };
    
    const userRef = doc(firestore, 'users', user.uid);
    updateDocumentNonBlocking(userRef, { balance: balance - totalWithdrawalCost });
    addDocumentNonBlocking(withdrawalRequestsRef, newWithdrawal);

    toast({
      title: 'Withdrawal Request Submitted',
      description: 'Your request is being processed.',
    });
    withdrawalForm.reset();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Bank</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Make a Deposit</CardTitle>
              <CardDescription>
                Follow the steps below to add funds to your CoinPower account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-primary/10 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">Deposit Instructions</AlertTitle>
                <AlertDescription className="text-foreground/80">
                  Send your deposit via <strong className="font-semibold">MTN Mobile Money</strong> to:
                  <ul className="list-disc pl-5 mt-2">
                    <li>Name: <strong>James Cole</strong></li>
                    <li>Number: <strong>+233257758007</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-sm text-muted-foreground pt-4">
                After sending the money, fill out the form below with the exact amount and transaction ID from your MoMo receipt. Your account will be credited once the deposit is confirmed.
              </p>

              <Form {...depositForm}>
                <form onSubmit={depositForm.handleSubmit(handleDepositSubmit)} className="space-y-6">
                  <FormField
                    control={depositForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (GHS)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 500" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={depositForm.control}
                    name="txId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction ID</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter the Transaction ID from your receipt" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={depositForm.formState.isSubmitting}>
                    {depositForm.formState.isSubmitting ? 'Submitting...' : 'Submit Deposit Request'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Request a withdrawal to your MTN Mobile Money account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" className="bg-accent/10 border-accent/20">
                <Info className="h-4 w-4 text-accent" />
                <AlertTitle className="text-accent">Withdrawal Information</AlertTitle>
                <AlertDescription className="text-foreground/80">
                  A withdrawal fee of <strong className="font-semibold">{WITHDRAWAL_FEE_PERCENTAGE * 100}%</strong> will be applied to all transactions.
                </AlertDescription>
              </Alert>
              
              <Form {...withdrawalForm}>
                <form onSubmit={withdrawalForm.handleSubmit(handleWithdrawalSubmit)} className="space-y-6">
                  <FormField
                    control={withdrawalForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount to Withdraw (GHS)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={withdrawalForm.control}
                    name="momoNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your MTN MoMo Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 0241234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Card className="bg-muted/50">
                    <CardContent className="p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Withdrawal Fee:</span>
                        <span className="font-medium">${withdrawalFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base">
                        <span>You Will Receive:</span>
                        <span className="text-growth">${netWithdrawal.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Button type="submit" className="w-full" disabled={withdrawalForm.formState.isSubmitting}>
                    {withdrawalForm.formState.isSubmitting ? 'Processing...' : 'Submit Withdrawal Request'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
