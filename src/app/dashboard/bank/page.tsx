
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
  const expDate = new Date(2000 + parseInt(yy), parseInt(mm) - 1, 1);
  const now = new Date();
  return expDate < new Date(now.getFullYear(), now.getMonth(), 1);
}

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

type RentedGeneratorRecord = {
    generator_id: string;
    expires_at: string;
}

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
  const [historyTab, setHistoryTab] = useState<"all" | "deposit" | "withdraw">("all");

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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [userHasPg1Only, setUserHasPg1Only] = useState(false);
  const [generators, setGenerators] = useState<Generator[]>([]);

  const { display: countdown, expired } = useCountdown(mode === "deposit");

  const [giftCode, setGiftCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

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
    
    const { data: profileData, error: profileError } = profileResult;
    setProfile(profileData as Profile | null);
    if (profileData) {
      setDepositCountry(profileData.country || '');
    }

    const { data: depositsData } = depositsResult;
    setDepositRecords(depositsData as DepositRecord[] || []);

    const { data: withdrawalsData } = withdrawalsResult;
    setWithdrawRecords(withdrawalsData as WithdrawRecord[] || []);
    
    if (mediaResult.data) {
        setMedia(mediaResult.data);
        const logo = mediaResult.data.find(m => m.id === 'app-logo');
        if (logo?.url) setLogoUrl(logo.url);
    }

    const { data: rentedData } = rentedResult as { data: RentedGeneratorRecord[] | null, error: any };
    const now = Date.now();
    const hasActivePaidGenerator = rentedData?.some((g) => g.generator_id !== 'pg1' && new Date(g.expires_at).getTime() > now) ?? false;
    setCanWithdraw(hasActivePaidGenerator);

    const hasAnyActiveGenerator = rentedData?.some(g => new Date(g.expires_at).getTime() > now) ?? false;
    setUserHasPg1Only(hasAnyActiveGenerator && !hasActivePaidGenerator);

    if (generatorsResult.data) {
        setGenerators(generatorsResult.data as Generator[]);
    }
    
    setLoading(false);
  }, [router, supabase, toast]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);

  const copy = function(text: string, label: string) {
    return navigator.clipboard.writeText(text).then(function() { return toast({ title: `${label} copied!`, description: text }); });
  }

  const openMode = function(m: Mode) {
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
    
    let submissionData: any = {
      amount: parseFloat(amount),
      method: methodLabel,
      country: depositCountry
    };

    if (depositMethod === "card") {
      const rawNum = depositCard.number.replace(/\s/g, "");
      if (rawNum.length < 13 || !luhnCheck(rawNum)) { toast({ title: "Invalid card number", description: "Please check and enter a valid Visa or Mastercard number.", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.holder.trim()) { toast({ title: "Enter the cardholder name", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.expiry || depositCard.expiry.length < 5) { toast({ title: "Enter a valid expiry date (MM/YY)", variant: "destructive" }); setIsSubmitting(false); return; }
      if (isCardExpired(depositCard.expiry)) { toast({ title: "Card has expired", description: "This card's expiry date has passed. Please use a valid card.", variant: "destructive" }); setIsSubmitting(false); return; }
      if (!depositCard.cvv || depositCard.cvv.length < 3) { toast({ title: "Enter the CVV code", variant: "destructive" }); setIsSubmitting(false); return; }
      
      const cardRef = `CARD-****${rawNum.slice(-4)} ${depositCard.holder.trim()} ${depositCard.expiry}`;
      submissionData.cardDetails = cardRef;
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
      if (!user) return;

      setPinError("");
      setIsSettingPin(true);

      const result = await setWithdrawalPin();
      setIsSettingPin(false);
      
      if (result.error) {
         toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        setPinMode(null);
        setPinInput(""); setPinConfirm(""); setPinError("");
        setMode("withdraw");
        toast({ title: "Withdrawal PIN set!", description: "Your PIN has been saved securely. You can now withdraw." });
        setProfile(function(p) { return p ? {...p, has_withdrawal_pin: true} : null; });
      }
  }

  const handleWithdrawal = () => {
    if (!user || !profile) return;
    if (!amount || parseFloat(amount) <= 0) { toast({ title: "Enter an amount", variant: "destructive" }); return; }
    if (!withdrawMethod) { toast({ title: "Select a payment method", variant: "destructive" }); return; }
    const amt = parseFloat(amount);
    
    if (amt < 1) {
      toast({ title: "Minimum withdrawal is $1.00", variant: "destructive" });
      return;
    }

    if (amt > profile.balance) {
      toast({ title: "Insufficient balance", description: `Your balance is $${profile.balance.toFixed(2)}`, variant: "destructive" });
      return;
    }
    
    if (withdrawMethod === "card") {
      const rawNum = card.number.replace(/\s/g, "");
      if (rawNum.length < 13 || !luhnCheck(rawNum)) { toast({ title: "Invalid card number", description: "Please check and enter a valid Visa or Mastercard number.", variant: "destructive" }); return; }
      if (!card.holder.trim()) { toast({ title: "Enter the cardholder name", variant: "destructive" }); return; }
      if (!card.expiry || card.expiry.length < 5) { toast({ title: "Enter a valid expiry date (MM/YY)", variant: "destructive" }); return; }
      if (isCardExpired(card.expiry)) { toast({ title: "Card has expired", description: "This card's expiry date has passed. Please use a valid card.", variant: "destructive" }); return; }
      if (!card.cvv || card.cvv.length < 3) { toast({ title: "Enter the CVV code", variant: "destructive" }); return; }
    }
    if (withdrawMethod === "bank") {
      if (!bank.name.trim()) { toast({ title: "Please select your bank", variant: "destructive" }); return; }
      if (bank.name === 'Other' && !otherBankName.trim()) { toast({ title: "Please specify your bank name", variant: "destructive" }); return; }
      if (!bank.number.trim()) { toast({ title: "Enter the account number", variant: "destructive" }); return; }
      if (!bank.holder.trim()) { toast({ title: "Enter the account holder name", variant: "destructive" }); return; }
    }
    if (withdrawMethod === "western_union") {
        if (!westernUnion.fullName.trim()) { toast({ title: "Enter your full name for Western Union", variant: "destructive" }); return; }
        if (!westernUnion.city.trim()) { toast({ title: "Enter your city for pickup", variant: "destructive" }); return; }
    }
    
    setPinInput("");
    setPinError("");
    setPinMode("verify");
  };

  const handleWithdrawalSubmit = async function() {
    if (!user || !profile) return;
    if (pinInput.length < 6) {
        toast({ title: "PIN Required", description: `Please enter your 6-digit PIN to authorize this withdrawal.`, variant: "destructive" });
        return;
    }
    
    setIsSubmitting(true);
    const amt = parseFloat(amount);
    
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
      amount: amt,
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
      fetchData();
      setPinMode(null);
    }
  };

  if (loading || !profile) return <BankPageSkeleton />;

  const imageMap = {
    usdt: media.find(m => m.id === 'payment-usdt')?.url || PlaceHolderImages.find(i => i.id === 'payment-usdt')?.imageUrl,
    momo: media.find(m => m.id === 'payment-mtn-momo')?.url || PlaceHolderImages.find(i => i.id === 'payment-mtn-momo')?.imageUrl,
    bank: media.find(m => m.id === 'payment-bank-transfer')?.url || PlaceHolderImages.find(i => i.id === 'payment-bank-transfer')?.imageUrl,
    western_union: media.find(m => m.id === 'payment-western-union')?.url || PlaceHolderImages.find(i => i.id === 'payment-western-union')?.imageUrl,
    card: media.find(m => m.id === 'payment-card')?.url || PlaceHolderImages.find(i => i.id === 'payment-card')?.imageUrl,
  };

  const depositMethods = [
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo, desc: "Mobile Money", color: "from-yellow-400 to-amber-500" },
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt, desc: "Tether (TRC20/ERC20)", color: "from-teal-400 to-green-500" },
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card, desc: "Visa / Mastercard", color: "from-blue-400 to-indigo-500" },
  ];

  const withdrawMethods = [
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt, desc: "Tether (TRC20/ERC20)", color: "from-teal-400 to-green-500" },
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo, desc: "Mobile Money", color: "from-yellow-400 to-amber-500" },
    { id: "bank", label: "Bank Transfer", icon: Landmark, img: imageMap.bank, desc: "Local & International", color: "from-gray-400 to-gray-500" },
    { id: "western_union", label: "Western Union", icon: Network, img: imageMap.western_union, desc: "Global Money Transfer", color: "from-blue-400 to-indigo-500"},
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card, desc: "Visa / Mastercard", color: "from-purple-400 to-pink-500" },
  ];

  const allTransactions = [...(depositRecords || []), ...(withdrawRecords || [])]
    .sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
  const depositButtonLogo = logoUrl || imageMap.momo;

  const quickAmounts = generators.filter(g => g.price > 0).map(g => g.price);

  let bankOptions: string[] = ["Absa Bank", "GCB Bank", "Ecobank", "Zenith Bank", "UBA", "Access Bank", "Bank of America", "JPMorgan Chase", "Wells Fargo", "Citibank", "Intesa Sanpaolo", "UniCredit", "HSBC", "Barclays"];
  bankOptions.sort();
  bankOptions.push("Other");

  return (
    <div className="bg-[#f7f9f4] min-h-screen">
       <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null); }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <div className="bg-card p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-foreground text-xl font-black mb-1">Insufficient Balance</DialogTitle>
            <DialogDescription className="text-destructive text-sm">You don't have enough funds to rent this generator.</DialogDescription>
          </div>
          <div className="p-5 space-y-4">
            <Button onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">Deposit Now</Button>
          </div>
        </DialogContent>
      </Dialog>
      {pinMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 relative">
            <button onClick={function() { setPinMode(null); setPinInput(""); setPinConfirm(""); setPinError(""); }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors" data-testid="button-close-pin">
              <X className="w-5 h-5" />
            </button>
            
            {pinMode === "security" && (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Secure Your Withdrawals</h2>
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">CoinPower uses a <span className="font-semibold text-amber-600">6-digit Withdrawal PIN</span> to protect your funds.</p>
                </div>
                <Button onClick={function() { setPinMode("setup"); }} className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-xl h-12 text-base">Set Up My Withdrawal PIN</Button>
              </div>
            )}
            
            {pinMode === 'setup' && (
               <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <KeyRound className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Create Withdrawal PIN</h2>
                <div className="w-full space-y-4">
                  <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-input" />
                  <PinBoxes value={pinConfirm} onChange={setPinConfirm} testId="pin-confirm" />
                  {pinError && <p className="text-red-500 text-xs font-medium">{pinError}</p>}
                </div>
                <Button disabled={pinInput.length < 6 || pinConfirm.length < 6 || isSettingPin} onClick={handleSetPin} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl h-12">Create PIN & Continue</Button>
              </div>
            )}

            {pinMode === "verify" && (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Enter Withdrawal PIN</h2>
                <div className="w-full">
                  <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-verify" />
                  {pinError && <p className="text-red-500 text-xs font-medium mt-2">{pinError}</p>}
                </div>
                <Button disabled={pinInput.length < 6 || isSubmitting} onClick={handleWithdrawalSubmit} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl h-12">Authorize & Withdraw</Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-20">
        <div className="py-4 sm:py-5 mb-2">
          <div className="flex items-center gap-3 mb-1">
            <Landmark className="w-6 h-6 text-amber-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CoinPower Bank</h1>
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 mb-4 shadow-xl text-white">
          <p className="text-amber-100 text-xs font-medium uppercase tracking-widest mb-1">Available Balance</p>
          <div className="flex items-baseline gap-2">
            <h1 className="text-4xl font-bold">${profile.balance.toFixed(2)}</h1>
            <p className="text-amber-100 font-bold opacity-80">≈ GH₵ {(profile.balance * GHS_RATE).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
            <div onClick={() => openMode('deposit')} className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center gap-2 cursor-pointer hover:bg-amber-50 transition-all">
                <ArrowDownToLine className="w-6 h-6 text-green-500" />
                <span className="font-bold text-gray-800 text-sm">DEPOSIT</span>
            </div>
            <div onClick={() => {
                if (!canWithdraw) {
                    toast({ title: "Access Restricted", description: "Rent a PG2 generator or higher to withdraw.", variant: "destructive" });
                    return;
                }
                if (!profile.has_withdrawal_pin) setPinMode("security");
                else openMode("withdraw");
            }} className={`bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col items-center gap-2 transition-all ${!canWithdraw ? 'opacity-50' : 'cursor-pointer hover:bg-amber-50'}`}>
                <ArrowUpFromLine className="w-6 h-6 text-blue-500" />
                <span className="font-bold text-gray-800 text-sm">WITHDRAW</span>
            </div>
        </div>

        {mode === "deposit" && !depositSuccess && (
          <div className="bg-white rounded-2xl border border-green-100 p-6 my-4 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Deposit Funds</h3>
                <span className="text-red-500 font-bold text-xs font-mono">{countdown}</span>
            </div>
            {!depositMethod ? (
                <div className="grid grid-cols-2 gap-3">
                    {depositMethods.map(m => (
                        <button key={m.id} onClick={() => setDepositMethod(m.id)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400 transition-all">
                            <m.icon className="w-6 h-6 text-amber-500" />
                            <span className="font-bold text-xs">{m.label}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <button onClick={() => setDepositMethod(null)} className="text-xs text-gray-500 flex items-center gap-1">← Change Method</button>
                    {depositMethod === 'momo' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-xs">
                            <p className="font-bold text-amber-800">PAY VIA MTN MOMO</p>
                            <p className="flex justify-between">Phone: <span className="font-bold">{DEPOSIT_PHONE}</span></p>
                            <p className="flex justify-between">Name: <span className="font-bold">{DEPOSIT_NAME}</span></p>
                            <p className="mt-2 text-blue-600 font-bold">$1 USD = 10 GHS</p>
                        </div>
                    )}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Amount (USD)</label>
                            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 font-bold text-lg" placeholder="0.00" />
                            {parseFloat(amount) > 0 && <p className="text-xs font-bold text-green-600 mt-1">Send Exactly: GH₵ {(parseFloat(amount) * GHS_RATE).toLocaleString()}</p>}
                        </div>
                        {depositMethod !== 'card' && <Input value={depositTxId} onChange={e => setDepositTxId(e.target.value)} placeholder="Transaction ID" className="h-11" />}
                        <Button onClick={handleDepositSubmit} disabled={isSubmitting || !amount} className="w-full bg-amber-500 text-white font-bold h-11">SUBMIT DEPOSIT</Button>
                    </div>
                </div>
            )}
          </div>
        )}

        {mode === "withdraw" && !withdrawSuccess && (
          <div className="bg-white rounded-2xl border border-amber-100 p-6 my-4 space-y-4">
            <h3 className="font-bold text-gray-900">Withdraw Funds</h3>
            {!withdrawMethod ? (
                <div className="grid grid-cols-2 gap-3">
                    {withdrawMethods.map(m => (
                        <button key={m.id} onClick={() => setWithdrawMethod(m.id)} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-amber-400 transition-all">
                            <m.icon className="w-6 h-6 text-amber-500" />
                            <span className="font-bold text-xs">{m.label}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="space-y-4">
                    <button onClick={() => setWithdrawMethod(null)} className="text-xs text-gray-500 flex items-center gap-1">← Change Method</button>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Amount to Withdraw (USD)</label>
                            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="h-11 font-bold text-lg" placeholder="0.00" />
                        </div>
                        {parseFloat(amount) > 0 && (
                            <div className="bg-blue-50 p-3 rounded-xl space-y-1 text-xs">
                                <div className="flex justify-between"><span>Network Fee (15%)</span><span className="text-red-500">-${(parseFloat(amount) * 0.15).toFixed(2)}</span></div>
                                <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>You Receive</span><span className="text-blue-600">GH₵ {(parseFloat(amount) * 0.85 * GHS_RATE).toLocaleString()}</span></div>
                            </div>
                        )}
                        <Button onClick={handleWithdrawal} disabled={isSubmitting || !amount || parseFloat(amount) > profile.balance} className="w-full bg-blue-600 text-white font-bold h-11">PROCEED TO PAYOUT</Button>
                    </div>
                </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /> Transaction History</h3>
          <div className="space-y-3">
            {allTransactions.length > 0 ? (
                allTransactions.map(tx => (
                    <div key={tx.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-800 uppercase">{'tx_id' in tx ? 'Deposit' : 'Withdrawal'}</p>
                            <p className="text-[10px] text-gray-400 font-medium">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className={`font-black text-sm ${'tx_id' in tx ? 'text-green-600' : 'text-red-500'}`}>
                                {('tx_id' in tx ? '+' : '-')}${tx.amount.toFixed(2)}
                            </p>
                        </div>
                    </div>
                ))
            ) : <p className="text-center text-gray-400 text-xs py-10 font-bold uppercase tracking-widest">No activity yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
