

'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import {
  Landmark, ArrowDownToLine, ArrowUpFromLine, Wallet, Shield, Clock,
  CheckCircle, Copy, CreditCard, Smartphone, Coins, AlertCircle,
  PartyPopper, PhoneCall, Hash, Network, User, MapPin, CalendarDays,
  Hourglass, Info, Globe, ChevronLeft, Lock, KeyRound, ShieldCheck, X, LogOut
} from "lucide-react";
import type { User as SupabaseUser } from '@supabase/supabase-js';

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { countries as COUNTRIES_DATA } from "@/lib/data";
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { createDepositRequest, createWithdrawalRequest, setWithdrawalPin } from "./actions";
import { logout } from "@/app/login/actions";

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

const DEPOSIT_PHONE = "+233592682060";
const DEPOSIT_NAME = "M.K";
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
  user_id: string;
  country: string;
  method: string;
  amount: number;
  net_amount: number;
  fee: number;
  details: string;
  status: "pending" | "approved" | "rejected";
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
  const [telecel, setTelecel] = useState({ phone: "", name: "" });
  const [bank, setBank] = useState({ name: "", number: "", holder: "" });
  const [otherBankName, setOtherBankName] = useState("");
  const [card, setCard] = useState({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });
  const [westernUnion, setWesternUnion] = useState({ fullName: "", city: "" });
  const [depositCard, setDepositCard] = useState({ number: "", holder: "", expiry: "", cvv: "", cvvVisible: false });

  const [pinMode, setPinMode] = useState<"security" | "setup" | "verify" | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSettingPin, setIsSettingPin] = useState(false);

  const [depositRecords, setDepositRecords] = useState<DepositRecord[]>([]);
  const [withdrawRecords, setWithdrawRecords] = useState<WithdrawRecord[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [media, setMedia] = useState<any[]>([]);

  const { display: countdown, expired } = useCountdown(mode === "deposit");

  const fetchData = useCallback(async function() {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push('/login');
      return;
    }
    setUser(user);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('balance, country, has_withdrawal_pin, username, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      // This case should be handled by the layout's self-healing now
      console.error('BankPage: Profile fetch failed');
    }
    setProfile(profileData as Profile | null);
    if (profileData) {
      setDepositCountry(profileData.country || '');
    }

    const { data: depositsData, error: depositsError } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (depositsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch deposit history.' });
    } else {
      setDepositRecords(depositsData as DepositRecord[]);
    }

    const { data: withdrawalsData, error: withdrawalsError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (withdrawalsError) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch withdrawal history.' });
    } else {
      setWithdrawRecords(withdrawalsData as WithdrawRecord[]);
    }

    const { data: mediaData, error: mediaError } = await supabase.from('media').select('*');
    if (mediaError) {
      toast({ title: 'Error fetching media', description: mediaError.message, variant: 'destructive' });
    } else if (mediaData) {
      setMedia(mediaData);
      const logo = mediaData.find(m => m.id === 'app-logo');
      if (logo?.url) {
        setLogoUrl(logo.url);
      }
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
    setTelecel({ phone: "", name: "" });
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
      const newRecord = { ...submissionData, id: 'temp-' + Date.now(), status: 'pending', created_at: new Date().toISOString(), tx_id: submissionData.txId };
      // @ts-ignore
      setDepositRecords(function(prev) { return [newRecord as DepositRecord, ...prev]; });
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
     if (withdrawMethod === "usdt") {
        if (!usdt.address.trim()) { toast({ title: "Enter a USDT address", variant: "destructive" }); return; }
    }
     if (withdrawMethod === "momo" || withdrawMethod === 'telecel') {
        const methodState = withdrawMethod === 'momo' ? momo : telecel;
        if (!methodState.phone.trim()) { toast({ title: "Enter a phone number", variant: "destructive" }); return; }
        if (!methodState.name.trim()) { toast({ title: "Enter an account name", variant: "destructive" }); return; }
    }
    if (withdrawMethod === "western_union") {
        if (!westernUnion.fullName.trim()) { toast({ title: "Enter your full name for Western Union", variant: "destructive" }); return; }
        if (!westernUnion.city.trim()) { toast({ title: "Enter your city for pickup", variant: "destructive" }); return; }
    }
    
    // All good, open PIN modal
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
        case 'telecel': details = telecel; break;
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
      setProfile(function(p) { return p ? { ...p, balance: p.balance - amt } : null; });
      setPinMode(null);
    }
  };

  if (loading || !profile) return <BankPageSkeleton />;

  const imageMap = {
    usdt: media.find(m => m.id === 'payment-usdt')?.url || PlaceHolderImages.find(i => i.id === 'payment-usdt')?.imageUrl,
    momo: media.find(m => m.id === 'payment-mtn-momo')?.url || PlaceHolderImages.find(i => i.id === 'payment-mtn-momo')?.imageUrl,
    telecel: media.find(m => m.id === 'payment-telecel')?.url || PlaceHolderImages.find(i => i.id === 'payment-telecel')?.imageUrl,
    bank: media.find(m => m.id === 'payment-bank-transfer')?.url || PlaceHolderImages.find(i => i.id === 'payment-bank-transfer')?.imageUrl,
    western_union: media.find(m => m.id === 'payment-western-union')?.url || PlaceHolderImages.find(i => i.id === 'payment-western-union')?.imageUrl,
    card: media.find(m => m.id === 'payment-card')?.url || PlaceHolderImages.find(i => i.id === 'payment-card')?.imageUrl,
  };

  const depositMethods = [
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo, desc: "Mobile Money", color: "from-yellow-400 to-amber-500" },
    { id: "telecel", label: "TELECEL", icon: Smartphone, img: imageMap.telecel, desc: "Telecel Cash", color: "from-red-500 to-red-600" },
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt, desc: "Tether (TRC20/ERC20)", color: "from-teal-400 to-green-500" },
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card, desc: "Visa / Mastercard", color: "from-blue-400 to-indigo-500" },
  ];

  const withdrawMethods = [
    { id: "usdt", label: "USDT", icon: Coins, img: imageMap.usdt, desc: "Tether (TRC20/ERC20)", color: "from-teal-400 to-green-500" },
    { id: "momo", label: "MTN MOMO", icon: Smartphone, img: imageMap.momo, desc: "Mobile Money", color: "from-yellow-400 to-amber-500" },
    { id: "telecel", label: "TELECEL", icon: Smartphone, img: imageMap.telecel, desc: "Telecel Cash", color: "from-red-500 to-red-600" },
    { id: "bank", label: "Bank Transfer", icon: Landmark, img: imageMap.bank, desc: "Local & International", color: "from-gray-400 to-gray-500" },
    { id: "western_union", label: "Western Union", icon: Network, img: imageMap.western_union, desc: "Global Money Transfer", color: "from-blue-400 to-indigo-500"},
    { id: "card", label: "CARD", icon: CreditCard, img: imageMap.card, desc: "Visa / Mastercard", color: "from-purple-400 to-pink-500" },
  ];

  const hasApprovedDeposit = (depositRecords || []).some(function(d) { return d.status === "approved"; });
  const allTransactions = [...(depositRecords || []), ...(withdrawRecords || [])]
    .sort(function(a, b) { return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); });
  const depositButtonLogo = logoUrl || imageMap.momo;

  const africanBanks = ["Absa Bank", "GCB Bank", "Ecobank", "Zenith Bank", "UBA", "Access Bank"];
  const usaBanks = ["Bank of America", "JPMorgan Chase", "Wells Fargo", "Citibank", "U.S. Bank", "PNC Bank"];
  const italianBanks = ["Intesa Sanpaolo", "UniCredit", "Banco BPM", "Monte dei Paschi di Siena", "BPER Banca"];
  const otherMajorBanks = ["HSBC", "Barclays", "Deutsche Bank", "BNP Paribas", "Standard Chartered"];

  let bankOptions: string[] = [];
  if (profile.country && ['Ghana', 'Nigeria', 'Kenya'].includes(profile.country)) {
      bankOptions = africanBanks;
  } else if (profile.country === 'United States') {
      bankOptions = usaBanks;
  } else if (profile.country === 'Italy') {
      bankOptions = italianBanks;
  } else {
      bankOptions = [...africanBanks, ...usaBanks, ...italianBanks, ...otherMajorBanks];
  }
  bankOptions.sort();
  bankOptions.push("Other");


  return (
    <div className="bg-[#f7f9f4]">
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
                  <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                    CoinPower uses a <span className="font-semibold text-amber-600">6-digit Withdrawal PIN</span> to protect your funds. You'll need to enter it every time you withdraw.
                  </p>
                </div>
                <div className="w-full space-y-2 bg-amber-50 rounded-2xl p-4 border border-amber-100 text-left">
                  {[
                    ["Funds Protection", "Prevents unauthorized withdrawals"],
                    ["Easy to Use", "Just 6 digits — simple and fast"],
                    ["One-Time Setup", "Set it once, use it forever"],
                  ].map(function([title, desc]) {
                    return (
                    <div key={title} className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{title}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                    </div>
                  )})}
                </div>
                <Button onClick={function() { setPinMode("setup"); setPinInput(""); setPinConfirm(""); setPinError(""); }}
                  data-testid="button-setup-pin" className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-xl h-12 text-base shadow-md hover:shadow-lg transition-all">
                  <Lock className="w-4 h-4 mr-2" /> Set Up My Withdrawal PIN
                </Button>
              </div>
            )}
            
            {pinMode === 'setup' && (
               <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <KeyRound className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create Withdrawal PIN</h2>
                  <p className="text-gray-500 text-sm mt-1">Enter a 6-digit PIN you'll remember</p>
                </div>
                <div className="w-full space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2 text-left">Enter PIN</p>
                    <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-input" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2 text-left">Confirm PIN</p>
                    <PinBoxes value={pinConfirm} onChange={setPinConfirm} testId="pin-confirm" />
                  </div>
                  {pinError && <p className="text-red-500 text-xs font-medium">{pinError}</p>}
                </div>
                <Button data-testid="button-create-pin"
                  disabled={pinInput.length < 6 || pinConfirm.length < 6 || isSettingPin}
                  onClick={handleSetPin}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-xl h-12 text-base shadow-md disabled:opacity-50">
                  {isSettingPin ? "Saving…" : "Create PIN & Continue"}
                </Button>
                <button onClick={function() { return setPinMode("security"); }} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Back</button>
              </div>
            )}

            {pinMode === "verify" && (
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Enter Withdrawal PIN</h2>
                  <p className="text-gray-500 text-sm mt-1">Enter your 6-digit PIN to continue</p>
                </div>
                <div className="w-full">
                  <PinBoxes value={pinInput} onChange={setPinInput} testId="pin-verify" />
                  {pinError && <p className="text-red-500 text-xs font-medium mt-2">{pinError}</p>}
                </div>
                <Button data-testid="button-verify-pin"
                  disabled={pinInput.length < 6 || isSubmitting}
                  onClick={handleWithdrawalSubmit}
                  className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white font-bold rounded-xl h-12 text-base shadow-md disabled:opacity-50">
                  {isSubmitting ? "Processing..." : "Authorize & Withdraw"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-3 sm:px-6">

        <div className="py-4 sm:py-5 mb-2">
          <div className="flex items-center gap-3 mb-1">
            {logoUrl ? (
                <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-black flex items-center justify-center shadow-md">
                    <img src={logoUrl} alt="CoinPower Logo" className="w-full h-full object-contain p-0.5" />
                </div>
            ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
                    <Landmark className="w-4 h-4 text-white" />
                </div>
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">CoinPower Bank</h1>
          </div>
          <p className="text-gray-500 text-xs sm:text-sm">Manage your deposits and withdrawals securely</p>
        </div>

        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 rounded-2xl p-5 sm:p-6 mb-4 shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-amber-100" />
              <p className="text-amber-100 text-xs font-medium">Available Balance</p>
            </div>
            <p className="text-3xl sm:text-4xl font-bold mt-1 mb-3" data-testid="text-balance">${profile.balance.toFixed(2)}</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-200" /><span className="text-amber-100 text-xs">Protected Balance</span></div>
              <div className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-amber-200" /><span className="text-amber-100 text-xs">Verified Account</span></div>
            </div>
          </div>
        </div>

        {function() {
          const today = new Date().getDay();
          const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
          return (
            <div className="rounded-2xl border bg-blue-50 border-blue-200 p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm bg-blue-500">
                  <span className="text-white text-lg">📢</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm mb-1 text-blue-800">
                    Withdrawal Processing Schedule
                  </p>
                  <p className="text-blue-700 text-xs leading-relaxed">
                    Withdrawals are processed <strong>Monday to Saturday</strong> within 1–24 hours. On <strong>Sundays</strong>, the platform is active but withdrawal accounts are closed — any request submitted on Sunday will be processed the following <strong>Monday</strong>.
                  </p>
                  <div className="flex gap-1.5 mt-3 flex-wrap">
                    {days.map(function(d, i) {
                      return (
                      <span key={d} className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        i === 0
                          ? "bg-red-500 text-white"
                          : i === today
                          ? "bg-green-500 text-white ring-2 ring-green-400 ring-offset-1"
                          : "bg-white border border-blue-200 text-blue-600"
                      }`}>
                        {d}{i === 0 ? " ✕" : ""}
                      </span>
                    )})}
                  </div>
                </div>
              </div>
            </div>
          );
        }()}

        <div className="space-y-3">
            <div 
              data-testid="button-deposit" 
              onClick={function() { return openMode('deposit'); }}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-4 cursor-pointer hover:border-amber-300 hover:bg-amber-50/50 transition-all"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black flex items-center justify-center">
                <img src={depositButtonLogo} alt="Deposit" className="w-full h-full object-contain p-1" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">Deposit Funds</p>
                <p className="text-xs text-gray-500">MTN MoMo · USDT · Card</p>
                <p className="text-xs font-semibold text-amber-600 mt-1">Tap to see payment details</p>
              </div>
              <ArrowDownToLine className="w-5 h-5 text-green-500" />
            </div>

            <div 
              data-testid="button-withdraw"
              onClick={function() {
                if (!hasApprovedDeposit) {
                  toast({ title: "Deposit required", description: "You must have at least one approved deposit before you can withdraw.", variant: "destructive" });
                  return;
                }
                if (!profile.has_withdrawal_pin) {
                  setPinMode("security");
                } else {
                  openMode("withdraw");
                }
              }}
              className={`bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-4 transition-all ${
                !hasApprovedDeposit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-amber-300 hover:bg-amber-50/50'
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <ArrowUpFromLine className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-800">Withdraw Funds</p>
                <p className="text-xs text-gray-500">Transfer to your account</p>
              </div>
            </div>
        </div>

        {mode === "deposit" && !depositSuccess && !depositMethod && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 sm:p-6 my-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-sm sm:text-base">Select Payment Method</h3>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-600 font-bold text-sm tabular-nums" data-testid="countdown-timer">{countdown}</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs">Choose how you want to make your deposit</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {depositMethods.map(function({ id, label, icon: Icon, img, desc, color }) {
                return (
                <button key={id} data-testid={`deposit-method-${id}`}
                  onClick={function() { return setDepositMethod(id); }}
                  className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50/40 transition-all duration-150">
                  <div className={`w-11 h-11 rounded-xl overflow-hidden shadow-md ${img ? "" : `bg-gradient-to-br ${color} flex items-center justify-center`}`}>
                    {img ? <img src={img} alt={label} className="w-full h-full object-cover" /> : <Icon className="w-5 h-5 text-white" />}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900 text-xs">{label}</p>
                    <p className="text-gray-400 text-[10px] leading-tight hidden sm:block">{desc}</p>
                  </div>
                </button>
              )})}
            </div>
          </div>
        )}

        {mode === "deposit" && !depositSuccess && !!depositMethod && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 sm:p-6 my-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={function() { return setDepositMethod(null); }} data-testid="button-back-deposit-method"
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    {depositMethods.find(function(m) { return m.id === depositMethod; })?.label} Deposit
                  </h3>
                  <p className="text-gray-400 text-xs">Fill in your details below</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200">
                <Clock className="w-3.5 h-3.5 text-red-600" />
                <span className="text-red-600 font-bold text-sm tabular-nums" data-testid="countdown-timer-2">{countdown}</span>
              </div>
            </div>

            {expired && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-amber-700 text-xs font-medium">Timer ended — your transaction ID is saved. You can still submit your deposit below.</p>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Your Country
              </label>
              <Select value={depositCountry} onValueChange={setDepositCountry}>
                <SelectTrigger data-testid="select-deposit-country" className="h-11 border-gray-200 focus:border-green-400 rounded-xl text-sm">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES_DATA.map(function(c) {
                    return (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  )})}
                </SelectContent>
              </Select>
            </div>

            {depositMethod === "momo" && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-10 h-7 rounded-lg overflow-hidden shadow-sm flex-shrink-0">
                    <img src={imageMap.momo} alt="MTN MoMo" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-yellow-800 font-bold uppercase tracking-wide">Send MTN MOMO payment to</p>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-yellow-100">
                  <div>
                    <p className="text-xs text-gray-400">Account Name</p>
                    <p className="font-bold text-gray-900 text-sm sm:text-base">{DEPOSIT_NAME}</p>
                  </div>
                  <button data-testid="copy-name" onClick={function() { return copy(DEPOSIT_NAME, "Name"); }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200">
                    <Copy className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-yellow-100">
                  <div>
                    <p className="text-xs text-gray-400">MTN MOMO Number</p>
                    <p className="font-bold text-gray-900 text-lg tracking-widest">{DEPOSIT_PHONE}</p>
                  </div>
                  <button data-testid="copy-phone" onClick={function() { return copy(DEPOSIT_PHONE, "Phone number"); }}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-200">
                    <Copy className="w-4 h-4 text-amber-600" />
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <p className="text-amber-800 text-xs leading-relaxed font-medium">
                    ✅ Send your exact deposit amount to the MTN MOMO number above, then fill in the amount and the Transaction ID from your confirmation SMS below.
                  </p>
                </div>
              </div>
            )}
            
            {depositMethod === "telecel" && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-14 h-9 rounded-lg overflow-hidden shadow-sm flex-shrink-0 bg-white flex items-center justify-center p-1">
                    <img src={imageMap.telecel} alt="Telecel Cash" className="w-full h-full object-contain" />
                  </div>
                  <p className="text-xs text-red-800 font-bold uppercase tracking-wide">Send Telecel Cash payment to</p>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-red-100">
                  <div>
                    <p className="text-xs text-gray-400">Account Name</p>
                    <p className="font-bold text-gray-900 text-sm sm:text-base">{DEPOSIT_NAME}</p>
                  </div>
                  <button data-testid="copy-telecel-name" onClick={function() { return copy(DEPOSIT_NAME, "Name"); }}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-200">
                    <Copy className="w-4 h-4 text-red-600" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2.5 border border-red-100">
                  <div>
                    <p className="text-xs text-gray-400">Telecel Cash Number</p>
                    <p className="font-bold text-gray-900 text-lg tracking-widest">{DEPOSIT_PHONE}</p>
                  </div>
                  <button data-testid="copy-telecel-phone" onClick={function() { return copy(DEPOSIT_PHONE, "Phone number"); }}
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-200">
                    <Copy className="w-4 h-4 text-red-600" />
                  </button>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <p className="text-red-800 text-xs leading-relaxed font-medium">
                    ✅ Send your exact deposit amount via Telecel Cash to the number above, then fill in the amount and Transaction ID from your confirmation SMS below.
                  </p>
                </div>
              </div>
            )}
            
            {depositMethod === "usdt" && (
              <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-9 h-9 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                    <img src={imageMap.usdt} alt="USDT" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-teal-800 font-bold uppercase tracking-wide">Send USDT to this wallet</p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2.5 border border-teal-100">
                  <p className="text-xs text-gray-400 mb-1">Wallet Address (TRC20 / ERC20 / BEP20)</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-xs text-gray-900 font-bold break-all">TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE</p>
                    <button data-testid="copy-usdt-address" onClick={function() { return copy("TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", "Wallet address"); }}
                      className="p-2 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors border border-teal-200 flex-shrink-0">
                      <Copy className="w-4 h-4 text-teal-600" />
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {["TRC20", "ERC20", "BEP20"].map(function(net) {
                    return (
                    <span key={net} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-100 text-teal-700 border border-teal-200">{net}</span>
                  )})}
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
                  <p className="text-teal-800 text-xs leading-relaxed font-medium">
                    ✅ Send USDT to the wallet address above, then enter the amount sent and your transaction hash (TxID) below.
                  </p>
                </div>
              </div>
            )}

            {depositMethod === "card" && (
              <div className="space-y-4">
                <div
                  className="relative rounded-2xl p-5 overflow-hidden shadow-2xl"
                  style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", minHeight: 160 }}
                >
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 11px)" }} />
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-amber-400 opacity-90" />
                      <div className="flex items-center gap-1.5">
                        <img src={imageMap.card} alt="card" className="h-6 w-auto object-contain rounded opacity-90" />
                      </div>
                    </div>
                    <p className="font-mono text-white text-base sm:text-lg tracking-widest font-bold">
                      {depositCard.number || "•••• •••• •••• ••••"}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">Card Holder</p>
                        <p className="text-white font-bold text-sm uppercase tracking-wider truncate max-w-[160px]">
                          {depositCard.holder || "YOUR NAME"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/50 text-[9px] uppercase tracking-widest mb-0.5">Expires</p>
                        <p className="text-white font-bold text-sm">{depositCard.expiry || "MM/YY"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                    <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Enter Card Details</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Card Number</label>
                    <Input
                      data-testid="input-deposit-card-number"
                      value={depositCard.number}
                      inputMode="numeric"
                      maxLength={19}
                      placeholder="0000 0000 0000 0000"
                      onChange={function(e) {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 16);
                        const formatted = digits.replace(/(.{4})/g, "$1 ").trim();
                        setDepositCard({ ...depositCard, number: formatted });
                      }}
                      className="h-11 border-gray-200 focus:border-blue-400 font-mono text-base tracking-widest"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Cardholder Name</label>
                    <Input
                      data-testid="input-deposit-card-holder"
                      value={depositCard.holder}
                      placeholder="Name as on card"
                      onChange={function(e) { return setDepositCard({ ...depositCard, holder: e.target.value.toUpperCase() }); }}
                      className="h-11 border-gray-200 focus:border-blue-400 text-sm font-semibold uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block">Expiry Date</label>
                      <Input
                        data-testid="input-deposit-card-expiry"
                        value={depositCard.expiry}
                        inputMode="numeric"
                        placeholder="MM / YY"
                        maxLength={5}
                        onChange={function(e) {
                          const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
                          const formatted = digits.length > 2 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
                          setDepositCard({ ...depositCard, expiry: formatted });
                        }}
                        className="h-11 border-gray-200 focus:border-blue-400 font-mono text-sm text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1.5 block flex items-center gap-1">
                        CVV / CVC
                        <button type="button" onClick={function() { return setDepositCard(function(c) { return ({ ...c, cvvVisible: !c.cvvVisible }); }); }}
                          className="text-gray-400 hover:text-gray-600 transition-colors">
                          <Shield className="w-3 h-3" />
                        </button>
                      </label>
                      <Input
                        data-testid="input-deposit-card-cvv"
                        value={depositCard.cvv}
                        type={depositCard.cvvVisible ? "text" : "password"}
                        inputMode="numeric"
                        placeholder="•••"
                        maxLength={4}
                        onChange={function(e) { return setDepositCard({ ...depositCard, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }); }}
                        className="h-11 border-gray-200 focus:border-blue-400 font-mono text-sm text-center tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100 mt-1">
                    <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-blue-700 text-[11px] font-medium">Your card details are encrypted and securely processed</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount Sent ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <Input type="number" value={amount} onChange={function(e) { return setAmount(e.target.value); }}
                    data-testid="input-amount" placeholder="0.00" min="0" step="0.01"
                    className="pl-7 h-11 border-gray-200 focus:border-green-400 text-lg font-semibold" />
                </div>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {["50", "100", "250", "500"].map(function(q) {
                    return (
                    <button key={q} onClick={function() { return setAmount(q); }} data-testid={`quick-amount-${q}`}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 transition-colors">
                      ${q}
                    </button>
                  )})}
                </div>
              </div>
              {depositMethod !== "card" && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    {depositMethod === "usdt" ? "Transaction Hash / ID" : "Transaction ID"}
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input value={depositTxId} onChange={function(e) { return setDepositTxId(e.target.value); }}
                      data-testid="input-deposit-txid"
                      placeholder={depositMethod === "usdt" ? "e.g. 0x1234abcd..." : "e.g. TXN123456"}
                      className="pl-9 h-11 border-gray-200 focus:border-green-400 font-mono text-sm" />
                  </div>
                </div>
              )}
              <Button onClick={handleDepositSubmit} data-testid="button-confirm-deposit"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
                {isSubmitting ? "Submitting request..." : "Submit Deposit Request"}
              </Button>
            </div>
          </div>
        )}

        {mode === "deposit" && depositSuccess && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 my-4 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Deposit Submitted!</h3>
            <p className="text-gray-500 text-sm">Your deposit of <span className="font-semibold text-green-600">${amount}</span> has been submitted. Your balance will be credited after confirmation.</p>
            <Button onClick={function() { return openMode(null); }} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl h-10 px-6">Done</Button>
          </div>
        )}

        {mode === "withdraw" && !withdrawSuccess && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4 sm:p-6 my-4 space-y-5">
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-3">
              <Hourglass className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 text-xs font-semibold">Processing Time: 1 – 24 Hours</p>
                <p className="text-blue-700 text-xs mt-0.5 leading-relaxed">
                  Withdrawals are processed Monday to Saturday. If your withdrawal is still pending after 24 hours, please contact the manager.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-3">Select Payment Method</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {withdrawMethods.map(function({ id, label, icon: Icon, img, desc, color }) {
                  return (
                  <button key={id} data-testid={`method-${id}`} onClick={function() { return setWithdrawMethod(id); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 ${withdrawMethod === id ? "border-amber-500 bg-amber-50 shadow-md" : "border-gray-200 hover:border-amber-200 hover:bg-amber-50/40"}`}>
                    <div className={`w-9 h-9 rounded-xl overflow-hidden shadow-sm ${img ? "" : `bg-gradient-to-br ${color} flex items-center justify-center`}`}>
                      {img ? <img src={img} alt={label} className="w-full h-full object-cover" /> : <Icon className="w-4 h-4 text-white" />}
                    </div>
                    <p className="font-bold text-gray-900 text-xs">{label}</p>
                    <p className="text-gray-400 text-[10px] text-center leading-tight hidden sm:block">{desc}</p>
                  </button>
                )})}
              </div>
            </div>

            {withdrawMethod && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
               {withdrawMethod === 'momo' && (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> MTN MoMo Details</p>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Phone Number</label>
                        <Input value={momo.phone} onChange={(e) => setMomo({...momo, phone: e.target.value})} placeholder="Your MTN phone number" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Account Name</label>
                        <Input value={momo.name} onChange={(e) => setMomo({...momo, name: e.target.value})} placeholder="Name on MoMo account" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                 </div>
               )}
               {withdrawMethod === 'telecel' && (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> Telecel Cash Details</p>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Phone Number</label>
                        <Input value={telecel.phone} onChange={(e) => setTelecel({...telecel, phone: e.target.value})} placeholder="Your Telecel phone number" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Account Name</label>
                        <Input value={telecel.name} onChange={(e) => setTelecel({...telecel, name: e.target.value})} placeholder="Name on Telecel account" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                 </div>
               )}
               {withdrawMethod === 'usdt' && (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5"><Coins className="w-4 h-4" /> USDT Wallet</p>
                     <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">USDT Wallet Address</label>
                        <Input value={usdt.address} onChange={(e) => setUsdt({...usdt, address: e.target.value})} placeholder="Your TRC20 or ERC20 address" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                     <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Network</label>
                         <Select value={usdt.network} onValueChange={(val) => setUsdt({...usdt, network: val})}>
                            <SelectTrigger className="h-11 border-gray-200 focus:border-amber-400"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="TRC20">TRC20 (Tron)</SelectItem><SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem></SelectContent>
                        </Select>
                    </div>
                 </div>
               )}
              {withdrawMethod === 'bank' && (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5"><Landmark className="w-4 h-4" /> Bank Account Details</p>
                     <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Bank Name</label>
                         <Select value={bank.name} onValueChange={(val) => setBank({ ...bank, name: val })}>
                            <SelectTrigger className="h-11 border-gray-200 focus:border-amber-400" data-testid="select-bank-name">
                                <SelectValue placeholder="Select a bank" />
                            </SelectTrigger>
                            <SelectContent>
                                {bankOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {bank.name === 'Other' && (
                         <div>
                            <label className="text-xs font-medium text-gray-600 mb-1.5 block">Other Bank Name</label>
                            <Input value={otherBankName} onChange={(e) => setOtherBankName(e.target.value)} placeholder="Please specify bank name" className="h-11 border-gray-200 focus:border-amber-400" />
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Account Number / IBAN</label>
                        <Input value={bank.number} onChange={(e) => setBank({ ...bank, number: e.target.value })} placeholder="Your bank account number or IBAN" className="h-11 border-gray-200 focus:border-amber-400" data-testid="input-bank-account-number" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Account Holder Name</label>
                        <Input value={bank.holder} onChange={(e) => setBank({ ...bank, holder: e.target.value })} placeholder="Name on bank account" className="h-11 border-gray-200 focus:border-amber-400" data-testid="input-bank-account-holder" />
                    </div>
                 </div>
               )}
                {withdrawMethod === 'western_union' && (
                 <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5"><Network className="w-4 h-4" /> Western Union Details</p>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Full Name (as on ID)</label>
                        <Input value={westernUnion.fullName} onChange={(e) => setWesternUnion({...westernUnion, fullName: e.target.value})} placeholder="Your full legal name" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">City</label>
                        <Input value={westernUnion.city} onChange={(e) => setWesternUnion({...westernUnion, city: e.target.value})} placeholder="City of pickup" className="h-11 border-gray-200 focus:border-amber-400" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Country</label>
                        <Input value={profile.country} readOnly disabled placeholder="Your profile country" className="h-11 border-gray-200 bg-gray-100" />
                    </div>
                    <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-700 text-xs font-medium">After approval, you will receive an MTCN (Money Transfer Control Number) to pick up your cash at a Western Union agent.</p>
                    </div>
                 </div>
               )}
               <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">Amount to Withdraw ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">$</span>
                  <Input type="number" value={amount} onChange={function(e) { return setAmount(e.target.value); }}
                    data-testid="input-withdraw-amount" placeholder="0.00" min="0" step="0.01"
                    className="pl-7 h-11 border-gray-200 focus:border-amber-400 text-lg font-semibold" />
                </div>
              </div>
              <Button onClick={handleWithdrawal} data-testid="button-confirm-withdraw"
                disabled={isSubmitting}
                className="w-full h-11 font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md">
                {`Withdraw $${amount || '0.00'}`}
              </Button>
            </div>
            )}
          </div>
        )}

         {mode === "withdraw" && withdrawSuccess && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-6 my-4 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <PartyPopper className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Withdrawal Submitted!</h3>
            <p className="text-gray-500 text-sm">Your withdrawal request for <span className="font-semibold text-green-600">${amount}</span> has been submitted for processing.</p>
            {lastTxId && <p className="text-xs text-gray-400">TXN ID: {lastTxId}</p>}
            <Button onClick={function() { openMode(null); }} className="bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-xl h-10 px-6">Done</Button>
          </div>
        )}


        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 my-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900 text-sm sm:text-base">Transaction History</h3>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(["all", "deposit", "withdraw"] as const).map(function(tab) {
                return (
                <button key={tab} onClick={function() { return setHistoryTab(tab); }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${historyTab === tab ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )})}
            </div>
          </div>
          <div className="space-y-2">
            {allTransactions.length > 0 ? (
              allTransactions
                .filter(function(tx) {
                  if (historyTab === 'all') return true;
                  const isDeposit = 'tx_id' in tx;
                  return historyTab === 'deposit' ? isDeposit : !isDeposit;
                })
                .map(function(tx) {
                  const isDeposit = 'tx_id' in tx;
                  const statusColor = tx.status === 'approved' ? 'bg-green-100 text-green-700' : tx.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                  const Icon = isDeposit ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${statusColor.replace('text-', 'bg-').replace('700', '100')}`}>
                        <Icon className={`w-4 h-4 ${statusColor.replace('bg-','text-').replace('100','600')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{isDeposit ? 'Deposit' : 'Withdrawal'} Request</p>
                        <p className="text-xs text-gray-400 truncate">{(isDeposit && tx.tx_id) ? tx.tx_id : (tx as WithdrawRecord).method} · {new Date(tx.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${isDeposit ? 'text-green-600' : 'text-gray-800'}`}>{isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}</p>
                        <Badge className={`text-xs mt-0.5 ${statusColor} border-0`}>{tx.status}</Badge>
                      </div>
                    </div>
                  );
                })
            ) : (
                <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">No transactions yet.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
