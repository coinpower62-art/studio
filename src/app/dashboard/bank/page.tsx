'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, Wallet, CheckCircle, Info, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDepositRequest, createWithdrawalRequest } from "./actions";
import { Skeleton } from "@/components/ui/skeleton";

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
    if (!amount) return;
    setIsSubmitting(true);
    let res;
    if (mode === 'deposit') {
        res = await createDepositRequest({ amount: parseFloat(amount), txId: depositTxId, method: method || 'MOMO', country: profile.country });
    } else {
        res = await createWithdrawalRequest({ amount: parseFloat(amount), method, details: { account: details } });
    }
    setIsSubmitting(false);
    if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    else { setSuccess(true); fetchData(); }
  };

  if (loading || !profile) return <div className="p-10"><Skeleton className="h-64 rounded-3xl" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl">
            <p className="text-amber-100 text-xs font-bold uppercase tracking-widest mb-1">Total Assets (USD)</p>
            <p className="text-4xl font-black">${profile.balance.toFixed(2)}</p>
            <div className="flex gap-4 mt-8">
                <Button onClick={() => { setMode('deposit'); setSuccess(false); }} className="bg-white text-amber-600 hover:bg-amber-50 font-black rounded-xl flex-1 h-12 shadow-lg">DEPOSIT</Button>
                <Button onClick={() => { setMode('withdraw'); setSuccess(false); }} className="bg-amber-700/30 border border-white/20 text-white hover:bg-amber-700/50 font-black rounded-xl flex-1 h-12">WITHDRAW</Button>
            </div>
        </div>

        {mode && !success && (
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-gray-900">{mode === 'deposit' ? 'Add Funds' : 'Cash Out'}</h2>
                    <button onClick={() => setMode(null)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Amount ($)</label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-14 text-xl font-black rounded-2xl border-2 border-gray-100 focus:border-amber-400 transition-all" />
                    </div>
                    {mode === 'deposit' && (
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Transaction ID</label>
                            <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Ref Number from receipt" className="h-12 rounded-xl" />
                        </div>
                    )}
                    {mode === 'withdraw' && (
                        <>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Payout Method</label>
                                <Select onValueChange={setMethod} value={method}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="Select Method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MOMO">Mobile Money</SelectItem>
                                        <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Account Details</label>
                                <Input value={details} onChange={e => setDetails(e.target.value)} placeholder="Phone or Address" className="h-12 rounded-xl" />
                            </div>
                        </>
                    )}
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-200/50">
                        {isSubmitting ? 'PROCESSING...' : `CONFIRM ${mode.toUpperCase()}`}
                    </Button>
                </div>
            </div>
        )}

        {success && (
            <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-8 text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-black text-green-900">Request Received!</h3>
                <p className="text-green-700 text-sm mt-2">Your transaction is being processed by the system. Verification usually takes 1 to 24 hours.</p>
                <Button onClick={() => { setSuccess(false); setMode(null); setAmount(""); }} className="mt-6 bg-green-600 text-white font-bold h-11 px-8 rounded-xl">Got it!</Button>
            </div>
        )}

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-amber-500" /> History
            </h3>
            <div className="space-y-3">
                {records.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-amber-100 transition-colors">
                        <div>
                            <p className="font-black text-sm text-gray-900">{tx.tx_id ? 'DEPOSIT' : 'WITHDRAWAL'}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(tx.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                        </div>
                        <div className="text-right">
                            <p className={cn("font-black text-sm", tx.tx_id ? 'text-green-600' : 'text-red-600')}>
                                {tx.tx_id ? '+' : '-'}${tx.amount.toFixed(2)}
                            </p>
                            <Badge variant="outline" className={cn("text-[9px] uppercase tracking-tighter border-0 font-black", tx.status === 'approved' || tx.status === 'complete' ? 'text-green-500 bg-green-100' : 'text-amber-500 bg-amber-100')}>
                                {tx.status}
                            </Badge>
                        </div>
                    </div>
                ))}
                {records.length === 0 && (
                    <div className="py-12 text-center">
                        <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No Activity Yet</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}
