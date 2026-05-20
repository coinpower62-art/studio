'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Wallet, Clock,
  CheckCircle, Copy, Smartphone, Coins, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDepositRequest } from "./actions";

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
  const [depositMethod, setDepositMethod] = useState<string | null>(null);
  const [depositTxId, setDepositTxId] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);
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
        method: depositMethod || 'Unknown',
        country: profile.country || 'Unknown'
    });
    setIsSubmitting(false);
    if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    else { setDepositSuccess(true); fetchData(); }
  };

  if (loading || !profile) return <div className="p-10 text-center">Loading bank...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 text-white shadow-xl">
            <p className="text-amber-100 text-xs font-medium uppercase tracking-wider mb-1">Available Balance</p>
            <p className="text-4xl font-black">${profile.balance.toFixed(2)}</p>
            <div className="flex gap-4 mt-4">
                <Button onClick={() => setMode('deposit')} className="bg-white text-amber-600 hover:bg-amber-50 font-bold rounded-xl flex-1">Deposit</Button>
                <Button onClick={() => setMode('withdraw')} className="bg-amber-700/30 border border-white/20 text-white hover:bg-amber-700/50 font-bold rounded-xl flex-1">Withdraw</Button>
            </div>
        </div>

        {mode === 'deposit' && !depositSuccess && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Deposit Funds</h2>
                    <Button variant="ghost" onClick={() => setMode(null)}><X className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Amount ($)</label>
                        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Transaction ID</label>
                        <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Enter ID from payment receipt" className="h-12" />
                    </div>
                    <Button onClick={handleDepositSubmit} disabled={isSubmitting} className="w-full h-12 bg-amber-500 text-white font-bold rounded-xl">{isSubmitting ? 'Submitting...' : 'Confirm Deposit'}</Button>
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
                            <p className={`font-bold ${'tx_id' in tx ? 'text-green-600' : 'text-red-600'}`}>
                                {'tx_id' in tx ? '+' : '-'}${tx.amount.toFixed(2)}
                            </p>
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