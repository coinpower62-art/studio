'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, Wallet, CheckCircle, X, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, CreditCard, Smartphone, Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDepositRequest, createWithdrawalRequest } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const GHS_RATE = 10; // Fixed system rate: 1 USD = 10 GHS

export default function BankPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [details, setDetails] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [success, setSuccess] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async function() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const [pRes, dRes, wRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    
    setProfile(pRes.data);
    setRecords([...(dRes.data || []), ...(wRes.data || [])].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid amount.", variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    let res;
    if (mode === 'deposit') {
        res = await createDepositRequest({ 
            amount: parseFloat(amount), 
            txId: depositTxId, 
            method: method || 'MOMO', 
            country: profile.country 
        });
    } else {
        if (!method || !details) {
            toast({ title: "Missing Info", description: "Please select a method and provide account details.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        res = await createWithdrawalRequest({ 
            amount: parseFloat(amount), 
            method, 
            details: { account: details } 
        });
    }
    
    setIsSubmitting(false);
    
    if (res.error) {
        toast({ title: 'Transaction Failed', description: res.error, variant: 'destructive' });
    } else {
        setSuccess(true);
        fetchData();
        setAmount("");
        setDepositTxId("");
        setDetails("");
    }
  };

  if (loading || !profile) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-48 rounded-3xl w-full" />
        <Skeleton className="h-64 rounded-3xl w-full" />
    </div>
  );

  const numAmount = parseFloat(amount) || 0;
  const ghsAmount = numAmount * GHS_RATE;
  const withdrawalFee = numAmount * 0.15;
  const netWithdrawalUsd = numAmount - withdrawalFee;
  const netWithdrawalGhs = netWithdrawalUsd * GHS_RATE;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Landmark className="w-32 h-32" />
            </div>
            <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mb-1">Available Assets</p>
            <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black">${profile.balance.toFixed(2)}</p>
                <p className="text-amber-100/80 text-sm font-semibold">≈ GH₵ {(profile.balance * GHS_RATE).toLocaleString()}</p>
            </div>
            
            <div className="flex gap-3 mt-8">
                <Button 
                    onClick={() => { setMode('deposit'); setSuccess(false); }} 
                    className={cn(
                        "flex-1 h-12 rounded-xl font-black text-sm transition-all",
                        mode === 'deposit' ? "bg-white text-amber-600" : "bg-amber-700/30 border border-white/20 text-white hover:bg-amber-700/50"
                    )}
                >
                    <ArrowDownToLine className="w-4 h-4 mr-2" /> DEPOSIT
                </Button>
                <Button 
                    onClick={() => { setMode('withdraw'); setSuccess(false); }} 
                    className={cn(
                        "flex-1 h-12 rounded-xl font-black text-sm transition-all",
                        mode === 'withdraw' ? "bg-white text-amber-600" : "bg-amber-700/30 border border-white/20 text-white hover:bg-amber-700/50"
                    )}
                >
                    <ArrowUpFromLine className="w-4 h-4 mr-2" /> WITHDRAW
                </Button>
            </div>
        </div>

        {/* Transaction Forms */}
        {mode && !success && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", mode === 'deposit' ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600")}>
                            {mode === 'deposit' ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                        </div>
                        <h2 className="text-lg font-black text-gray-900">{mode === 'deposit' ? 'Add Funds (USD)' : 'Cash Out (USD)'}</h2>
                    </div>
                    <button onClick={() => setMode(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Amount to {mode === 'deposit' ? 'Add' : 'Withdraw'} ($)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                            <Input 
                                type="number" 
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                placeholder="0.00" 
                                className="h-14 pl-8 text-xl font-black rounded-2xl border-2 border-gray-100 focus:border-amber-400 transition-all bg-gray-50/50" 
                            />
                        </div>
                        {amount && parseFloat(amount) > 0 && (
                            <div className="mt-2 px-1 flex justify-between items-center">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                    {mode === 'deposit' ? 'You pay:' : 'You receive:'}
                                </p>
                                <p className="text-sm font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                                    GH₵ {(mode === 'deposit' ? ghsAmount : netWithdrawalGhs).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>

                    {mode === 'deposit' && (
                        <>
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-2">
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">MOMO Payout Instructions</p>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">MOMO Name:</span>
                                    <span className="font-bold text-gray-900">Patience Opoku</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-500">MOMO Number:</span>
                                    <span className="font-mono font-bold text-gray-900">0548304717</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Transaction ID / Ref</label>
                                <Input 
                                    value={depositTxId} 
                                    onChange={e => setDepositTxId(e.target.value)} 
                                    placeholder="Enter the Ref from your receipt" 
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100" 
                                />
                            </div>
                        </>
                    )}

                    {mode === 'withdraw' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Method</label>
                                    <Select onValueChange={setMethod} value={method}>
                                        <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-gray-100">
                                            <SelectValue placeholder="Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MOMO">Mobile Money</SelectItem>
                                            <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Fee (15%)</label>
                                    <div className="h-12 flex items-center px-4 bg-gray-100 rounded-xl text-gray-500 font-bold text-sm">
                                        -${withdrawalFee.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1.5 block">Payout Details (Phone or Address)</label>
                                <Input 
                                    value={details} 
                                    onChange={e => setDetails(e.target.value)} 
                                    placeholder={method === 'MOMO' ? "MOMO Phone Number" : "Wallet Address"} 
                                    className="h-12 rounded-xl bg-gray-50/50 border-gray-100" 
                                />
                            </div>
                        </>
                    )}

                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !amount} 
                        className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-200/50 transition-all active:scale-95"
                    >
                        {isSubmitting ? 'PROCESSING...' : `CONFIRM ${mode.toUpperCase()}`}
                    </Button>
                </div>
            </div>
        )}

        {/* Success State */}
        {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-black text-green-900">Request Sent!</h3>
                <p className="text-green-700 text-sm mt-2 max-w-xs mx-auto">Your transaction is being verified by our finance team. This usually takes 1 to 24 hours.</p>
                <Button onClick={() => { setSuccess(false); setMode(null); }} className="mt-6 bg-green-600 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-green-200 hover:bg-green-700">Done</Button>
            </div>
        )}

        {/* Transaction History */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-500" /> Recent Activity
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-gray-200 px-2 uppercase">{records.length} Records</Badge>
            </div>
            
            <div className="space-y-3">
                {records.map(tx => {
                    const isDeposit = !!tx.tx_id;
                    const date = new Date(tx.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
                    
                    return (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-transparent hover:border-amber-100 transition-all group">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-colors", isDeposit ? "bg-green-100 text-green-600 group-hover:bg-green-200" : "bg-red-100 text-red-600 group-hover:bg-red-200")}>
                                    {isDeposit ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="font-black text-sm text-gray-900 uppercase tracking-tight">{isDeposit ? 'Deposit' : 'Withdrawal'}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={cn("font-black text-sm", isDeposit ? 'text-green-600' : 'text-red-600')}>
                                    {isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}
                                </p>
                                <Badge className={cn(
                                    "text-[9px] uppercase font-black px-1.5 py-0 border-0",
                                    (tx.status === 'approved' || tx.status === 'complete') ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                                )}>
                                    {tx.status}
                                </Badge>
                            </div>
                        </div>
                    );
                })}
                {records.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                             <Smartphone className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">No Transactions Found</p>
                        <p className="text-gray-300 text-xs mt-1">Activity will appear here as you earn</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
