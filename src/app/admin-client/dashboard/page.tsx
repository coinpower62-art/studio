
'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, DollarSign, RefreshCw, CheckCircle, XCircle, LogOut, Phone, Mail, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminHandleDeposit } from "@/app/admin/dashboard/actions";

export default function AdminClientDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('deposit_requests')
        .select('*, profiles(email, phone, full_name, username)')
        .order('created_at', { ascending: false });

    if (error) {
        toast({ title: "Fetch Error", description: error.message, variant: "destructive" });
    } else {
        setDeposits(data || []);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    const isLoggedIn = document.cookie.includes('admin_client_logged_in=true');
    if (!isLoggedIn) { router.push('/login'); return; }
    fetchData();
  }, [fetchData, router]);

  const handleAction = async (id: string, action: 'approve' | 'reject', userId: string, amount: number) => {
    const res = await adminHandleDeposit(id, action, userId, amount);
    if (res.success) {
        toast({ title: `Deposit ${action}ed` });
        fetchData();
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleSignOut = () => {
    document.cookie = "admin_client_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Shield className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="font-black text-xl tracking-tight leading-none">Admin Client</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Deposit Approvals</p>
            </div>
         </div>
         <div className="flex gap-2">
             <Button onClick={fetchData} variant="outline" size="sm" className="bg-slate-800 border-slate-700 h-9">
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
             </Button>
             <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-red-400 h-9"><LogOut className="w-4 h-4 mr-2" /> Sign Out</Button>
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deposits.map(d => (
            <div key={d.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                             <span className="font-black text-white truncate max-w-[120px]">{d.profiles?.full_name || d.profiles?.username}</span>
                             <Badge className={cn(
                                d.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400' : 
                                d.status === 'approved' ? 'bg-green-900/40 text-green-400' : 
                                'bg-red-900/40 text-red-400'
                             )}>{d.status.toUpperCase()}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" /> {d.profiles?.email}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" /> {d.profiles?.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-black text-green-400">${d.amount.toFixed(2)}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Transaction ID</p>
                    <p className="text-xs text-amber-500 font-mono font-bold break-all">{d.tx_id}</p>
                </div>
                
                {d.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                        <Button onClick={() => handleAction(d.id, 'approve', d.user_id, d.amount)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-10"><CheckCircle className="w-4 h-4 mr-2" /> APPROVE</Button>
                        <Button onClick={() => handleAction(d.id, 'reject', d.user_id, d.amount)} variant="destructive" className="flex-1 font-bold h-10"><XCircle className="w-4 h-4 mr-2" /> REJECT</Button>
                    </div>
                )}
            </div>
        ))}
        {deposits.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-700">
                <p className="text-slate-500 font-medium">No deposit requests to display.</p>
            </div>
        )}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
