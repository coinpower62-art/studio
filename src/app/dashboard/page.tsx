
'use client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { DollarSign, ArrowUp } from "lucide-react";
import { MarketSnapshot } from "./components/market-snapshot";
import { PerformanceChart } from "./components/performance-chart";
import { WinnersScroll } from "./components/winners-scroll";
import { ReferralProgress } from "./components/referral-progress";
import { useUserStore } from "@/hooks/use-user-store";
import { useUser } from "@/firebase";

export default function DashboardPage() {
  const { balance } = useUserStore();
  const { user } = useUser();

  const getGreetingName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    return "Back";
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
        <Card className="shadow-md">
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
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Gain/Loss</CardTitle>
            <ArrowUp className="h-4 w-4 text-growth" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-growth">+$1,250.45</div>
            <p className="text-xs text-muted-foreground">+1.8% today</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <PerformanceChart />
        </div>
        <div className="lg:col-span-2">
          <MarketSnapshot />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <WinnersScroll />
        <ReferralProgress />
      </div>
    </div>
  );
}

    