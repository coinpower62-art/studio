'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine, ArrowUpFromLine, Wallet, Shield, Clock,
  CheckCircle, Copy, CreditCard, Smartphone, Info, ChevronLeft, Lock, KeyRound, X, XCircle
} from "lucide-react";
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { createDepositRequest, createWithdrawalRequest, setWithdrawalPin } from "./actions";

const GHS_RATE = 10;
const DEPOSIT_PHONE = "+233548304717";
const DEPOSIT_NAME = "Patience Opoku";
const COUNTDOWN_SECONDS = 5 * 60;

type Profile = {
  balance: number;
  country: string;
  has_withdrawal_pin: boolean;
  username: string;
  full_name: string;
};

function useCountdown(active: boolean) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  useEffect(() => {
    if (active) {
      setSeconds(COUNTDOWN_SECONDS);
      const id = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
      return () => clearInterval(id);
    }
  }, [active]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return { display: `${mins}:${secs}`, expired: seconds === 0 };
}

function PinBoxes({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);
  const handleChange = (i: number, v: string) => {
    const ch = v.replace(/\D/g, "").slice(-1);
    const d = [...digits]; d[i] = ch;
    onChange(d.join("").replace(/\s/g, ""));
    if (ch && i < 5) inputRefs.current[i + 1]?.focus();
  };
  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const d = [...digits]; d[i] = ""; onChange(d.join("").replace(/\s/g, ""));
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
        const d = [...digits]; d[i - 1] = ""; onChange(d.join("").replace(/\s/g, ""));
      }
    }
  };
  return (
    <div className="flex gap-2 justify-center">
      {digits.map((digit, i) => (
        <input key={i} ref={el => { inputRefs.current[i] = el; }} type="password" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)} data-testid={`${testId}-${i}`} className="w-10 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 bg-white" />
      ))}
    </div>
  );
}

