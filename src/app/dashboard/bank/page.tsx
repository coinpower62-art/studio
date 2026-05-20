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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const DEPOSIT_PHONE = "+233548304717";
const DEPOSIT_NAME = "Patience Opoku";
const COUNTDOWN_SECONDS = 5 * 60;
const GHS_RATE = 10;

type Profile = {
  balance: number;
  country: string;
  has_withdrawal_pin: boolean;
  username: string;
  full_name: string;
};

type Generator = {
  id: string;
  price: number;
  name: string;
};

type WithdrawRecord = {
  id: string;
  amount: number;
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

type Mode = "deposit" | "withdraw" | null;

function useCountdown(active: boolean) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(function() {
    if (active) {
      setSeconds(COUNTDOWN_SECONDS);
      ref.current = setInterval(function() { return setSeconds(function(s) { return (s > 0 ? s - 1 : 0); }); }, 1000);
    } else {
      if (ref.current) clearInterval(ref.current);
    }
    return function() { if (ref.current) clearInterval(ref.current); };
  }, [active]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return { display: `${mins}:${secs}`, expired: seconds === 0 };
}

function PinBoxes({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId: string }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleChange = function(i: number, v: string) {
    const ch = v.replace(/\D/g, "").slice(-1);
    const d = [...digits]; d[i] = ch;
    onChange(d.join("").replace(/\s/g, ""));
    if (ch && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = function(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
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
        <input key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="password" inputMode="numeric" maxLength={1}
          value={digit} onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 bg-white shadow-sm focus:outline-none ${digit ? "border-amber-400 text-amber-600" : "border-gray-200 text-gray-400"}`}
        />
      ))}
    </div>
  );
}

export default function BankPage() {
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState<Mode>(null);
  const [amount, setAmount] = useState("");
  const [depositTxId, setDepositTxId] = useState("");
  const [depositMethod, setDepositMethod] = useState<string | null>(null);
  const [depositCountry, setDepositCountry] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastTxId, setLastTxId] = useState("");
  const [historyTab, setHistoryTab] = useState<"all" | "deposit" | "withdraw">("all");

  const [usdt, setUsdt] = useState({ address: "", network: "TRC20" });
  const [momo, setMomo] = useState({ phone: "", name: "" });
  const [bank, setBank] = useState({ name: "", number: "", holder: "" });
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "" });
  const [pinMode, setPinMode] = useState<"security" | "setup" | "verify" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");

  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([]);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [generators, setGenerators] = useState<Generator[]>([]);

  const { display: countdown, expired } = useCountdown(mode === "deposit");

  const fetchData = useCallback(async function() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);

    const [pRes, dRes, wRes, rRes, gRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('rented_generators').select('generator_id, expires_at').eq('user_id', user.id),
        supabase.from('generators').select('id, name, price').order('price', { ascending: true })
    ]);
    
    setProfile(pRes.data);
    if (pRes.data) setDepositCountry(pRes.data.country || '');
    setDepositRecords(dRes.data || []);
    setWithdrawRecords(wRes.data || []);
    setGenerators(gRes.data || []);

    const now = Date.now();
    const hasPaid = rRes.data?.some(g => g.generator_id !== 'pg1' && new Date(g.expires_at).getTime() > now);
    setCanWithdraw(!!hasPaid);
    
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copy = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));

  const openMode = (m: Mode) => {
    setMode(m); setAmount(""); setDepositMethod(null); setDepositSuccess(false); setWithdrawSuccess(false); setWithdrawMethod(null);
  };

  const handleDepositSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast({ title: "Enter valid amount" });
    setIsSubmitting(true);
    const res = await createDepositRequest({
      amount: parseFloat(amount),
      method: depositMethod!,
      country: depositCountry,
      txId: depositTxId
    });
    setIsSubmitting(false);
    if (res.success) { setDepositSuccess(true); fetchData(); }
  };

  const handleWithdrawalSubmit = async () => {
    setIsSubmitting(true);
    const res = await createWithdrawalRequest({
      amount: parseFloat(amount),
      method: withdrawMethod!,
      details: withdrawMethod === 'momo' ? momo : usdt
    });
    setIsSubmitting(false);
    if (res.success) { setWithdrawSuccess(true); setLastTxId(res.txId!); setPinMode(null); fetchData(); }
  };

  if (loading || !profile) return <div className="p-8"><Skeleton className="h-64 w-full rounded-2xl" /></div>;

  return (
    <div className="bg-[#f7f9f4] min-h-screen pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">CoinPower Bank</h1>
            <p className="text-gray-500 text-sm">Secure transactions & currency conversion</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 mb-6 shadow-xl text-white">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-amber-100" />
            <p className="text-amber-100 text-xs font-medium">Available Balance</p>
          </div>
          <p className="text-3xl font-black">${profile.balance.toFixed(2)} / GH₵{(profile.balance * GHS_RATE).toFixed(2)}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <Button data-testid="button-deposit" onClick={() => openMode('deposit')} className="h-16 bg-white border border-gray-200 text-gray-800 rounded-2xl flex flex-col gap-1 hover:bg-amber-50">
                <ArrowDownToLine className="w-5 h-5 text-green-500" />
                <span className="text-xs font-bold">Deposit</span>
            </Button>
            <Button data-testid="button-withdraw" onClick={() => canWithdraw ? (profile.has_withdrawal_pin ? openMode('withdraw') : setPinMode('security')) : toast({ title: "Upgrade to withdraw" })} className="h-16 bg-white border border-gray-200 text-gray-800 rounded-2xl flex flex-col gap-1 hover:bg-amber-50">
                <ArrowUpFromLine className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-bold">Withdraw</span>
            </Button>
        </div>

        {mode === 'deposit' && !depositSuccess && (
            <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Deposit Funds</h3>
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Amount ($)</label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
                    {amount && <p className="text-xs font-bold text-amber-600 mt-1">Converted: GH₵{(parseFloat(amount) * GHS_RATE).toFixed(2)}</p>}
                </div>
                <Select value={depositMethod || ""} onValueChange={setDepositMethod}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Select Method" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="momo">MTN MOMO</SelectItem>
                        <SelectItem value="usdt">USDT</SelectItem>
                    </SelectContent>
                </Select>
                {depositMethod === 'momo' && (
                    <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 space-y-2">
                        <p className="text-[10px] font-bold text-yellow-800 uppercase">Send GH₵{(parseFloat(amount || "0") * GHS_RATE).toFixed(2)} to:</p>
                        <p className="font-black text-gray-900">{DEPOSIT_NAME}</p>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg">
                            <p className="font-mono font-bold">{DEPOSIT_PHONE}</p>
                            <Button size="sm" onClick={() => copy(DEPOSIT_PHONE, "Phone")} variant="ghost"><Copy className="w-4 h-4" /></Button>
                        </div>
                    </div>
                )}
                <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Transaction ID" className="h-12" />
                <Button onClick={handleDepositSubmit} className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl">Confirm Deposit</Button>
            </div>
        )}

        {mode === 'withdraw' && !withdrawSuccess && (
            <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm space-y-4">
                <h3 className="font-bold text-gray-900">Withdraw Funds</h3>
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block">Amount to Withdraw ($)</label>
                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-12 text-lg font-bold" />
                    {amount && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between"><span>Fee (15%)</span><span className="text-red-500">-${(parseFloat(amount) * 0.15).toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold pt-1 border-t">
                                <span>Net Payout</span>
                                <span className="text-green-600">${(parseFloat(amount) * 0.85).toFixed(2)} / GH₵{(parseFloat(amount) * 0.85 * GHS_RATE).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>
                <Select value={withdrawMethod || ""} onValueChange={setWithdrawMethod}>
                    <SelectTrigger className="h-12"><SelectValue placeholder="Payout Method" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="momo">MTN MOMO</SelectItem>
                        <SelectItem value="usdt">USDT</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={() => setPinMode('verify')} className="w-full h-12 bg-amber-500 text-white font-bold rounded-xl">Continue to PIN</Button>
            </div>
        )}

        {pinMode === 'verify' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-white p-6 rounded-3xl w-full max-w-sm text-center space-y-4">
                    <Lock className="w-12 h-12 text-amber-500 mx-auto" />
                    <h2 className="text-xl font-bold">Enter PIN</h2>
                    <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-verify" />
                    <Button onClick={handleWithdrawalSubmit} disabled={pinInput.length < 6} className="w-full bg-amber-500 text-white font-bold rounded-xl h-12">Authorize Payout</Button>
                </div>
            </div>
        )}

        <div className="bg-white rounded-2xl p-6 mt-6 border border-gray-100 shadow-sm">
            <h3 className="font-bold mb-4">Transaction History</h3>
            <div className="space-y-4">
                {[...depositRecords, ...withdrawRecords].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(tx => (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                            <p className="text-sm font-bold">{'tx_id' in tx ? 'Deposit' : 'Withdrawal'}</p>
                            <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-black ${'tx_id' in tx ? 'text-green-600' : 'text-gray-900'}`}>{ 'tx_id' in tx ? '+' : '-' }${tx.amount.toFixed(2)}</p>
                            <p className="text-[10px] text-gray-400">GH₵{(tx.amount * GHS_RATE).toFixed(2)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
