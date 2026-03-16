'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowUp, Copy } from "lucide-react";
import { useUserStore } from "@/hooks/use-user-store";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";


export default function DashboardPage() {
  const { balance, referralCode } = useUserStore();
  const { user } = useUser();
  const { toast } = useToast();

  const getGreetingName = () => {
    if (user?.displayName) {
      return user.displayName.split(' ')[0];
    }
    return "Back";
  }

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/signup?ref=${referralCode}` 
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard.",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome {getGreetingName()}!</h1>
        <p className="text-muted-foreground">
          Here's a snapshot of your investment portfolio.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Gain/Loss</CardTitle>
            <ArrowUp className="h-4 w-4 text-growth" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-growth">+$1,250.45</div>
            <p className="text-xs text-muted-foreground">+1.8% today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Performer</CardTitle>
            <ArrowUp className="h-4 w-4 text-growth" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Bitcoin</div>
            <p className="text-xs text-muted-foreground">+5.2% today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refer & Earn</CardTitle>
          <CardDescription>Invite friends and earn rewards when they sign up and invest.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-grow p-2 border rounded-md bg-muted text-muted-foreground text-sm"
                />
                <Button onClick={handleCopy} size="icon">
                    <Copy className="w-4 h-4" />
                </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