function WithdrawalStatusStepper({ status }: { status: "pending" | "processing" | "complete" | "rejected" }) {
    const stages = [
        { id: "pending", label: "Pending" },
        { id: "processing", label: "Processing" },
        { id: "complete", label: "Complete" },
    ];

    if (status === 'rejected') {
        return (
            <div className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-1 mt-2">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">Rejected</span>
            </div>
        )
    }

    const currentStageIndex = stages.findIndex(s => s.id === status);

    return (
        <div className="flex items-center gap-2 mt-2 w-full">
            {stages.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isActive = index === currentStageIndex;
                
                return (
                    <div key={stage.id} className="flex-1 flex flex-col items-center gap-1">
                        {index > 0 && (
                             <div className={`w-full h-0.5 mb-2 ${index <= currentStageIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                        <div className="flex flex-col items-center">
                            {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : isActive ? (
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                                </div>
                            ) : (
                                <div className="w-4 h-4 flex items-center justify-center">
                                     <div className="w-2 h-2 rounded-full bg-gray-300" />
                                </div>
                            )}
                            <span className={`text-[10px] font-semibold ${
                                isCompleted ? "text-gray-400" : isActive ? "text-amber-600" : "text-gray-400"
                            }`}>
                                {stage.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function BankPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const [amount, setAmount] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pinMode, setPinMode] = useState<"security" | "setup" | "verify" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isSettingPin, setIsSettingPin] = useState(false);

  const { display: countdown } = useCountdown(mode === "deposit");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const [pRes, dRes, wRes, rRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('rented_generators').select('generator_id, expires_at').eq('user_id', user.id)
    ]);
    
    setProfile(pRes.data);
    const combined = [...(dRes.data || []), ...(wRes.data || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTransactions(combined);
    const now = Date.now();
    setCanWithdraw(rRes.data?.some(g => g.generator_id !== 'pg1' && new Date(g.expires_at).getTime() > now) ?? false);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDepositSubmit = async () => {
    if (!amount || !depositTxId) return;
    setIsSubmitting(true);
    const res = await createDepositRequest({ 
      amount: parseFloat(amount), 
      txId: depositTxId, 
      method: 'MTN MOMO', 
      country: profile?.country || 'Ghana' 
    });
    setIsSubmitting(false);
    if (!res.error) { setDepositSuccess(true); fetchData(); }
    else toast({ title: 'Error', description: res.error, variant: 'destructive' });
  };

  const handleWithdrawalSubmit = async () => {
    if (pinInput.length < 6) return;
    setIsSubmitting(true);
    const res = await createWithdrawalRequest({ amount: parseFloat(amount), method: 'momo', details: { phone: profile?.username } });
    setIsSubmitting(false);
    if (!res.error) { setWithdrawSuccess(true); fetchData(); setPinMode(null); }
    else { toast({ title: 'Error', description: res.error, variant: 'destructive' }); setPinError("Incorrect PIN"); }
  };

  const handleSetPin = async () => {
    if (pinInput !== pinConfirm) { setPinError("PINs do not match"); return; }
    setIsSettingPin(true);
    const res = await setWithdrawalPin();
    setIsSettingPin(false);
    if (!res.error) { 
        toast({ title: "PIN Set Successfully" });
        setProfile(p => p ? {...p, has_withdrawal_pin: true} : null);
        setPinMode(null);
    }
  };

  if (loading || !profile) return <div className="p-8"><Skeleton className="h-64 rounded-3xl" /></div>;

  const usdAmount = parseFloat(amount) || 0;
  const ghsAmount = usdAmount * GHS_RATE;

  return (
    <div className="bg-[#f7f9f4] min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 mb-6 text-white shadow-xl">
        <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1">Available Balance</p>
        <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-black text-white">${profile.balance.toFixed(2)}</h1>
            <p className="text-amber-100 font-bold opacity-80">≈ GH₵ {(profile.balance * GHS_RATE).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Button onClick={() => { setMode('deposit'); setAmount(""); setDepositSuccess(false); }} 
          className="h-16 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm flex flex-col gap-1 hover:bg-amber-50">
          <ArrowDownToLine className="text-green-500" />
          <span className="text-xs font-black">DEPOSIT</span>
        </Button>
        <Button onClick={() => { if(!canWithdraw) { toast({ title: "Rental Required", description: "Rent a PG2 generator or higher to withdraw.", variant: "destructive"}); return; } if(!profile.has_withdrawal_pin) setPinMode('security'); else { setMode('withdraw'); setAmount(""); setWithdrawSuccess(false); } }} 
          className="h-16 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm flex flex-col gap-1 hover:bg-blue-50">
          <ArrowUpFromLine className="text-blue-500" />
          <span className="text-xs font-black">WITHDRAW</span>
        </Button>
      </div>

      {mode === 'deposit' && !depositSuccess && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 mb-6">
           <div className="flex justify-between items-center">
              <h2 className="font-black text-gray-900">Deposit Funds</h2>
              <span className="text-red-500 font-bold text-xs font-mono">{countdown}</span>
           </div>
           <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2">Pay via MTN MOMO</p>
              <div className="space-y-1">
                 <p className="text-xs font-black text-gray-800 flex justify-between">Phone: <span>{DEPOSIT_PHONE}</span></p>
                 <p className="text-xs text-amber-800 flex justify-between">Name: <span>{DEPOSIT_NAME}</span></p>
              </div>
           </div>
           <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Amount (USD)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-black rounded-xl border-2 focus:border-amber-500" />
              {usdAmount > 0 && <p className="text-xs font-black text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full inline-block">SEND EXACTLY: GH₵ {ghsAmount.toLocaleString()}</p>}
           </div>
           <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Enter Transaction ID" className="h-12 rounded-xl" />
           <Button onClick={handleDepositSubmit} disabled={isSubmitting || !amount || !depositTxId} className="w-full bg-amber-500 h-12 font-black rounded-xl shadow-lg">SUBMIT DEPOSIT</Button>
        </div>
      )}

      {mode === 'withdraw' && !withdrawSuccess && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 mb-6">
           <h2 className="font-black text-gray-900">Withdraw Funds</h2>
           <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Amount (USD)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-black rounded-xl border-2 focus:border-blue-500" />
              {usdAmount > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                      <div className="flex justify-between text-[10px] font-black text-blue-400 uppercase">
                         <span>Network Fee (15%)</span>
                         <span>-${(usdAmount * 0.15).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                         <span className="text-xs font-black text-gray-600 uppercase">You Receive</span>
                         <div className="text-right">
                            <p className="text-xl font-black text-blue-600 leading-none">GH₵ {(usdAmount * 0.85 * GHS_RATE).toLocaleString()}</p>
                            <p className="text-[10px] text-blue-400 font-bold mt-1">(${(usdAmount * 0.85).toFixed(2)})</p>
                         </div>
                      </div>
                  </div>
              )}
           </div>
           <Button onClick={() => setPinMode('verify')} disabled={isSubmitting || !amount || usdAmount > profile.balance} className="w-full bg-blue-600 h-12 font-black rounded-xl shadow-lg">PROCEED TO PAYOUT</Button>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <h3 className="font-black text-gray-900 mb-5 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Recent History</h3>
        <div className="space-y-3">
            {transactions.map(tx => (
                <div key={tx.id} className="flex flex-col p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-black text-gray-800 uppercase tracking-wide">{'tx_id' in tx ? 'Deposit' : 'Withdrawal'}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-black text-lg leading-none ${'tx_id' in tx ? 'text-green-600' : 'text-red-500'}`}>
                                {('tx_id' in tx ? '+' : '-')}${tx.amount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                    { !('tx_id' in tx) && <WithdrawalStatusStepper status={tx.status} /> }
                </div>
            ))}
            {transactions.length === 0 && <p className="text-center text-gray-400 text-xs py-10 font-bold uppercase tracking-widest">No activity found</p>}
        </div>
      </div>

      {pinMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
           <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center space-y-6 shadow-2xl relative">
              <button onClick={() => setPinMode(null)} className="absolute top-6 right-6 text-gray-400"><X className="w-5 h-5" /></button>
              {pinMode === 'security' ? (
                  <div className="space-y-5">
                      <div className="w-20 h-20 bg-amber-100 rounded-3xl mx-auto flex items-center justify-center"><Shield className="w-10 h-10 text-amber-600" /></div>
                      <div>
                        <h2 className="font-black text-2xl">Secure Payouts</h2>
                        <p className="text-sm text-gray-500 mt-2">Set a 6-digit security PIN to protect your account withdrawals.</p>
                      </div>
                      <Button onClick={() => setPinMode('setup')} className="w-full bg-amber-500 h-12 font-black rounded-2xl shadow-lg">SETUP PIN NOW</Button>
                  </div>
              ) : (
                <>
                  <h2 className="font-black text-2xl">{pinMode === 'verify' ? 'Confirm PIN' : 'Create PIN'}</h2>
                  <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-input" />
                  {pinMode === 'setup' && (
                    <div className="space-y-2 pt-2">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Confirm PIN</p>
                        <PinBoxes value={pinConfirm} onChange={setPinConfirm} testId="pin-confirm" />
                    </div>
                  )}
                  {pinError && <p className="text-red-500 text-xs font-black">{pinError}</p>}
                  <Button onClick={pinMode === 'verify' ? handleWithdrawalSubmit : handleSetPin} disabled={(pinMode === 'verify' && pinInput.length < 6) || (pinMode === 'setup' && (pinInput.length < 6 || pinInput !== pinConfirm)) || isSettingPin || isSubmitting} className="w-full bg-amber-500 h-12 font-black shadow-lg rounded-2xl mt-4">
                      {isSubmitting || isSettingPin ? 'PROCESSING...' : 'CONTINUE'}
                  </Button>
                </>
              )}
           </div>
        </div>
      )}
    </div>
  );
}
