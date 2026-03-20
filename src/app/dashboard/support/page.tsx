

'use client';

import {
  LifeBuoy,
  MessageSquare,
  Mail,
  Send,
  BookOpen,
  ChevronRight,
  UserPlus,
  Smartphone,
  CheckCircle,
  Zap,
  TrendingUp,
  ArrowDownToLine,
  Copy,
  Info,
  Clock,
  DollarSign,
  Shield,
  Star,
  Play
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const DEPOSIT_PHONE = "+233592682060";
const DEPOSIT_NAME = "M.F";
const USDT_ADDRESS = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";

const steps = [
  {
    num: 1,
    icon: UserPlus,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50",
    borderColor: "border-blue-200",
    title: "Create Your Account",
    subtitle: "Sign up in under 1 minute",
    details: [
      "Go to the Sign Up page",
      "Enter your full name, email, username, and country",
      "Create a strong password",
      "Tap Create Account — you're in!",
    ],
    tip: "Already have an account? Just tap Sign In and enter your username and password.",
    tipIcon: Info,
    action: { label: "Go to Sign Up", href: "/signup" },
  },
  {
    num: 2,
    icon: Smartphone,
    color: "from-yellow-400 to-amber-500",
    bgLight: "bg-amber-50",
    borderColor: "border-amber-200",
    title: "Make a Deposit",
    subtitle: "Fund your account via MTN MOMO or USDT",
    details: [
      "Tap the Bank tab at the bottom of the screen",
      "Select Deposit, then choose MTN MOMO or USDT",
      "Send your money to the details below",
      "Copy your Transaction ID from the confirmation SMS or receipt",
      "Enter the amount and Transaction ID in the app and tap Submit",
    ],
    tip: "Keep your Transaction ID safe — you'll need it to confirm your deposit.",
    tipIcon: Info,
    momo: { name: DEPOSIT_NAME, phone: DEPOSIT_PHONE },
    usdt: USDT_ADDRESS,
    action: { label: "Go to Bank", href: "/dashboard/bank" },
  },
  {
    num: 3,
    icon: Clock,
    color: "from-orange-400 to-red-500",
    bgLight: "bg-orange-50",
    borderColor: "border-orange-200",
    title: "Wait for Approval",
    subtitle: "Admin reviews your deposit (1–24 hours)",
    details: [
      "After submitting, your deposit shows as Pending",
      "Our team verifies the payment on our end",
      "Once approved, your balance is credited automatically",
      "You'll see the updated balance in the dashboard",
    ],
    tip: "Most deposits are approved within a few hours. Check the Bank page to see your deposit status.",
    tipIcon: Clock,
    action: null,
  },
  {
    num: 4,
    icon: Zap,
    color: "from-green-400 to-emerald-600",
    bgLight: "bg-green-50",
    borderColor: "border-green-200",
    title: "Rent a Generator",
    subtitle: "Choose a generator from the Market",
    details: [
      "Go to the Market tab at the bottom",
      "Browse available generators like PG1 (FREE), PG2, PG3, or PG4",
      "Each generator shows its daily income and total income for the period",
      "Tap the Activate / Rent button to start earning",
    ],
    tip: "PG1 is completely FREE — perfect to start earning with $0 investment!",
    tipIcon: Star,
    action: { label: "Go to Market", href: "/dashboard/market" },
  },
  {
    num: 5,
    icon: TrendingUp,
    color: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-50",
    borderColor: "border-emerald-200",
    title: "Collect Your Daily Income",
    subtitle: "Manually collect earnings every 24 hours",
    details: [
      "Go to the Power tab to see your active generators.",
      "Your generator calculates income 24/7, but you must collect it.",
      "A 'Collect' button will appear for each generator once 24 hours of income is ready.",
      "Click 'Collect' to add the earnings to your main account balance.",
      "If you miss a day, the income accumulates. You can collect multiple days' worth at once."
    ],
    tip: "You must log in and manually click 'Collect' for each generator. Income does NOT credit to your balance automatically.",
    tipIcon: CheckCircle,
    action: { label: "Go to Power", href: "/dashboard/power" },
  },
  {
    num: 6,
    icon: ArrowDownToLine,
    color: "from-purple-500 to-pink-600",
    bgLight: "bg-purple-50",
    borderColor: "border-purple-200",
    title: "Withdraw Your Earnings",
    subtitle: "Cash out anytime",
    details: [
      "Go to Bank → Withdraw tab",
      "Enter the amount you want to withdraw",
      "Choose MTN MOMO or USDT as your payout method",
      "Enter your phone number or wallet address",
      "A 15% processing fee is deducted automatically",
      "Funds are sent within 1–24 hours",
    ],
    tip: "15% withdrawal fee applies. Example: withdraw $10, receive $8.50.",
    tipIcon: DollarSign,
    action: { label: "Go to Bank", href: "/dashboard/bank" },
  },
];

const faqs = [
  {
    question: 'How do I deposit funds into my account?',
    answer:
      'Go to the "Bank" page and click "Deposit Funds". Choose your preferred payment method (MTN MoMo, USDT, Card) and follow the on-screen instructions. Make sure to enter the correct transaction ID after you have sent the funds.',
  },
  {
    question: 'How long do withdrawals take to process?',
    answer:
      'Withdrawals are processed Monday through Saturday, typically within 1 to 24 hours. Requests made on a Sunday are queued and processed on Monday. If your withdrawal takes longer than 24 hours on a business day, please contact support.',
  },
  {
    question: 'Is my investment and personal information secure?',
    answer:
      'Yes. We use industry-standard encryption and security protocols to protect all user data. Our platform is compliant with financial regulations, and we implement features like a mandatory withdrawal PIN to prevent unauthorized access to your funds.',
  },
  {
    question: 'How does the referral program work?',
    answer:
      'You can find your unique referral link in your main Dashboard. When a new user signs up using your link and rents their first paid generator, you will receive a 10% commission based on the price of that generator, credited directly to your balance.',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-semibold"
    >
      {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SupportPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setIsUserLoading(false);
    };
    fetchUser();
  }, []);

  return (
    <div className="pb-24 min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-500 to-amber-700 px-4 py-8 text-center shadow-lg">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-amber-100 text-xs font-semibold uppercase tracking-widest">Step-by-Step Guide</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">How to Deposit &amp; Start Earning</h1>
        <p className="text-amber-100 text-sm max-w-md mx-auto">
          Follow these simple steps to fund your account and start generating daily income with CoinPower.
        </p>
        <div className="flex items-center justify-center gap-4 mt-4">
          {[
            { icon: Shield, label: "Secure" },
            { icon: Zap, label: "Easy Setup" },
            { icon: TrendingUp, label: "Daily Income" },
          ].map(function({ icon: Icon, label }) { return (
            <div key={label} className="flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
              <Icon className="w-3.5 h-3.5 text-amber-200" />
              <span className="text-white text-xs font-semibold">{label}</span>
            </div>
          ); })}
        </div>

        {/* Watch cartoon video button */}
        <div className="mt-5">
          <Link href="/dashboard/video-tutorial">
            <button
              data-testid="button-watch-video-tutorial"
              className="inline-flex items-center gap-2.5 bg-white text-amber-600 font-black text-sm rounded-full px-6 py-3 shadow-lg hover:bg-amber-50 hover:scale-105 transition-all active:scale-95"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center">
                <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
              </div>
              Watch Cartoon Tutorial
            </button>
          </Link>
          <p className="text-amber-200 text-[11px] mt-2">14 animated scenes • tap to play</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Progress indicator */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-gray-500 text-xs font-medium">{steps.length} easy steps to get started</p>
          <div className="flex gap-1">
            {steps.map(function(s) { return (
              <div key={s.num} className={`w-5 h-1.5 rounded-full bg-gradient-to-r ${s.color}`} />
            ); })}
          </div>
        </div>

        {/* Steps */}
        {steps.map(function(step) {
          const Icon = step.icon;
          const TipIcon = step.tipIcon;
          return (
            <div key={step.num} className={`bg-white rounded-2xl border-2 ${step.borderColor} shadow-sm overflow-hidden`}>
              {/* Step header */}
              <div className={`bg-gradient-to-r ${step.color} p-4 flex items-center gap-3`}>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Step {step.num}</span>
                  </div>
                  <h2 className="text-white font-black text-base leading-tight">{step.title}</h2>
                  <p className="text-white/80 text-xs">{step.subtitle}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-lg">{step.num}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Steps list */}
                <ul className="space-y-2.5">
                  {step.details.map(function(d, i) { return (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <span className="text-white text-[10px] font-black">{i + 1}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{d}</p>
                    </li>
                  ); })}
                </ul>

                {/* MTN MOMO details (Step 2 only) */}
                {step.momo && (
                  <div className="space-y-3">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Payment Details</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-2">
                      <p className="text-yellow-800 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5" /> MTN MOMO
                      </p>
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-yellow-100">
                        <div>
                          <p className="text-gray-400 text-[10px]">Account Name</p>
                          <p className="font-bold text-gray-900 text-sm">{DEPOSIT_NAME}</p>
                        </div>
                        <CopyButton text={DEPOSIT_NAME} />
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-yellow-100">
                        <div>
                          <p className="text-gray-400 text-[10px]">MOMO Number</p>
                          <p className="font-bold text-gray-900 text-sm font-mono">{DEPOSIT_PHONE}</p>
                        </div>
                        <CopyButton text={DEPOSIT_PHONE} />
                      </div>
                    </div>

                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 space-y-2">
                      <p className="text-teal-800 text-xs font-bold uppercase tracking-wide">USDT (TRC20)</p>
                      <div className="bg-white rounded-lg px-3 py-2 border border-teal-100">
                        <p className="text-gray-400 text-[10px] mb-1">Wallet Address</p>
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-mono text-xs text-gray-900 font-bold break-all">{USDT_ADDRESS}</p>
                          <CopyButton text={USDT_ADDRESS} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Tip box */}
                <div className={`${step.bgLight} border ${step.borderColor} rounded-xl p-3 flex items-start gap-2`}>
                  <TipIcon className="w-4 h-4 flex-shrink-0 mt-0.5 text-gray-600" />
                  <p className="text-gray-700 text-xs leading-relaxed">{step.tip}</p>
                </div>

                {/* CTA button */}
                {step.action && (
                  <Link href={step.action.href}>
                    <Button className={`w-full bg-gradient-to-r ${step.color} text-white font-bold rounded-xl h-10 text-sm flex items-center justify-center gap-2 shadow-md`}>
                      {step.action.label} <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {/* Final CTA */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-6 text-center shadow-lg">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-white font-black text-xl mb-1">You're Ready to Earn!</h3>
          <p className="text-amber-100 text-sm mb-4">Start with PG1 Generator for free and grow your investment from there.</p>
          <div className="flex gap-3">
            {user ? (
              <>
                <Link href="/dashboard/bank" className="flex-1">
                  <Button className="w-full bg-white text-amber-700 font-bold rounded-xl h-11 text-sm hover:bg-amber-50">
                    Deposit Now
                  </Button>
                </Link>
                <Link href="/dashboard/market" className="flex-1">
                  <Button className="w-full bg-amber-800/40 border border-white/30 text-white font-bold rounded-xl h-11 text-sm hover:bg-amber-800/60">
                    Get Free PG1
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/signup" className="flex-1">
                <Button className="w-full bg-white text-amber-700 font-bold rounded-xl h-11 text-sm hover:bg-amber-50">
                  Create Free Account
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Help */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-gray-500 text-sm">Need help? Contact our support manager</p>
          <a href="https://t.me/coinpow_group" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 text-sky-600 font-bold text-sm hover:text-sky-800 transition-colors">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Contact us on Telegram
          </a>
        </div>

        <div id="faq" className="pt-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Quick answers to common questions.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full bg-card p-4 rounded-xl border shadow-sm">
            {faqs.map(function(faq, index) { return (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-left font-semibold text-gray-800 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ); })}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
