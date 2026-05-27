'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Wallet, Shield, Clock,
  CheckCircle, Copy, CreditCard, Smartphone, Coins, AlertCircle,
  Hash, Network, User, MapPin, ChevronLeft, Lock, KeyRound, X, XCircle, Eye, EyeOff
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
import { cn } from "@/lib/utils";

// Card validation helpers
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
  const expYear = parseInt(yy) + 2000;
  const expMonth = parseInt(mm);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (expYear < currentYear) return true;
  if (expYear === currentYear && expMonth < currentMonth) return true;
  return false;
}

const DEPOSIT_PHONE = "+233548304717";
const DEPOSIT_NAME = "Patience Opoku";
const COUNTDOWN_SECONDS = 5 * 60;
const GHS_RATE = 10; // $1 = 10 GHS

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
  user_id: string;
  country: string;
  method: string;
  amount: number;
  net_amount: number;
  fee: number;
  details: string;
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
    } else if (e.key === "ArrowLeft" && i > 0) {
      inputRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map(function(digit, i) {
        return (
        <input key={i}
          ref={function(el) { inputRefs.current[i] = el; }}
          type="password" inputMode="numeric" maxLength={1}
          value={digit} onChange={function(e) { return handleChange(i, e.target.value); }}
          onKeyDown={function(e) { return handleKeyDown(i, e); }}
          onFocus={function(e) { return e.target.select(); }}
          data-testid={`${testId}-${i}`}
          className={`w-11 h-12 text-center text-xl font-bold rounded-xl border-2 bg-white shadow-sm transition-colors focus:outline-none ${digit ? "border-amber-400 text-amber-600" : "border-gray-200 text-gray-400"} focus:border-amber-500 focus:ring-2 focus:ring-amber-200`}
        />
      )})}
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
                    <Suspense key={stage.id}>
                        {index > 0 && (
                             <div className={`flex-1 h-0.5 rounded-full ${index <= currentStageIndex ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                        <div className="flex flex-col items-center gap-1">
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
                    </Suspense>
                );
            })}
        </div>
    );
}

function BankPageSkeleton() {
    return <div className="p-4 pt-8 max-w-4xl mx-auto"><Skeleton className="h-64 rounded-2xl" /></div>;
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

  const [usdt, setUsdt] = useState({ address: "", network: "TRC20" });
  const [momo, setMomo] = useState({ phone: "", name: "" });
  const [westernUnion, setWesternUnion] = useState({ fullName: "", city: "" });
  const [bank, setBank] = useState({ name: "", number: "", holder: "" });
  const [otherBankName, setOtherBankName] = useState("");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
  const [depositCard, setDepositCard] = useState({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
  const [lowBalanceGen, setLowBalanceGen] = useState<{ name: string; price: number } | null>(null);

  const [pinMode, setPinMode] = useState<"security" | "setup" | "verify" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);

  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [generators, setGenerators] = useState<Generator[]>([]);

  const { display: countdown, expired } = useCountdown(mode === "deposit");

  const fetchData = useCallback(async function() {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push('/login');
      return;
    }
    setUser(user);

    const [profileResult, depositsResult, withdrawalsResult, mediaResult, rentedResult, generatorsResult] = await Promise.all([
        supabase.from('profiles').select('balance, country, has_withdrawal_pin, username, full_name').eq('id', user.id).maybeSingle(),
        supabase.from('deposit_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('withdrawal_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('media').select('*'),
        supabase.from('rented_generators').select('generator_id, expires_at').eq('user_id', user.id),
        supabase.from('generators').select('id, name, price').order('price', { ascending: true })
    ]);
    
    setProfile(profileResult.data as Profile | null);
    if (profileResult.data) setDepositCountry(profileResult.data.country || '');
    setDepositRecords(depositsResult.data || []);
    setWithdrawRecords(withdrawalsResult.data || []);
    setMedia(mediaResult.data || []);

    const now = Date.now();
    const hasActivePaidGenerator = rentedResult.data?.some((g: any) => g.generator_id !== 'pg1' && new Date(g.expires_at).getTime() > now) ?? false;
    setCanWithdraw(hasActivePaidGenerator);

    setGenerators(generatorsResult.data || []);
    setLoading(false);
  }, [router, supabase, toast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);

  const copy = function(text: string, label: string) {
    return navigator.clipboard.writeText(text).then(function() { return toast({ title: `${label} copied!`, description: text }); });
  }

  const openMode = function(m: Mode) {
    if (mode === m) { setMode(null); return; }
    setMode(m); setAmount("");
    setDepositMethod(null);
    if (profile) setDepositCountry(profile.country || "");
    setDepositSuccess(false); setWithdrawSuccess(false);
    setWithdrawMethod(null); setLastTxId("");
    setUsdt({ address: "", network: "TRC20" });
    setMomo({ phone: "", name: "" });
    setBank({ name: "", number: "", holder: "" });
    setOtherBankName("");
    setWesternUnion({ fullName: "", city: ""});
    setCard({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
    setDepositCard({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
  };

  const handleDepositSubmit = async function() {
    if (!user) return;
    if (!depositMethod) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    if (!depositCountry) { toast({ title: "Select your country", variant: "destructive" }); return; }
    if (!amount || parseFloat(amount) <= 0) { toast({ title: "Enter an amount", variant: "destructive" }); return; }
    
    setIsSubmitting(true);
    const methodLabel = depositMethods.find(function(m) { return m.id === depositMethod; })?.label || depositMethod;
    
    let submissionData: any = { amount: parseFloat(amount), method: methodLabel, country: depositCountry };

    if (depositMethod === "card") {
      const rawNum = depositCard.number.replace(/\s/g, "");
      if (rawNum.length < 13 || !luhnCheck(rawNum)) { toast({ title: "Invalid card number", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.holder.trim()) { toast({ title: "Enter the cardholder name", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.expiry || depositCard.expiry.length < 5) { toast({ title: "Enter a valid expiry date (MM/YY)", variant: "destructive" }); setIsSubmitting(false); return; }
      if (isCardExpired(depositCard.expiry)) { toast({ title: "Card has expired", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.cvv || depositCard.cvv.length < 3) { toast({ title: "Enter the CVV code", variant: "destructive" }); setIsSubmitting(false); return; }
      
      submissionData.cardDetails = `CARD-****${rawNum.slice(-4)} ${depositCard.holder.trim()} ${depositCard.expiry}`;
      submissionData.txId = `CARD-${rawNum.slice(-4)}-${depositCard.holder.trim().toUpperCase().replace(/\s+/g, "-")}`;
    } else {
      if (!depositTxId.trim()) { toast({ title: "Enter your transaction ID", variant: "destructive" }); setIsSubmitting(false); return; }
      submissionData.txId = depositTxId.trim();
    }
    
    const result = await createDepositRequest(submissionData);
    setIsSubmitting(false);

    if (result.error) {
      toast({ title: 'Deposit Failed', description: result.error, variant: 'destructive' });
    } else {
      setDepositSuccess(true);
      setDepositTxId("");
      fetchData();
    }
  };
  
  const handleSetPin = async function() {
      if (pinInput.length < 6 || pinConfirm.length < 6) { setPinError("Enter all 6 digits"); return; }
      if (pinInput !== pinConfirm) { setPinError("PINs do not match. Try again."); setPinConfirm(""); return; }
      setPinError(""); setIsSettingPin(true);
      const result = await setWithdrawalPin();
      setIsSettingPin(false);
      if (result.error) {
         toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        setPinMode(null);
        setMode("withdraw");
        toast({ title: "Withdrawal PIN set!" });
        setProfile(function(p) { return p ? {...p, has_withdrawal_pin: true} : null; });
      }
  }

  const handleWithdrawal = () => {
    if (!user || !profile) return;
    if (!amount || parseFloat(amount) <= 0) { toast({ title: "Enter an amount", variant: "destructive" }); return; }
    if (!withdrawMethod) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    const amt = parseFloat(amount);
    if (amt < 1) { toast({ title: "Minimum withdrawal is $1.00", variant: "destructive" }); return; }
    if (amt > profile.balance) { toast({ title: "Insufficient balance", variant: "destructive" }); return; }
    
    // Validation for withdrawal details
    if (withdrawMethod === "card") {
      const rawNum = card.number.replace(/\s/g, "");
      if (rawNum.length < 13 || !luhnCheck(rawNum)) { toast({ title: "Invalid card number", variant: "destructive" }); return; }
      if (!card.holder.trim()) { toast({ title: "Enter the cardholder name", variant: "destructive" }); return; }
      if (!card.expiry || card.expiry.length < 5) { toast({ title: "Enter a valid expiry date (MM/YY)", variant: "destructive" }); return; }
      if (isCardExpired(card.expiry)) { toast({ title: "Card has expired", variant: "destructive" }); return; }
      if (!card.cvv || card.cvv.length < 3) { toast({ title: "Enter the CVV code", variant: "destructive" }); return; }
    } else if (withdrawMethod === "bank") {
      if (!bank.name.trim()) { toast({ title: "Please select your bank", variant: "destructive" }); return; }
      if (bank.name === 'Other' && !otherBankName.trim()) { toast({ title: "Please specify your bank name", variant: "destructive" }); return; }
      if (!bank.number.trim()) { toast({ title: "Enter the account number", variant: "destructive" }); return; }
      if (!bank.holder.trim()) { toast({ title: "Enter the account holder name", variant: "destructive" }); return; }
    } else if (withdrawMethod === "usdt") {
        if (!usdt.address.trim()) { toast({ title: "Enter a USDT address", variant: "destructive" }); return; }
    } else if (withdrawMethod === "momo") {
        if (!momo.phone.trim()) { toast({ title: "Enter a phone number", variant: "destructive" }); return; }
        if (!momo.name.trim()) { toast({ title: "Enter an account name", variant: "destructive" }); return; }
    } else if (withdrawMethod === "western_union") {
        if (!westernUnion.fullName.trim()) { toast({ title: "Enter your full name for Western Union", variant: "destructive" }); return; }
        if (!westernUnion.city.trim()) { toast({ title: "Enter your city for pickup", variant: "destructive" }); return; }
    }
    
    setPinInput(""); setPinError(""); setPinMode("verify");
  };

  const handleWithdrawalSubmit = async function() {
    if (!user || !profile) return;
    if (pinInput.length < 6) { toast({ title: "PIN Required", variant: "destructive" }); return; }
    
    setIsSubmitting(true);
    let details: any;
    switch(withdrawMethod) {
        case 'usdt': details = usdt; break;
        case 'momo': details = momo; break;
        case 'bank': details = { ...bank, name: bank.name === 'Other' ? otherBankName : bank.name }; break;
        case 'western_union': details = { ...westernUnion, country: profile.country }; break;
        case 'card': details = card; break;
        default: details = {};
    }

    const result = await createWithdrawalRequest({
      amount: parseFloat(amount),
      method: withdrawMethods.find(function(m) { return m.id === withdrawMethod; })?.label || withdrawMethod || "",
      details: details,
    });
    setIsSubmitting(false);

    if (result.error) {
       toast({ title: 'Withdrawal failed', description: result.error, variant: 'destructive' });
       setPinMode(null);
    } else {
      setWithdrawSuccess(true);
      setLastTxId(result.txId || '');
      setPinMode(null);
      fetchData();
    }
  };

  if (loading || !profile) return <BankPageSkeleton />;

  const isGhana = profile.country === 'Ghana';

  const imageMap = {
    usdt: media.find(m => m.id === 'payment-usdt')?.url || PlaceHolderImages.find(i => i.id === 'payment-usdt')?.imageUrl,
    momo: media.find(m => m.id === 'payment-mtn-momo')?.url || PlaceHolderImages.find(i => i.id === 'payment-mtn-momo')?.imageUrl,
    bank: media.find(m => m.id === 'payment-bank-transfer')?.url || PlaceHolderImages.find(i => i.id === 'payment-bank-transfer')?.imageUrl,
    western_union: media.find(m => m.id === 'payment-western-union')?.url || PlaceHolderImages.find(i => i.id === 'payment-western-union')?.imageUrl,
    card: media.find(m => m.id === 'payment-card')?.url || PlaceHolderImages.find(i => i.id === 'payment-card')?.imageUrl,
  };

  const depositMethods = [
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo },
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt },
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card },
  ];

  const withdrawMethods = [
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt },
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo },
    { id: "bank", label: "Bank Transfer", icon: Landmark, img: imageMap.bank },
    { id: "western_union", label: "Western Union", icon: Network, img: imageMap.western_union },
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card },
  ];

  const allTransactions = [...(depositRecords || []), ...(withdrawRecords || [])]
    .sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });

  const africanBanks = ["Absa Bank", "GCB Bank", "Ecobank", "Zenith Bank", "UBA", "Access Bank"];
  const bankOptions = [...africanBanks, "Other"].sort();

  return (
    <div className="bg-[#f7f9f4] pb-24">
      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <div className="bg-card p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-foreground text-xl font-black mb-1">Insufficient Balance</DialogTitle>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLowBalanceGen(null)} className="flex-1 rounded-xl h-11">Cancel</Button>
              <Button onClick={() => { setLowBalanceGen(null); setMode('deposit'); }} className="flex-1 rounded-xl h-11 bg-amber-500 text-white">Deposit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {pinMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={function() { setPinMode(null); setPinInput(""); setPinConfirm(""); setPinError(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
            {pinMode === "security" && (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg"><Shield className="w-8 h-8 text-white" /></div>
                <div><h2 className="text-xl font-bold text-gray-900">Secure Your Withdrawals</h2><p className="text-gray-500 text-sm mt-2">CoinPower uses a 6-digit PIN to protect your funds.</p></div>
                <Button onClick={function() { setPinMode("setup"); }} className="w-full bg-amber-500 text-white font-bold rounded-xl h-12">Set Up My PIN</Button>
              </div>
            )}
            {pinMode === 'setup' && (
               <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg"><KeyRound className="w-7 h-7 text-white" /></div>
                <h2 className="text-xl font-bold text-gray-900">Create Withdrawal PIN</h2>
                <div className="w-full space-y-4">
                  <p className="text-xs font-semibold text-gray-700 text-left">Enter PIN</p>
                  <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-input" />
                  <p className="text-xs font-semibold text-gray-700 text-left">Confirm PIN</p>
                  <PinBoxes value={pinConfirm} onChange={setPinConfirm} testId="pin-confirm" />
                  {pinError && <p className="text-red-500 text-xs font-medium">{pinError}</p>}
                </div>
                <Button disabled={pinInput.length < 6 || pinConfirm.length < 6 || isSettingPin} onClick={handleSetPin} className="w-full bg-amber-500 text-white font-bold rounded-xl h-12">
                  {isSettingPin ? "Saving..." : "Create PIN"}
                </Button>
              </div>
            )}
            {pinMode === "verify" && (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg"><Lock className="w-7 h-7 text-white" /></div>
                <h2 className="text-xl font-bold text-gray-900">Enter Withdrawal PIN</h2>
                <div className="w-full"><PinBoxes value={pinInput} onChange={setPinInput} testId="pin-verify" />{pinError && <p className="text-red-500 text-xs font-medium mt-2">{pinError}</p>}</div>
                <Button disabled={pinInput.length < 6 || isSubmitting} onClick={handleWithdrawalSubmit} className="w-full bg-amber-500 text-white font-bold rounded-xl h-12">
                  {isSubmitting ? "Processing..." : "Authorize & Withdraw"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4">
        <div className="py-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md"><Landmark className="w-4 h-4 text-white" /></div>
            <h1 className="text-2xl font-bold text-gray-900">CoinPower Bank</h1>
          </div>
          <p className="text-gray-500 text-sm">Manage your deposits and withdrawals</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-3xl p-6 mb-6 shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-amber-100" /><p className="text-amber-100 text-xs font-medium">Available Balance</p></div>
            <div className="flex flex-col"><p className="text-4xl font-bold mt-1">${profile.balance.toFixed(2)}</p>{isGhana && <p className="text-xl font-semibold text-amber-100/90 mt-1">≈ GH₵{(profile.balance * GHS_RATE).toFixed(2)}</p>}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div onClick={function() { return openMode('deposit'); }} className={cn("bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-300 transition-all", mode === 'deposit' && "ring-2 ring-amber-500")}>
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center p-2"><ArrowDownToLine className="w-full h-full text-green-600" /></div>
              <div className="flex-1"><p className="font-bold text-gray-800">Deposit Funds</p><p className="text-[10px] text-gray-500">Fund your account</p></div>
            </div>
            <div onClick={() => {
                if (!canWithdraw) { toast({ title: "Action Restricted", description: "You must have an active paid generator (PG2+) to withdraw.", variant: "destructive" }); return; }
                if (!profile.has_withdrawal_pin) setPinMode("security"); else openMode("withdraw");
              }}
              className={cn("bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-4 transition-all", !canWithdraw ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-amber-300", mode === 'withdraw' && "ring-2 ring-amber-500")}>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 p-2"><ArrowUpFromLine className="w-full h-full text-amber-600" /></div>
              <div className="flex-1"><p className="font-bold text-gray-800">Withdraw Funds</p><p className="text-[10px] text-gray-500">Cash out earnings</p></div>
            </div>
        </div>

        {mode === "deposit" && !depositSuccess && (
          <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-6 mb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
            {!depositMethod ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {depositMethods.map(function({ id, label, img }) { return (
                  <button key={id} onClick={function() { return setDepositMethod(id); }} className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-gray-100 hover:border-amber-500 transition-all">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white p-2 shadow-sm"><img src={img} alt={label} className="w-full h-full object-contain" /></div>
                    <p className="font-bold text-gray-900 text-xs">{label}</p>
                  </button>
                ); })}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><button onClick={function() { return setDepositMethod(null); }} className="p-2 rounded-xl hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-500" /></button><h3 className="font-bold text-gray-900">Deposit via {depositMethod.toUpperCase()}</h3></div>
                  <div className="px-3 py-1 rounded-full bg-red-50 border border-red-100 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-red-600" /><span className="text-red-600 font-bold text-xs tabular-nums">{countdown}</span></div>
                </div>

                {depositMethod === 'momo' && (
                  <div className="bg-amber-50 rounded-2xl p-4 space-y-3 border border-amber-100">
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-50"><div><p className="text-[10px] text-gray-400">Recipient Name</p><p className="font-bold text-sm">{DEPOSIT_NAME}</p></div><button onClick={() => copy(DEPOSIT_NAME, "Name")} className="p-2 rounded-lg bg-amber-50 text-amber-600"><Copy className="w-4 h-4" /></button></div>
                    <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-amber-50"><div><p className="text-[10px] text-gray-400">Mobile Number</p><p className="font-bold text-sm font-mono">{DEPOSIT_PHONE}</p></div><button onClick={() => copy(DEPOSIT_PHONE, "Phone")} className="p-2 rounded-lg bg-amber-50 text-amber-600"><Copy className="w-4 h-4" /></button></div>
                  </div>
                )}

                {depositMethod === 'card' ? (
                  <div className="space-y-4">
                    <Input value={depositCard.number} onChange={(e) => setDepositCard({ ...depositCard, number: e.target.value })} placeholder="Card Number" className="h-12 rounded-xl" />
                    <Input value={depositCard.holder} onChange={(e) => setDepositCard({ ...depositCard, holder: e.target.value })} placeholder="Cardholder Name" className="h-12 rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                      <Input value={depositCard.expiry} onChange={(e) => setDepositCard({ ...depositCard, expiry: e.target.value })} placeholder="MM/YY" className="h-12 rounded-xl" />
                      <Input value={depositCard.cvv} type="password" onChange={(e) => setDepositCard({ ...depositCard, cvv: e.target.value })} placeholder="CVV" className="h-12 rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="pl-8 h-12 rounded-xl text-lg font-bold" /></div>
                    <Input value={depositTxId} onChange={(e) => setDepositTxId(e.target.value)} placeholder="Transaction ID / Receipt Reference" className="h-12 rounded-xl font-mono text-sm" />
                  </div>
                )}
                <Button onClick={handleDepositSubmit} disabled={isSubmitting} className="w-full h-12 bg-amber-500 text-white font-bold rounded-xl shadow-lg">Submit Deposit</Button>
              </div>
            )}
          </div>
        )}

        {mode === "withdraw" && !withdrawSuccess && (
          <div className="bg-white rounded-3xl shadow-sm border border-amber-100 p-6 mb-6 space-y-6 animate-in slide-in-from-top-2 duration-300">
            <h3 className="font-bold text-gray-900">Select Withdrawal Method</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {withdrawMethods.map(function({ id, label, img }) { return (
                <button key={id} onClick={function() { return setWithdrawMethod(id); }} className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", withdrawMethod === id ? "border-amber-500 bg-amber-50" : "border-gray-100")}>
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white p-2 shadow-sm"><img src={img} alt={label} className="w-full h-full object-contain" /></div>
                  <p className="font-bold text-gray-900 text-xs">{label}</p>
                </button>
              ); })}
            </div>

            {withdrawMethod && (
              <div className="space-y-5 pt-4 border-t border-gray-100">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Enter Payout Details</p>
                  
                  {withdrawMethod === 'momo' && (
                    <div className="space-y-3">
                      <div className="relative"><Smartphone className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={momo.phone} onChange={(e) => setMomo({ ...momo, phone: e.target.value })} placeholder="Mobile Number" className="pl-10 h-12 rounded-xl" /></div>
                      <div className="relative"><User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={momo.name} onChange={(e) => setMomo({ ...momo, name: e.target.value })} placeholder="Account Holder Name" className="pl-10 h-12 rounded-xl" /></div>
                    </div>
                  )}

                  {withdrawMethod === 'bank' && (
                    <div className="space-y-3">
                      <Select value={bank.name} onValueChange={(val) => setBank({ ...bank, name: val })}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select Your Bank" /></SelectTrigger>
                        <SelectContent>{bankOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                      {bank.name === 'Other' && <Input value={otherBankName} onChange={(e) => setOtherBankName(e.target.value)} placeholder="Specify Bank Name" className="h-12 rounded-xl" />}
                      <div className="relative"><Hash className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={bank.number} onChange={(e) => setBank({ ...bank, number: e.target.value })} placeholder="Account Number / IBAN" className="pl-10 h-12 rounded-xl" /></div>
                      <div className="relative"><User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="Account Holder Name" className="pl-10 h-12 rounded-xl" /></div>
                    </div>
                  )}

                  {withdrawMethod === 'usdt' && (
                    <div className="space-y-3">
                      <div className="relative"><Coins className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={usdt.address} onChange={(e) => setUsdt({ ...usdt, address: e.target.value })} placeholder="USDT TRC20 Wallet Address" className="pl-10 h-12 rounded-xl font-mono text-sm" /></div>
                      <p className="text-[10px] text-amber-600 font-bold text-center px-4 bg-amber-50 py-2 rounded-lg">Ensure your wallet supports the TRC20 network to avoid loss of funds.</p>
                    </div>
                  )}

                  {withdrawMethod === 'western_union' && (
                    <div className="space-y-3">
                      <div className="relative"><User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={westernUnion.fullName} onChange={(e) => setWesternUnion({ ...westernUnion, fullName: e.target.value })} placeholder="Your Full Legal Name" className="pl-10 h-12 rounded-xl" /></div>
                      <div className="relative"><MapPin className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={westernUnion.city} onChange={(e) => setWesternUnion({ ...westernUnion, city: e.target.value })} placeholder="City for Pickup" className="pl-10 h-12 rounded-xl" /></div>
                    </div>
                  )}

                  {withdrawMethod === 'card' && (
                    <div className="space-y-3">
                      <div className="relative"><CreditCard className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="Card Number" className="pl-10 h-12 rounded-xl" /></div>
                      <Input value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} placeholder="Name on Card" className="h-12 rounded-xl" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} placeholder="MM/YY" className="h-12 rounded-xl" />
                        <Input value={card.cvv} type="password" onChange={(e) => setCard({ ...card, cvv: e.target.value })} placeholder="CVV" className="h-12 rounded-xl" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount to cash out" className="pl-8 h-14 rounded-2xl text-xl font-black focus:ring-amber-500" /></div>
                  {parseFloat(amount) > 0 && (
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between text-sm text-gray-500"><span>Processing Fee (15%)</span><span className="text-red-500 font-bold">-${(parseFloat(amount) * 0.15).toFixed(2)}</span></div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-gray-200"><div><p className="font-bold text-gray-800 text-base">You will receive</p>{isGhana && <p className="text-[10px] text-gray-400">Converted at GH₵{GHS_RATE}/$</p>}</div><div className="text-right"><p className="font-black text-green-600 text-xl">${(parseFloat(amount) * 0.85).toFixed(2)}</p>{isGhana && <p className="font-bold text-green-700 text-sm">GH₵{(parseFloat(amount) * 0.85 * GHS_RATE).toFixed(2)}</p>}</div></div>
                    </div>
                  )}
                  <Button onClick={handleWithdrawal} disabled={isSubmitting || !withdrawMethod} className="w-full h-14 bg-amber-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-transform">Withdraw ${amount || '0.00'}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {depositSuccess && (
          <div className="bg-white rounded-3xl p-8 border border-green-200 text-center space-y-4 mb-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600"><CheckCircle className="w-10 h-10" /></div>
            <h3 className="text-xl font-bold text-gray-900">Request Submitted!</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Our team is reviewing your deposit. Funds will be credited to your balance within 1 to 24 hours.</p>
            <Button onClick={() => setDepositSuccess(false)} className="w-full bg-gray-900 text-white font-bold h-12 rounded-xl mt-2">Okay</Button>
          </div>
        )}

        {withdrawSuccess && (
          <div className="bg-white rounded-3xl p-8 border border-amber-200 text-center space-y-4 mb-6 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600"><Hourglass className="w-10 h-10 animate-pulse" /></div>
            <h3 className="text-xl font-bold text-gray-900">Withdrawal Processing</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Your withdrawal request <strong>{lastTxId}</strong> has been received. Funds will arrive in your account within 1 to 24 hours.</p>
            <Button onClick={() => setWithdrawSuccess(false)} className="w-full bg-gray-900 text-white font-bold h-12 rounded-xl mt-2">Continue</Button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-gray-900">Recent Transactions</h3><Clock className="w-4 h-4 text-gray-300" /></div>
          <div className="space-y-3">
            {allTransactions.length > 0 ? (
              allTransactions.map(function(tx) {
                  const isDeposit = 'tx_id' in tx;
                  const statusColor = tx.status === 'approved' || tx.status === 'complete' ? 'bg-green-100 text-green-700' : tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <div key={tx.id} className="flex flex-col p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", statusColor.replace('text-', 'bg-').replace('700', '100'))}><Icon className="w-5 h-5" /></div>
                          <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800">{isDeposit ? 'Deposit' : 'Withdrawal'}</p><p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">{new Date(tx.created_at).toLocaleDateString()} · {tx.status}</p></div>
                          <div className="text-right"><p className={cn("text-sm font-black", isDeposit ? 'text-green-600' : 'text-gray-800')}>{isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}</p>{isGhana && <p className="text-[10px] font-bold text-gray-400">GH₵{(tx.amount * GHS_RATE).toFixed(2)}</p>}</div>
                      </div>
                      {!isDeposit && <WithdrawalStatusStepper status={(tx as WithdrawRecord).status} />}
                    </div>
                  );
                })
            ) : (<div className="text-center py-10 space-y-2"><Landmark className="w-10 h-10 text-gray-100 mx-auto" /><p className="text-gray-400 text-sm font-medium">No transaction history yet.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function Hourglass(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}
