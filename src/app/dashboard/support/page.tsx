'use client';

import {
  LifeBuoy,
  MessageSquare,
  Mail,
  Send,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { SiTelegram } from 'react-icons/si';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const supportChannels = [
  {
    icon: SiTelegram,
    title: 'Telegram Community',
    description: 'Join our active community for quick help from staff and other investors. Get real-time announcements and support.',
    action: 'Join Channel',
    href: 'https://t.me/coinpow_group',
    color: 'from-sky-400 to-blue-500',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'For account-specific issues or detailed inquiries, please email our support team. We aim to respond within 24 hours.',
    action: 'Send Email',
    href: 'mailto:support@coinpower.com',
    color: 'from-amber-400 to-orange-500',
  },
  {
    icon: BookOpen,
    title: 'FAQ & Guides',
    description: 'Find answers to common questions about deposits, withdrawals, generators, and more in our frequently asked questions.',
    action: 'View FAQs',
    href: '#faq',
    color: 'from-green-400 to-emerald-500',
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

export default function SupportPage() {
  return (
    <div className="pt-12 pb-20 min-h-screen bg-[#f7f9f4]">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-block p-4 bg-primary/10 rounded-2xl mb-4">
            <LifeBuoy className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Support Center
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            We're here to help. Find the best way to get support below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {supportChannels.map((channel) => (
            <div
              key={channel.title}
              className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col"
            >
              <div
                className={`p-5 bg-gradient-to-br ${channel.color} text-white flex items-center gap-4`}
              >
                <channel.icon className="w-8 h-8 opacity-80" />
                <h3 className="text-lg font-bold">{channel.title}</h3>
              </div>
              <div className="p-5 flex-grow">
                <p className="text-sm text-muted-foreground">
                  {channel.description}
                </p>
              </div>
              <div className="p-5 mt-auto">
                <Button
                  asChild
                  className="w-full bg-accent hover:bg-accent/90"
                >
                  <a href={channel.href} target={channel.href.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer">
                    {channel.action}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div id="faq" className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mt-1">
              Quick answers to common questions.
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full bg-card p-4 rounded-xl border shadow-sm">
            {faqs.map((faq, index) => (
              <AccordionItem value={`item-${index}`} key={index}>
                <AccordionTrigger className="text-left font-semibold text-gray-800 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
