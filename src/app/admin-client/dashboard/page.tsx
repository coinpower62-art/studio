
'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, DollarSign, RefreshCw, CheckCircle, XCircle, LogOut, Phone, Mail, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { adminHandleDeposit } from "@/app/admin/dashboard/actions";
import { cn } from "@/lib/utils";

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
        toast({ title: `Deposit ${action === 'approve' ? 'Approved' : 'Rejected'}` });
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
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-slate-800 pb-6">
         <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><Shield className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="font-black text-2xl tracking-tight leading-none">Admin Client</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">Deposit Management System</p>
            </div>
         </div>
         <div className="flex gap-2 w-full sm:w-auto">
             <Button onClick={fetchData} variant="outline" className="bg-slate-800 border-slate-700 flex-1 sm:flex-none">
                <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Refresh
             </Button>
             <Button onClick={handleSignOut} variant="ghost" className="text-red-400">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
             </Button>
         </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deposits.map(d => (
            <div key={d.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                             <span className="font-black text-white truncate text-lg">{d.profiles?.full_name || d.profiles?.username || 'User'}</span>
                             <Badge className={cn(
                                "text-[10px] font-bold uppercase",
                                d.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400 border-yellow-700' : 
                                d.status === 'approved' ? 'bg-green-900/40 text-green-400 border-green-700' : 
                                'bg-red-900/40 text-red-400 border-red-700'
                             )} variant="outline">{d.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate"><Mail className="w-3.5 h-3.5 text-blue-400" /> {d.profiles?.email}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-blue-400" /> {d.profiles?.phone || 'No phone'}</p>
                    </div>
                    <div className="text-right ml-3">
                        <p className="text-2xl font-black text-green-400 leading-none">${d.amount.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">GH₵ {(d.amount * 10).toLocaleString()}</p>
                    </div>
                </div>
                
                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 space-y-2">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-amber-500" /> Transaction ID
                    </p>
                    <p className="text-sm text-amber-500 font-mono font-black break-all leading-tight">{d.tx_id}</p>
                </div>
                
                {d.status === 'pending' && (
                    <div className="flex gap-3 pt-2">
                        <Button onClick={() => handleAction(d.id, 'approve', d.user_id, d.amount)} 
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11 shadow-lg shadow-green-900/20">
                          <CheckCircle className="w-4 h-4 mr-2" /> APPROVE
                        </Button>
                        <Button onClick={() => handleAction(d.id, 'reject', d.user_id, d.amount)} 
                          variant="destructive" className="flex-1 font-bold h-11 shadow-lg shadow-red-900/20">
                          <XCircle className="w-4 h-4 mr-2" /> REJECT
                        </Button>
                    </div>
                )}

                <div className="flex justify-between items-center mt-1 border-t border-slate-700/50 pt-3">
                    <p className="text-[10px] text-slate-500 font-medium">Request Date:</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(d.created_at).toLocaleString()}</p>
                </div>
            </div>
        ))}
        
        {deposits.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center bg-slate-800/30 rounded-3xl border-2 border-dashed border-slate-700">
                <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-bold text-lg">No deposit requests to display.</p>
                <p className="text-slate-600 text-sm mt-1">Pending requests will appear here in real-time.</p>
            </div>
        )}
      </div>
    </div>
  );
}
