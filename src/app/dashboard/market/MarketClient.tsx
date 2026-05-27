"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  Wallet,
  ArrowDownToLine
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { rentGeneratorAction } from "./actions";
import { cn } from "@/lib/utils";

interface Generator {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  price: number;
  expire_days: number;
  daily_income: number;
  roi: string;
  period: string;
  min_invest: string;
  max_invest: string;
  investors: string;
  image_url?: string;
}

interface MarketClientProps {
  generators: Generator[];
  userBalance: number;
  rentedCounts: Record<string, number>;
}

export default function MarketClient({ generators, userBalance, rentedCounts }: MarketClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isRenting, setIsRenting] = useState<string | null>(null);
  const [lowBalanceGen, setLowBalanceGen] = useState<Generator | null>(null);

  const handleRent = async (gen: Generator) => {
    if (userBalance < gen.price) {
      setLowBalanceGen(gen);
      return;
    }

    setIsRenting(gen.id);
    try {
      const result = await rentGeneratorAction(gen.id);
      
      if (result.error) {
        if (result.error === "insufficient_funds") {
          setLowBalanceGen(gen);
        } else {
          toast({
            variant: "destructive",
            title: "Action Restricted",
            description: result.error, // This will display "you reached your pg2 limit please upgrade"
          });
        }
      } else {
        toast({
          title: "Success!",
          description: `You have successfully rented the ${gen.name}.`,
        });
        router.refresh();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsRenting(null);
    }
  };

  const getCardStyle = (color: string) => {
    switch (color) {
      case "from-amber-400 to-orange-500":
        return { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-700", icon: "bg-amber-100" };
      case "from-green-400 to-emerald-600":
        return { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-700", icon: "bg-green-100" };
      case "from-blue-400 to-indigo-600":
        return { bg: "from-blue-50 to-indigo-50", border: "border-blue-200", text: "text-blue-700", icon: "bg-blue-100" };
      case "from-purple-500 to-pink-600":
        return { bg: "from-purple-50 to-pink-50", border: "border-purple-200", text: "text-purple-700", icon: "bg-purple-100" };
      default:
        return { bg: "from-slate-50 to-slate-100", border: "border-slate-200", text: "text-slate-700", icon: "bg-slate-100" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-4 sm:py-8">
        <Badge className="mb-2 bg-amber-100 text-amber-700 border-0 px-3 py-1">
          <TrendingUp className="w-3 h-3 mr-1" />Live Market
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">
          Investment <span className="text-amber-600">Generators</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto">Rent a generator and claim daily income every 24 hours.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
        {generators.map((gen) => {
          const style = getCardStyle(gen.color);
          const count = rentedCounts[gen.id] || 0;
          let max = gen.id === 'pg1' ? 1 : (gen.id === 'pg2' ? 2 : 999);
          const isMaxed = count >= max;

          return (
            <div 
              key={gen.id} 
              className={cn(
                "group relative bg-white rounded-3xl border-2 transition-all duration-300 overflow-hidden flex flex-col",
                style.border,
                isMaxed ? "opacity-75 grayscale-[0.5]" : "hover:shadow-2xl hover:-translate-y-1"
              )}
            >
              {/* Header */}
              <div className={cn("bg-gradient-to-r p-6", style.bg)}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-black text-xl text-gray-900 leading-tight">{gen.name}</h3>
                    <p className="text-gray-500 text-sm font-medium">{gen.subtitle}</p>
                  </div>
                  <div className={cn("p-3 rounded-2xl shadow-sm bg-white", style.text)}>
                    <span className="text-2xl">{gen.icon}</span>
                  </div>
                </div>

                {/* Image Placeholder or Actual Image */}
                <div className="w-full h-48 rounded-2xl bg-white/50 backdrop-blur-sm flex items-center justify-center mb-4 border border-white/50 overflow-hidden">
                  {gen.image_url ? (
                    <img src={gen.image_url} alt={gen.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <Zap className={cn("w-12 h-12 opacity-20", style.text)} />
                  )}
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Daily Profit</p>
                    <p className={cn("text-2xl font-black", style.text)}>${gen.daily_income.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Period</p>
                    <p className="text-gray-900 font-bold">{gen.expire_days} Days</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Total ROI</p>
                      <p className="text-sm font-bold text-gray-800">{gen.roi}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Investors</p>
                      <p className="text-sm font-bold text-gray-800">{gen.investors}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-gray-400 text-xs font-bold uppercase">Price</p>
                      <p className="text-2xl font-black text-gray-900">
                        {gen.price === 0 ? "FREE" : `$${gen.price.toLocaleString()}`}
                      </p>
                    </div>
                    {isMaxed && (
                      <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                        Limit Reached
                      </Badge>
                    )}
                  </div>

                  <Button 
                    onClick={() => handleRent(gen)}
                    disabled={isMaxed || isRenting === gen.id}
                    className={cn(
                      "w-full h-12 rounded-xl font-bold text-base transition-all",
                      isMaxed 
                        ? "bg-gray-100 text-gray-400 border-2 border-gray-200" 
                        : "bg-gray-900 hover:bg-black text-white shadow-lg active:scale-[0.98]"
                    )}
                  >
                    {isRenting === gen.id ? (
                      "Processing..."
                    ) : isMaxed ? (
                      "Maximum Limit Reached"
                    ) : (
                      gen.price === 0 ? "Activate Free Plan" : "Rent Now"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Low Balance Dialog */}
      <Dialog open={!!lowBalanceGen} onOpenChange={(open) => { if (!open) setLowBalanceGen(null) }}>
        <DialogContent className="max-w-sm mx-auto rounded-2xl p-0 overflow-hidden">
          <div className="bg-white p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8 text-red-600" />
            </div>
            <DialogTitle className="text-gray-900 text-xl font-black mb-1">Insufficient Balance</DialogTitle>
            <DialogDescription className="text-gray-500 text-sm">
              You don't have enough funds to rent this generator.
            </DialogDescription>
          </div>
          <div className="p-6 bg-gray-50 space-y-4">
            {lowBalanceGen && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Required</span>
                  <span className="font-bold text-gray-900">${lowBalanceGen.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Your Balance</span>
                  <span className="font-bold text-gray-900">${userBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLowBalanceGen(null)} className="flex-1 rounded-xl">
                Cancel
              </Button>
              <Button 
                onClick={() => { setLowBalanceGen(null); router.push("/dashboard/bank"); }}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
              >
                Deposit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
