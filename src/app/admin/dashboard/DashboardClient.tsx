
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, DollarSign, LogOut, Search, Edit3, Trash2,
  CheckCircle, XCircle, BarChart3, Zap,
  ArrowUpFromLine, RefreshCw, Save, X, Lock, Unlock, DatabaseZap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminGetAllData,
  adminUpdateUserBalance,
  adminDeleteUser,
  adminHandleDeposit,
  adminHandleWithdrawal,
  adminMutateGenerator,
  adminToggleWithdrawalLock,
} from "./actions";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "generators";

export function DashboardClient({ initialData }: { initialData: any }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const [users, setUsers] = useState<any[]>(initialData.users || []);
  const [generators, setGenerators] = useState<any[]>(initialData.generators || []);
  const [deposits, setDeposits] = useState<any[]>(initialData.deposits || []);
  const [withdrawals, setWithdrawals] = useState<any[]>(initialData.withdrawals || []);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [editBalance, setEditBalance] = useState("");

  const fetchData = async () => {
      setLoading(true);
      const result = await adminGetAllData();
      if (!result.error && result.data) {
        setUsers(result.data.users);
        setGenerators(result.data.generators);
        setDeposits(result.data.deposits);
        setWithdrawals(result.data.withdrawals);
      }
      setLoading(false);
  }

  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleUpdateBalance = async (userId: string) => {
    const amt = parseFloat(editBalance);
    if (isNaN(amt)) return;
    const res = await adminUpdateUserBalance(userId, amt);
    if(res.success) { 
        toast({ title: 'Balance updated' }); 
        setEditingUser(null);
        fetchData(); 
    }
  }

  const filteredUsers = users.filter(u => [u.full_name, u.username, u.email].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === "pending" || w.status === "processing").length;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex w-full">
      <aside className="w-64 border-r border-slate-800 p-4 space-y-4 hidden md:block flex-shrink-0">
        <div className="flex items-center gap-2 mb-8">
          <Shield className="text-amber-500 w-6 h-6" />
          <span className="font-black text-lg">Admin Panel</span>
        </div>
        <nav className="space-y-1">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "users", label: "Users", icon: Users },
            { id: "deposits", label: "Deposits", icon: DollarSign },
            { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
            { id: "generators", label: "Generators", icon: Zap },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors", tab === t.id ? "bg-slate-800 text-amber-50" : "text-slate-400 hover:bg-slate-800")}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="pt-8">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-black">Dashboard Overview</h1>
                <Button onClick={fetchData} variant="outline" size="sm" className="bg-slate-800 border-slate-700 h-8 gap-2"><RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Refresh</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <Users className="w-6 h-6 text-blue-500 mb-2" />
                <p className="text-2xl font-black">{users.length}</p>
                <p className="text-slate-400 text-xs uppercase font-bold">Total Users</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <DollarSign className="w-6 h-6 text-green-500 mb-2" />
                <p className="text-2xl font-black">${totalBalance.toFixed(2)}</p>
                <p className="text-slate-400 text-xs uppercase font-bold">Total Balance</p>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <ArrowUpFromLine className="w-6 h-6 text-amber-500 mb-2" />
                <p className="text-2xl font-black">{pendingWithdrawalsCount}</p>
                <p className="text-slate-400 text-xs uppercase font-bold">Pending Payouts</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h1 className="text-xl font-black">User Accounts</h1>
                <div className="relative w-64">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                   <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-slate-800 border-slate-700 pl-9" />
                </div>
             </div>
             <div className="space-y-3">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                        <p className="font-bold">{u.full_name || u.username}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-green-400 font-black">${u.balance?.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{u.country}</p>
                        </div>
                    </div>
                    {editingUser === u.id ? (
                        <div className="flex gap-2 p-2 bg-slate-900 rounded-xl border border-slate-700">
                            <Input value={editBalance} onChange={e => setEditBalance(e.target.value)} type="number" step="0.01" className="h-8 bg-slate-800 border-slate-700" />
                            <Button size="sm" onClick={() => handleUpdateBalance(u.id)} className="h-8 bg-green-600 hover:bg-green-700"><Save className="w-3 h-3" /></Button>
                            <Button size="sm" onClick={() => setEditingUser(null)} variant="ghost" className="h-8"><X className="w-3 h-3" /></Button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                             <Button variant="outline" size="sm" onClick={() => { setEditingUser(u.id); setEditBalance(u.balance); }} className="bg-slate-700 border-slate-600 h-8 flex-1">Edit Balance</Button>
                             <Button variant="outline" size="sm" onClick={async () => {
                                 const res = await adminToggleWithdrawalLock(u.id, !u.withdrawal_locked);
                                 if (res.success) fetchData();
                             }} className={cn("h-8 px-3 border-slate-600", u.withdrawal_locked ? "text-red-400 bg-red-950/20" : "text-slate-400 bg-slate-700")}>
                                {u.withdrawal_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                             </Button>
                             <Button variant="outline" size="sm" onClick={() => { if(confirm('Delete user?')) adminDeleteUser(u.id).then(fetchData) }} className="h-8 px-3 border-red-900/50 bg-red-950/20 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}

        {tab === 'generators' && (
           <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-black">Generator Factory</h1>
                <Button onClick={() => adminMutateGenerator('seed', []).then(fetchData)} variant="outline" size="sm" className="bg-slate-800 border-slate-700 h-8 gap-2">
                    <DatabaseZap className="w-3 h-3" /> Reset Defaults
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generators.map(g => (
                  <div key={g.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-amber-500">{g.name}</p>
                        <p className="text-xs text-slate-400">${g.price} rent · ${g.daily_income}/day</p>
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-400">{g.id.toUpperCase()}</Badge>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Lifetime Limit: {g.max_rentals || (g.id === 'pg2' ? 2 : 1)}</p>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="outline" className="flex-1 h-8 text-xs bg-slate-700 border-slate-600" onClick={() => {
                           const newLimit = prompt("Set Lifetime Limit (Max Rentals):", g.max_rentals || 1);
                           if (newLimit !== null) adminMutateGenerator('update', { id: g.id, max_rentals: parseInt(newLimit) }).then(fetchData);
                       }}>Update Limit</Button>
                       <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => adminMutateGenerator('update', { id: g.id, published: !g.published }).then(fetchData)}
                        className={cn("h-8 px-3 border-slate-600", g.published ? "text-green-400 bg-green-950/20" : "text-slate-400 bg-slate-700")}
                       >
                         {g.published ? "Active" : "Hidden"}
                       </Button>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        )}
        
        {(tab === 'deposits' || tab === 'withdrawals') && (
          <div className="space-y-4">
            <h1 className="text-xl font-black capitalize">{tab} Requests</h1>
            <div className="space-y-3">
                {(tab === 'deposits' ? deposits : withdrawals).map(r => (
                    <div key={r.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                        <div className="flex justify-between items-start mb-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold truncate">{users.find(u => u.id === r.user_id)?.full_name || users.find(u => u.id === r.user_id)?.username || 'User ID: ' + r.user_id.slice(0,8)}</p>
                                <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</p>
                            </div>
                            <div className="text-right ml-3">
                                <p className="text-lg font-black text-white">${r.amount}</p>
                                <Badge className={cn(
                                    "text-[10px] uppercase font-bold",
                                    r.status === 'approved' || r.status === 'complete' ? "bg-green-900/40 text-green-400 border-green-700" :
                                    r.status === 'pending' || r.status === 'processing' ? "bg-yellow-900/40 text-yellow-400 border-yellow-700" :
                                    "bg-red-900/40 text-red-400 border-red-700"
                                )}>{r.status}</Badge>
                            </div>
                        </div>
                        {r.status === 'pending' || r.status === 'processing' ? (
                            <div className="flex gap-2 border-t border-slate-700 pt-3">
                                <Button size="sm" onClick={() => {
                                    if(tab === 'deposits') adminHandleDeposit(r.id, 'approve', r.user_id, r.amount).then(fetchData);
                                    else adminHandleWithdrawal(r.id, 'complete', r.user_id, r.amount).then(fetchData);
                                }} className="flex-1 bg-green-600 hover:bg-green-700 font-bold">APPROVE</Button>
                                <Button size="sm" onClick={() => {
                                    if(tab === 'deposits') adminHandleDeposit(r.id, 'reject').then(fetchData);
                                    else adminHandleWithdrawal(r.id, 'reject', r.user_id, r.amount).then(fetchData);
                                }} variant="destructive" className="flex-1 font-bold">REJECT</Button>
                            </div>
                        ) : null}
                    </div>
                ))}
                {(tab === 'deposits' ? deposits : withdrawals).length === 0 && <p className="text-center text-slate-500 py-10">No {tab} found.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
