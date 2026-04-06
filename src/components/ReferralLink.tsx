'use client';

import { useToast } from "@/hooks/use-toast";
import { Share2, Copy, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export function ReferralLink({ referralCode }: { referralCode: string | null }) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const siteUrl = "https://coinpower-app.vercel.app";
    const referralLink = referralCode ? `${siteUrl}/signup?ref=${referralCode}` : null;

    const copyLink = () => {
        if (referralLink) {
            navigator.clipboard.writeText(referralLink);
            toast({
                title: "Referral link copied!",
                description: "You can now share it with your friends.",
            });
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        }
    };

    if (!referralLink) {
        return null;
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-600" />
                    Your Referral Link
                </h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Share your link with friends. When they sign up using your link, you'll earn a commission on their first investment!</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
                <p className="text-sm text-amber-700 font-mono truncate flex-1">{referralLink}</p>
                {copied ? (
                    <Button size="sm" variant="ghost" disabled className="h-8 px-2.5 text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Copied
                    </Button>
                ) : (
                    <Button size="sm" onClick={copyLink} className="h-8 px-2.5 bg-accent text-accent-foreground hover:bg-accent/90">
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                    </Button>
                )}
            </div>
        </div>
    );
}
