
'use client';

import { useState, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import type { FirebaseError } from 'firebase/app';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Star, AlertCircle, Gift, ShieldCheck, Lock, CheckCircle2,
  TrendingUp, Users, Banknote, BadgeCheck, Globe
} from "lucide-react";

import { useAuth, useFirestore, useUser, initiateEmailSignUp, setDocumentNonBlocking } from '@/firebase';
import { countries, LANGUAGES, PHONE_CODES } from '@/lib/data';
import { TRANSLATIONS } from '@/lib/translations';

type LangCode = typeof LANGUAGES[number]["code"];

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be 20 characters or less")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(6, "Phone number must be at least 6 digits").regex(/^\d+$/, "Enter digits only"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one capital letter")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one symbol (e.g. @, #, !)"),
  country: z.string().min(1, "Please select your country"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  referralCode: z.string().optional(),
  language: z.string(),
  agreedToTerms: z.boolean().refine(val => val === true, {
    message: "Please scroll through and agree to the Terms & Privacy Policy to continue.",
  }),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

function genReferralCode(username: string): string {
    const code = `CP-${'\'\'\''}${username.slice(0, 4).toUpperCase()}${'\'\'\''}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return code.slice(0, 12);
}

function TermsContent() {
  return (
    <div className="text-xs text-gray-700 space-y-4 leading-relaxed">

      {/* Trust highlights */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {[
          { icon: TrendingUp, text: "Fixed daily returns — clear & predictable" },
          { icon: Users, text: "50,000+ members earning worldwide" },
          { icon: Banknote, text: "Fast withdrawals, 1–24 hour processing" },
          { icon: BadgeCheck, text: "Licensed & regulated — EU MiCA compliant" },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-1.5 bg-green-50 rounded-lg p-2 border border-green-100">
            <Icon className="w-3 h-3 text-green-600 flex-shrink-0 mt-0.5" />
            <span className="text-green-800 font-medium" style={{ fontSize: "10px" }}>{text}</span>
          </div>
        ))}
      </div>

      {/* PRIVACY POLICY */}
      <div>
        <p className="font-bold text-green-800 text-sm mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> COINPOWER PRIVACY POLICY
        </p>
        <p className="text-gray-500 mb-2 text-xs">Effective Date: January 1, 2025</p>
        <p className="text-gray-600">At CoinPower, your privacy is treated with the highest care. We are fully transparent about what data we collect and why — there are no hidden practices.</p>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">1. What Information We Collect</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li><strong>Account details</strong> — your name, email address, username, and country.</li>
          <li><strong>Financial records</strong> — wallet addresses and transaction history needed to process your deposits and withdrawals.</li>
          <li><strong>Usage data</strong> — login activity and device info used exclusively to detect fraud and protect your account.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">2. How We Use Your Data</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>To set up and manage your CoinPower account securely.</li>
          <li>To process your deposits, distribute daily income, and handle withdrawals promptly.</li>
          <li>To send important account alerts and respond to your support requests.</li>
          <li>To identify and stop any fraudulent or suspicious activity before it affects you.</li>
          <li>To continuously improve your experience on the platform.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">3. How We Protect Your Data</p>
        <p className="text-gray-600">Your information is stored on enterprise-grade encrypted servers. Only a small number of authorised team members can access account data — and only when necessary. We will <strong>never</strong> sell, share, or rent your personal information to any third party. Your withdrawal PIN is protected using one-way cryptographic hashing, meaning not even our own team can see it.</p>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">4. Your Rights</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>You may request a full copy of your personal data held by us at any time.</li>
          <li>You may request that we correct or delete your data.</li>
          <li>You may opt out of any non-essential communications at any time.</li>
        </ul>
      </div>

      <hr className="border-amber-200 my-3" />

      {/* TERMS OF SERVICE */}
      <div>
        <p className="font-bold text-green-800 text-sm mb-1 flex items-center gap-1.5">
          <BadgeCheck className="w-3.5 h-3.5" /> COINPOWER TERMS OF SERVICE
        </p>
        <p className="text-gray-500 mb-2 text-xs">Effective Date: January 1, 2025</p>
        <p className="text-gray-600">Welcome to CoinPower. These Terms of Service govern your use of the platform. By creating an account, you confirm you have read and understood everything below.</p>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">1. Eligibility</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>You must be at least <strong>18 years old</strong> to use CoinPower.</li>
          <li>You must provide accurate and truthful information when registering.</li>
          <li>You must comply with any applicable laws in your country of residence.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">2. Our Platform & Services</p>
        <p className="text-gray-600 mb-1">CoinPower is a structured digital energy investment platform. Unlike volatile crypto trading, our system is built around fixed-return power generators:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li><strong>Generator Rental (PG1–PG4)</strong> — rent a generator and receive a fixed daily income for its full rental period. All returns are displayed clearly before you commit.</li>
          <li><strong>Deposits & Withdrawals</strong> — fund your account via MTN MoMo or USDT. Withdraw your earnings at any time after your first approved deposit.</li>
          <li><strong>Referral Programme</strong> — invite others and earn additional rewards on top of your regular daily income.</li>
        </ul>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-3">
        <p className="font-semibold text-green-800 mb-1.5 flex items-center gap-1.5 text-xs">
          <TrendingUp className="w-3.5 h-3.5" /> 3. How Your Returns Work — Designed for Confidence
        </p>
        <p className="text-gray-600 mb-1.5">CoinPower is built differently from traditional crypto platforms. Here is why our members invest with confidence:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li><strong>Fixed daily income</strong> — your generator earns a set amount every day. No guessing, no surprises.</li>
          <li><strong>Full transparency</strong> — every plan clearly shows the daily return, total period, and total earnings before you rent.</li>
          <li><strong>Start small, grow steadily</strong> — PG1 is completely free to activate. You can grow at your own comfortable pace.</li>
          <li><strong>No lock-in pressure</strong> — your earnings accumulate daily and can be withdrawn after your first deposit approval.</li>
          <li><strong>Active management</strong> — our operations team monitors the platform 24/7 to protect every member's earnings.</li>
        </ul>
        <p className="text-gray-500 mt-1.5 text-xs italic">Note: As with any investment platform, returns are subject to platform operational conditions. CoinPower commits to maintaining stable, consistent returns for all active members.</p>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">4. Fees & Withdrawals</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>A <strong>15% processing fee</strong> is automatically deducted from each withdrawal to cover network and operational costs.</li>
          <li>Withdrawals are reviewed and processed within <strong>1–24 hours</strong> after submission.</li>
          <li>Your first withdrawal requires at least one previously approved deposit.</li>
          <li>A personal <strong>6-digit withdrawal PIN</strong> must be set and confirmed on every withdrawal — keeping your funds fully under your control.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">5. Keeping Your Account Secure</p>
        <p className="text-gray-600 mb-1">Your security is our shared responsibility:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Keep your password strong and never share it with anyone.</li>
          <li>Set a unique 6-digit withdrawal PIN that only you know.</li>
          <li>If you ever suspect unauthorised access, contact our support team immediately via Telegram — we respond quickly.</li>
          <li>CoinPower staff will <strong>never</strong> ask for your PIN or password.</li>
        </ul>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">6. Fair Use & Account Standing</p>
        <p className="text-gray-600">CoinPower is committed to fairness for all members. Accounts found to be involved in fraudulent activity, manipulation, or providing false information may be suspended. Honest, active members are protected and supported at all times.</p>
      </div>

      <div>
        <p className="font-semibold text-gray-800 mb-1">7. Support & Contact</p>
        <p className="text-gray-600">Our support team is always ready to help. Reach us through the official CoinPower Telegram group available in the app, or via the in-app support channels. We are here to ensure your investment journey is smooth and rewarding.</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-2">
        <p className="text-amber-800 font-semibold text-xs flex items-center gap-1.5 mb-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-700" /> You are almost there!
        </p>
        <p className="text-amber-700 text-xs">By ticking the agreement below, you confirm that you are 18 or older, have read and understood both the Privacy Policy and Terms of Service, and are ready to start your investment journey with CoinPower.</p>
      </div>
    </div>
  );
}

export default function SignUp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const refFromUrl = searchParams.get("ref") || "";

  const [selectedLang, setSelectedLang] = useState<LangCode>("en");
  const t = TRANSLATIONS[selectedLang];

  const [selectedPhoneCode, setSelectedPhoneCode] = useState("🇬🇭+233");

  const [termsOpen, setTermsOpen] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 24;
    if (atBottom) setHasReadTerms(true);
  }, []);

  const openTerms = () => {
    setTermsOpen(true);
    setTimeout(() => {
      scrollRef.current?.addEventListener("scroll", handleScroll, { passive: true });
    }, 100);
  };

  const form = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: "", email: "", phone: "", password: "", confirmPassword: "", fullName: "", country: "", language: "English (US)", referralCode: refFromUrl, agreedToTerms: false },
    mode: "onTouched",
  });
  
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (refFromUrl) {
      form.setValue('referralCode', refFromUrl);
    }
  }, [refFromUrl, form]);

  function getAuthErrorMessage(error: FirebaseError): string {
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'This email address is already in use by another account.';
      case 'auth/weak-password':
        return 'The password is too weak. Please choose a stronger password.';
      case 'auth/invalid-email':
        return 'The email address is not valid.';
      default:
        return 'An unexpected error occurred during sign up. Please try again.';
    }
  }
  
  async function onSubmit(values: SignupForm) {
    if (!auth || !firestore) return;
    
    setIsSubmitting(true);
    form.clearErrors();
    form.setValue("language", LANGUAGES.find(l => l.code === selectedLang)?.name ?? "English (US)");

    initiateEmailSignUp(
      auth,
      values.email,
      values.password,
      (error: FirebaseError) => {
        const message = getAuthErrorMessage(error);
        form.setError("root", { message });
        setIsSubmitting(false);
      }
    );

    const unsubscribe = onAuthStateChanged(auth, (newUser) => {
      if (newUser) {
        unsubscribe();

        updateProfile(newUser, { displayName: values.fullName }).catch(
          (profileError) => {
            console.error('Error updating profile: ', profileError);
          }
        );

        const userRef = doc(firestore, 'users', newUser.uid);
        const dialCode = selectedPhoneCode.replace(/[^+\d]/g, "");
        const fullPhone = dialCode + values.phone;

        const userData: any = {
          id: newUser.uid,
          email: values.email,
          username: values.username,
          fullName: values.fullName,
          preferredLanguageCode: selectedLang,
          country: values.country,
          phone: fullPhone,
          balance: 1.0, // $1 bonus
          referralCode: genReferralCode(values.username),
          referralCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (values.referralCode) {
          userData.referredBy = values.referralCode;
        }

        setDocumentNonBlocking(userRef, userData, { merge: false });

        toast({
          title: 'Account created!',
          description: 'Redirecting to your dashboard...',
        });
        router.push('/dashboard');
      }
    });
  }

  const { errors, formState } = form;
  const fieldClass = (hasError: boolean) =>
    `h-11 transition-colors text-sm ${hasError
      ? "border-red-400 focus:border-red-500 bg-red-50 focus-visible:ring-red-200"
      : "border-gray-200 focus:border-amber-400 focus-visible:ring-amber-200"}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 sm:py-12"
      style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #0f4c2a 45%, #7a5500 80%, #c9891a 100%)" }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
           <div className="mx-auto mb-3 h-16 w-16 rounded-2xl object-cover shadow-2xl bg-primary flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary-foreground"
            >
              <circle cx="16" cy="16" r="14" fill="currentColor" />
              <path
                d="M17.866 10.6667L14.666 16.5333H19.2L15.4673 24L18.6673 17.8667H14.134L17.866 10.6667Z"
                fill="#000"
              />
              <circle
                cx="16"
                cy="16"
                r="15"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Coin<span className="text-amber-400">Power</span></h1>
          <p className="text-amber-200/80 mt-1 text-sm font-medium">Digital Energy Mining Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-8"
          style={{ borderTop: "4px solid transparent", borderImage: "linear-gradient(90deg,#0f4c2a,#c9891a,#0f4c2a) 1" }}>

          {/* ── Language Picker ── */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-amber-500" />
              {t.selectLang}
            </label>
            <Select
              value={selectedLang}
              onValueChange={(val) => {
                setSelectedLang(val as LangCode);
                form.setValue("language", LANGUAGES.find(l => l.code === val)?.name ?? "English (US)");
              }}
            >
              <SelectTrigger data-testid="language-picker" className="h-11 text-sm border-gray-200 focus:border-amber-400 focus:ring-amber-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <SelectValue placeholder={t.selectLang}>
                    <span className="flex items-center gap-2">
                      <span className="text-lg leading-none">{LANGUAGES.find(l => l.code === selectedLang)?.flag}</span>
                      <span>{LANGUAGES.find(l => l.code === selectedLang)?.name}</span>
                    </span>
                  </SelectValue>
                </div>
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} data-testid={`lang-${lang.code}`}>
                    <span className="flex items-center gap-2">
                      <span className="text-xl leading-none">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <p className="text-xs text-amber-600 font-medium">{t.subheading}</p>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-5">{t.heading}</h2>

          {errors.root && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4" data-testid="error-signup">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{errors.root.message}</p>
            </div>
          )}

          {refFromUrl && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
              <Gift className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700 font-medium">{t.referralLabel} <span className="font-black">{refFromUrl}</span> {t.referralApplied}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-3.5" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-fullname" placeholder={t.fullName} className={fieldClass(!!errors.fullName)} />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs font-medium" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="username" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} data-testid="input-username" placeholder={t.username} className={fieldClass(!!errors.username)} />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs font-medium" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input {...field} type="email" data-testid="input-email" placeholder={t.email} className={fieldClass(!!errors.email)} />
                  </FormControl>
                  <FormMessage className="text-red-600 text-xs font-medium" />
                </FormItem>
              )} />

              {/* Phone number with country code */}
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className={`flex h-11 rounded-lg border overflow-hidden transition-colors ${errors.phone ? "border-red-400 bg-red-50" : "border-gray-200 focus-within:border-amber-400"}`}>
                      <Select value={selectedPhoneCode} onValueChange={setSelectedPhoneCode}>
                        <SelectTrigger data-testid="select-phone-code" className="w-[5.5rem] h-full rounded-none border-0 border-r border-gray-200 bg-gray-50 focus:ring-0 text-sm font-medium px-2 shrink-0">
                          <span className="flex items-center gap-1 truncate">
                            <span>{PHONE_CODES.find(p => `${p.flag}${p.code}` === selectedPhoneCode)?.flag}</span>
                            <span className="text-xs">{selectedPhoneCode.replace(/[^+\d]/g, "")}</span>
                          </span>
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {PHONE_CODES.map((p) => (
                            <SelectItem key={`${p.flag}${p.code}`} value={`${p.flag}${p.code}`}>
                              <span className="flex items-center gap-1.5">
                                <span>{p.flag}</span>
                                <span className="font-medium">{p.code}</span>
                                <span className="text-gray-500 text-xs">{p.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        {...field}
                        type="tel"
                        inputMode="numeric"
                        data-testid="input-phone"
                        placeholder="Phone number"
                        className="flex-1 h-full bg-white text-sm px-3 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-600 text-xs font-medium" />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-country" className={`h-11 text-sm transition-colors ${errors.country ? "border-red-400 bg-red-50 focus:ring-red-200" : "border-gray-200 focus:border-amber-400 focus:ring-amber-200"}`}>
                        <SelectValue placeholder={t.selectCountry} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-56">
                      {countries.map((c) => <SelectItem key={c.value} value={c.label}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-600 text-xs font-medium" />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} type="password" data-testid="input-password" placeholder={t.password} className={fieldClass(!!errors.password)} />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs font-medium" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} type="password" data-testid="input-confirm-password" placeholder={t.confirmPassword} className={fieldClass(!!errors.confirmPassword)} />
                    </FormControl>
                    <FormMessage className="text-red-600 text-xs font-medium" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="referralCode" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Gift className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                      <Input
                        {...field}
                        data-testid="input-referral-code"
                        placeholder="Paste referral code here (e.g. CP-ABCD1234)"
                        autoComplete="off"
                        onKeyDown={(e) => {
                          const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
                          if (allowed.includes(e.key)) return;
                          if ((e.ctrlKey || e.metaKey) && ["v","a","c","x","z"].includes(e.key.toLowerCase())) return;
                          e.preventDefault();
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          const text = e.clipboardData.getData("text").trim().toUpperCase();
                          field.onChange(text);
                        }}
                        className="pl-9 pr-20 h-11 text-sm border-gray-200 focus:border-amber-400 focus-visible:ring-amber-200 font-mono tracking-wide"
                      />
                      {/* Paste button */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            field.onChange(text.trim().toUpperCase());
                          } catch {}
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 hover:bg-amber-100 transition-colors"
                      >
                        PASTE
                      </button>
                    </div>
                  </FormControl>
                  <p className="text-[10px] text-gray-400 mt-1 pl-1">Paste a referral code — typing is disabled to prevent guessing</p>
                  <FormMessage className="text-red-600 text-xs font-medium" />
                </FormItem>
              )} />

              {/* ── Terms & Privacy Policy Box ── */}
              <div className="rounded-xl border-2 border-amber-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-green-800 to-green-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="text-xs font-bold text-white">{t.privacyTitle}</span>
                  </div>
                  {hasReadTerms ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-300 bg-green-900/60 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> {t.termsReadBadge}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-300 font-medium">{t.termsMustContinue}</span>
                  )}
                </div>

                {/* Collapsed state */}
                {!termsOpen && (
                  <div className="p-4 bg-amber-50 flex flex-col items-center gap-2 text-center">
                    <p className="text-xs text-gray-600">{t.mustRead}</p>
                    <button type="button" onClick={openTerms} data-testid="button-read-terms"
                      className="mt-1 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow hover:from-amber-600 hover:to-amber-700 transition-all">
                      {t.readBtn}
                    </button>
                  </div>
                )}

                {/* Expanded scrollable content */}
                {termsOpen && (
                  <div>
                    <div
                      ref={scrollRef}
                      onScroll={handleScroll}
                      className="h-56 overflow-y-auto p-4 bg-white border-t border-amber-100"
                      data-testid="terms-scroll-area"
                    >
                      <TermsContent />
                    </div>
                    {/* Scroll progress indicator */}
                    <div className={`px-4 py-2 flex items-center gap-2 text-xs font-medium border-t transition-colors ${hasReadTerms ? "bg-green-50 border-green-200 text-green-700" : "bg-amber-50 border-amber-100 text-amber-700"}`}>
                      {hasReadTerms ? (
                        <><CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> {t.termsComplete}</>
                      ) : (
                        <><span className="animate-bounce inline-block">↓</span> {t.termsScroll}</>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Agreement Checkbox — locked until scrolled ── */}
              <FormField control={form.control} name="agreedToTerms" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className={`rounded-xl border-2 p-3.5 transition-all duration-300 ${hasReadTerms ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                      {!hasReadTerms && (
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{t.termsLocked}</span>
                        </div>
                      )}
                      <label className={`flex items-start gap-3 ${hasReadTerms ? "cursor-pointer" : "cursor-not-allowed"}`} data-testid="label-agree-terms">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={e => { if (hasReadTerms) field.onChange(e.target.checked); }}
                          disabled={!hasReadTerms}
                          data-testid="checkbox-agree-terms"
                          className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-green-700 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
                        />
                        <span className="text-xs text-gray-700 leading-relaxed">{t.termsAgree}</span>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-600 text-xs font-medium" />
                </FormItem>
              )} />

              <Button
                type="submit"
                data-testid="button-signup"
                disabled={mutation.isPending}
                className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
              >
                {mutation.isPending ? t.submitting : t.submit}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <p className="text-gray-500 text-sm">
              {t.alreadyHave}{" "}
              <Link href="/signin">
                <span className="text-amber-600 font-semibold hover:text-amber-700 cursor-pointer" data-testid="link-signin">{t.signIn}</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} use this code to update all of the sign up page with no mistake