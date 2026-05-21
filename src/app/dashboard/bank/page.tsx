'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Wallet, Shield, Clock,
  CheckCircle, Copy, CreditCard, Smartphone, Coins, AlertCircle,
  PartyPopper, PhoneCall, Hash, Network, User, MapPin, CalendarDays,
  Hourglass, Info, Globe, ChevronLeft, Lock, KeyRound, ShieldCheck, X, LogOut, Gift, XCircle
} from "lucide-react";
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { countries as COUNTRIES_DATA } from "@/lib/data";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createDepositRequest, createWithdrawalRequest, setWithdrawalPin, redeemGiftCode } from "./actions";
import { logout } from "@/app/login/actions";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const GHS_RATE = 10;

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i]);
    if (shouldDouble) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}
function isCardExpired(expiry: string): boolean {
  const [mm, yy] = expiry.split("/");
  if (!mm || !yy) return true;
  const expDate = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1);
  const now = new Date();
  return expDate < new Date(now.getFullYear(), now.getMonth(), 1);
}

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

type WithdrawRecord = {
  id: string;
  amount: number;
  net_amount: number;
  method: string;
  status: "pending" | "processing" | "complete" | "rejected";
  created_at: string;
};

type DepositRecord = {
  id: string;
  amount: number;
  tx_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

function useCountdown(active: boolean) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (active) {
      setSeconds(COUNTDOWN_SECONDS);
      ref.current = setInterval(() => setSeconds(s => (s > 0 ? s - 1 : 0)), 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
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

export default function BankPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [depositMethod, setDepositMethod] = useState<string | null>(null);
  const [withdrawMethod, setWithdrawMethod] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositCard, setDepositCard] = useState({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
  const [pinMode, setPinMode] = useState<"security" | "setup" | "verify" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([]);
  const [canWithdraw, setCanWithdraw] = useState(false);

  const { display: countdown, expired } = useCountdown(mode === "deposit");

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
    setDepositRecords(dRes.data || []);
    setWithdrawRecords(wRes.data || []);
    const now = Date.now();
    setCanWithdraw(rRes.data?.some(g => g.generator_id !== 'pg1' && new Date(g.expires_at).getTime() > now) ?? false);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDepositSubmit = async () => {
    if (!depositMethod || !amount) return;
    setIsSubmitting(true);
    const res = await createDepositRequest({ 
      amount: parseFloat(amount), 
      txId: depositTxId, 
      method: depositMethod, 
      country: profile?.country || 'Ghana' 
    });
    setIsSubmitting(false);
    if (!res.error) { setDepositSuccess(true); fetchData(); }
    else toast({ title: 'Error', description: res.error, variant: 'destructive' });
  };

  const handleWithdrawal = () => {
    if (parseFloat(amount) > (profile?.balance || 0)) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    setPinMode("verify");
  };

  const handleWithdrawalSubmit = async () => {
    setIsSubmitting(true);
    const res = await createWithdrawalRequest({ amount: parseFloat(amount), method: withdrawMethod || '', details: {} });
    setIsSubmitting(false);
    if (!res.error) { setWithdrawSuccess(true); fetchData(); setPinMode(null); }
    else { toast({ title: 'Error', description: res.error, variant: 'destructive' }); setPinError("Incorrect PIN"); }
  };

  if (loading || !profile) return <BankPageSkeleton />;

  const usdAmount = parseFloat(amount) || 0;
  const ghsAmount = usdAmount * GHS_RATE;

  return (
    <div className="bg-[#f7f9f4] min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 mb-6 text-white shadow-xl">
        <p className="text-amber-100 text-xs font-bold uppercase tracking-wider mb-1">Available Assets</p>
        <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-black">${profile.balance.toFixed(2)}</h1>
            <p className="text-amber-100 font-bold">≈ GH₵ {(profile.balance * GHS_RATE).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Button onClick={() => setMode('deposit')} className="h-16 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm flex flex-col gap-1">
          <ArrowDownToLine className="text-green-500" />
          <span className="text-xs font-bold">DEPOSIT</span>
        </Button>
        <Button onClick={() => { if(!canWithdraw) return; if(!profile.has_withdrawal_pin) setPinMode('security'); else setMode('withdraw'); }} className="h-16 rounded-2xl bg-white border border-gray-200 text-gray-900 shadow-sm flex flex-col gap-1">
          <ArrowUpFromLine className="text-blue-500" />
          <span className="text-xs font-bold">WITHDRAW</span>
        </Button>
      </div>

      {mode === 'deposit' && !depositSuccess && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 mb-6">
           <h2 className="font-bold text-gray-900">Deposit Funds</h2>
           <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
              <p className="text-xs font-bold">Send MTN MoMo to: {DEPOSIT_PHONE}</p>
              <p className="text-xs text-amber-800">Account Name: {DEPOSIT_NAME}</p>
           </div>
           <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Amount to Deposit (USD)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
              {usdAmount > 0 && <p className="text-xs font-bold text-green-600 mt-1">Required: GH₵ {ghsAmount.toFixed(2)}</p>}
           </div>
           <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Transaction ID" className="h-12" />
           <Button onClick={handleDepositSubmit} disabled={isSubmitting} className="w-full bg-amber-500 h-12 font-black shadow-lg">SUBMIT DEPOSIT</Button>
        </div>
      )}

      {mode === 'withdraw' && !withdrawSuccess && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 mb-6">
           <h2 className="font-bold text-gray-900">Withdraw Funds</h2>
           <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Amount to Withdraw (USD)</label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
              {usdAmount > 0 && (
                  <div className="mt-2 space-y-1">
                      <p className="text-xs font-bold text-red-500">Processing Fee (15%): -${(usdAmount * 0.15).toFixed(2)}</p>
                      <p className="text-sm font-black text-blue-600">Net Receive: GH₵ {(usdAmount * 0.85 * GHS_RATE).toFixed(2)}</p>
                  </div>
              )}
           </div>
           <Button onClick={handleWithdrawal} disabled={isSubmitting} className="w-full bg-blue-600 h-12 font-black shadow-lg">REQUEST PAYOUT</Button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">Transaction History</h3>
        <div className="space-y-3">
            {allTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div>
                        <p className="text-xs font-bold text-gray-800">{'tx_id' in tx ? 'Deposit' : 'Withdrawal'}</p>
                        <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                        <p className={`font-black ${'tx_id' in tx ? 'text-green-600' : 'text-red-500'}`}>
                            {('tx_id' in tx ? '+' : '-')}${tx.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400">GH₵ {(tx.amount * GHS_RATE).toFixed(2)}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {pinMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
           <div className="bg-white rounded-3xl p-6 w-80 text-center space-y-4">
              <h2 className="font-bold text-lg">{pinMode === 'verify' ? 'Enter PIN' : 'Setup PIN'}</h2>
              <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-input" />
              {pinMode === 'setup' && <PinBoxes value={pinConfirm} onChange={setPinConfirm} testId="pin-confirm" />}
              {pinError && <p className="text-red-500 text-xs font-bold">{pinError}</p>}
              <Button onClick={pinMode === 'verify' ? handleWithdrawalSubmit : handleSetPin} className="w-full bg-amber-500">CONTINUE</Button>
           </div>
        </div>
      )}
    </div>
  );
}