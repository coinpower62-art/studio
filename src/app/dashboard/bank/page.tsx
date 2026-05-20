'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Wallet, Clock,
  CheckCircle, Copy, Smartphone, Coins, X, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDepositRequest, createWithdrawalRequest } from "./actions";

const GHS_RATE = 10; // System rate: $1 = 10 GHS

function WithdrawalStatusStepper({ status }: { status: "pending" | "processing" | "complete" | "rejected" }) {
    const stages = [{ id: "pending", label: "Pending" }, { id: "processing", label: "Processing" }, { id: "complete", label: "Complete" }];
    if (status === 'rejected') return <div className="text-red-600 text-xs font-bold py-2">Rejected</div>;
    const currentIdx = stages.findIndex(s => s.id === status);
    return (
        <div className="flex items-center gap-2 mt-2 w-full">
            {stages.map((s, i) => (
                <div key={s.id} className="flex flex-1 items-center gap-1.5">
                    {i <= currentIdx ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border border-gray-300" />}
                    <span className={`text-[10px] ${i <= currentIdx ? "text-gray-900" : "text-gray-400"}`}>{s.label}</span>
                </div>
            ))}
        </div>
    );
}

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
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [depositRecords, setDepositRecords] = useState<any[]>([]);
  const [withdrawRecords, setWithdrawRecords] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async function() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const [pRes, dRes, wRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    
    setProfile(pRes.data);
    setDepositRecords(dRes.data || []);
    setWithdrawRecords(wRes.data || []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDepositSubmit = async () => {
    if (!amount || !depositTxId) return;
    setIsSubmitting(true);
    const res = await createDepositRequest({
        amount: parseFloat(amount),
        txId: depositTxId,
        method: method || 'MTN MOMO',
        country: profile.country || 'Ghana'
    });
    setIsSubmitting(false);
    if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    else { 
        setDepositSuccess(true); 
        setAmount("");
        setDepositTxId("");
        fetchData(); 
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!amount || !method || !details) {
        toast({ title: 'Missing fields', description: 'Please fill all fields.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    const res = await createWithdrawalRequest({
        amount: parseFloat(amount),
        method: method,
        details: { account: details }
    });
    setIsSubmitting(false);
    if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    else {
        setWithdrawSuccess(true);
        setAmount("");
        setDetails("");
        fetchData();
    }
  };

  if (loading || !profile) return <div className="p-10 text-center">Loading bank...</div>;

  const currentAmountVal = parseFloat(amount) || 0;
  const ghsEquiv = currentAmountVal * GHS_RATE;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
            <div className="flex items-baseline gap-2">
                <p className="text-4xl font-black">${profile.balance.toFixed(2)}</p>
                <p className="text-amber-100 text-lg font-bold opacity-80">/ GH₵{(profile.balance * GHS_RATE).toFixed(2)}</p>
            </div>
            <div className="flex gap-4 mt-6">
                <Button onClick={() => { setMode('deposit'); setWithdrawSuccess(false); setDepositSuccess(false); }} className="bg-white text-amber-600 hover:bg-amber-50 font-bold rounded-xl flex-1">Deposit</Button>
                <Button onClick={() => { setMode('withdraw'); setWithdrawSuccess(false); setDepositSuccess(false); }} className="bg-amber-700/30 border border-white/20 text-white hover:bg-amber-700/50 font-bold rounded-xl flex-1">Withdraw</Button>
            </div>
        </div>

        {mode === 'deposit' && !depositSuccess && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Deposit Funds</h2>
                    <Button variant="ghost" onClick={() => setMode(null)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Amount ($)</label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
                        {currentAmountVal > 0 && (
                            <p className="text-sm font-bold text-amber-600 mt-1">Pay exactly: GH₵{ghsEquiv.toFixed(2)}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Transaction ID</label>
                        <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Enter ID from payment receipt" className="h-12" />
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-amber-800 leading-tight">Send funds to the MTN MOMO number provided in Support. Deposits are verified manually within 1-24 hours.</p>
                    </div>
                    <Button onClick={handleDepositSubmit} disabled={isSubmitting} className="w-full h-12 bg-amber-500 text-white font-bold rounded-xl">{isSubmitting ? 'Submitting...' : 'Confirm Deposit'}</Button>
                </div>
            </div>
        )}

        {mode === 'withdraw' && !withdrawSuccess && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Withdraw Earnings</h2>
                    <Button variant="ghost" onClick={() => setMode(null)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Amount to Withdraw ($)</label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
                        {currentAmountVal > 0 && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500">Processing Fee (15%)</span>
                                    <span className="text-red-500">-${(currentAmountVal * 0.15).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Net Payout</span>
                                    <div className="text-right">
                                        <p className="text-green-600">${(currentAmountVal * 0.85).toFixed(2)}</p>
                                        <p className="text-green-700 text-xs">GH₵{(currentAmountVal * 0.85 * GHS_RATE).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Payout Method</label>
                        <Select onValueChange={setMethod} value={method}>
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MTN MOMO">MTN MOMO (Ghana)</SelectItem>
                                <SelectItem value="USDT">USDT (TRC20)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">{method === 'USDT' ? 'Wallet Address' : 'MOMO Phone Number'}</label>
                        <Input value={details} onChange={e => setDetails(e.target.value)} placeholder={method === 'USDT' ? "Enter TRC20 address" : "05xxxxxxx"} className="h-12" />
                    </div>
                    <Button onClick={handleWithdrawSubmit} disabled={isSubmitting} className="w-full h-12 bg-amber-500 text-white font-bold rounded-xl">{isSubmitting ? 'Submitting...' : 'Request Withdrawal'}</Button>
                </div>
            </div>
        )}

        {depositSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center animate-in zoom-in-95">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-800">Deposit Submitted!</h3>
                <p className="text-green-700 text-sm mt-1">Our team will verify your payment within 1-24 hours. Your balance will update automatically.</p>
                <Button onClick={() => { setDepositSuccess(false); setMode(null); }} className="mt-4 bg-green-600 text-white">Back to Bank</Button>
            </div>
        )}

        {withdrawSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center animate-in zoom-in-95">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-green-800">Withdrawal Requested!</h3>
                <p className="text-green-700 text-sm mt-1">Your request has been queued. Funds are typically processed within 1-24 hours (Mon-Sat).</p>
                <Button onClick={() => { setWithdrawSuccess(false); setMode(null); }} className="mt-4 bg-green-600 text-white">Back to Bank</Button>
            </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="font-bold mb-4">Transaction History</h3>
            <div className="space-y-3">
                {[...depositRecords, ...withdrawRecords].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(tx => (
                    <div key={tx.id} className="flex flex-col p-3 border border-gray-50 rounded-xl hover:bg-gray-50">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-sm">{'tx_id' in tx ? 'Deposit' : 'Withdrawal'}</p>
                                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold ${'tx_id' in tx ? 'text-green-600' : 'text-red-600'}`}>
                                    {'tx_id' in tx ? '+' : '-'}${tx.amount.toFixed(2)}
                                </p>
                                <p className="text-[10px] text-gray-400 font-medium">
                                    GH₵{(tx.amount * GHS_RATE).toFixed(2)}
                                </p>
                            </div>
                        </div>
                        {'status' in tx && <WithdrawalStatusStepper status={tx.status} />}
                    </div>
                ))}
                {depositRecords.length === 0 && withdrawRecords.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">No transactions found.</p>
                )}
            </div>
        </div>
    </div>
  );
}
