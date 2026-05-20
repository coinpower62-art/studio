'use client';

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Users, DollarSign, LogOut, Edit3, Trash2, Plus,
  CheckCircle, RefreshCw, Menu, X, ArrowUpRight, AlertTriangle, CreditCard,
  ArrowDownToLine, ArrowUpFromLine, Zap, Layers, Image as ImageIcon
} from "lucide-react";
import {
  adminGetAllData,
  adminUpdateUserBalance,
  adminHandleDeposit,
  adminHandleWithdrawal,
  adminMutateGenerator
} from "./actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "generators";

type UserRecord = {
  id: string;
  created_at: string;
  full_name: string | null;
  username: string | null;
  email: string;
  country: string | null;
  balance: number;
};

type GeneratorRecord = {
    id: string;
    name: string;
    subtitle: string;
    price: number;
    daily_income: number;
    expire_days: number;
    max_rentals: number;
    published: boolean;
    color: string;
    image_url?: string;
    roi: string;
    investors: string;
};

type DepositRequest = {
  id: string; user_id: string;
  amount: number; tx_id: string; status: "pending" | "approved" | "rejected"; created_at: string;
};

type WithdrawalRecord = {
  id: string; user_id: string; country: string;
  method: string; amount: number; net_amount: number; fee: number;
  status: "pending" | "processing" | "complete" | "rejected"; created_at: string;
};

const getUserDisplayName = (u: UserRecord | null | undefined) => {
  if (!u) return '—';
  return u.full_name || u.username || u.email || 'Unknown User';
};

export default function DashboardClient() {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [generators, setGenerators] = useState<GeneratorRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await adminGetAllData();
    if (result.error || !result.data) {
      toast({ title: 'Error fetching data', description: result.error, variant: 'destructive' });
    } else {
      setUsers(result.data.users || []);
      setDeposits(result.data.deposits || []);
      setWithdrawals(result.data.withdrawals || []);
      setGenerators(result.data.generators || []);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");

  const [genModalOpen, setGenModalOpen] = useState(false);
  const [editingGen, setEditingGen] = useState<Partial<GeneratorRecord> | null>(null);

  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleUpdateBalance = async (userId: string, balance: number) => {
    const res = await adminUpdateUserBalance(userId, balance);
    if (res.error) toast({ title: 'Error', description: res.error, variant: 'destructive' });
    else { toast({ title: 'Success' }); setEditingUser(null); fetchData(); }
  };

  const handleSaveGenerator = async () => {
      if (!editingGen?.name || !editingGen?.id) return;
      const res = await adminMutateGenerator(editingGen.id === 'new' ? 'create' : 'update', editingGen);
      if (res.error) {
          toast({ title: 'Error', description: res.error, variant: 'destructive' });
      } else {
          toast({ title: 'Generator Saved' });
          setGenModalOpen(false);
          fetchData();
      }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading Admin...</div>;

  const filteredUsers = users.filter(u => [u.full_name, u.username, u.email].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const pendingDeps = deposits.filter(d => d.status === "pending").length;
  const pendingWiths = withdrawals.filter(w => w.status === "pending" || w.status === "processing").length;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex w-full">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div className="flex items-center gap-2"><Shield className="text-amber-500" /><span className="font-bold">CoinPower Admin</span></div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden"><X /></button>
        </div>
        <nav className="p-4 space-y-2">
            {(["overview", "users", "deposits", "withdrawals", "generators"] as const).map(t => (
                <button key={t} onClick={() => { setTab(t); setSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${tab === t ? "bg-amber-500 text-slate-900 font-bold" : "text-slate-400 hover:bg-slate-700"}`}>
                    <div className="flex items-center justify-between">
                        <span className="capitalize">{t}</span>
                        {t === "deposits" && pendingDeps > 0 && <Badge variant="destructive" className="ml-2 px-1.5 py-0">{pendingDeps}</Badge>}
                        {t === "withdrawals" && pendingWiths > 0 && <Badge variant="destructive" className="ml-2 px-1.5 py-0">{pendingWiths}</Badge>}
                    </div>
                </button>
            ))}
            <button onClick={handleSignOut} className="w-full text-left px-4 py-2 rounded-lg text-red-400 hover:bg-red-900/20 mt-10">Sign Out</button>
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 p-6 overflow-y-auto w-full">
        <header className="flex justify-between items-center mb-8">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden"><Menu /></button>
            <h1 className="text-2xl font-black capitalize">{tab}</h1>
            <Button onClick={fetchData} variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"><RefreshCw className="w-4 h-4" /></Button>
        </header>

        {tab === "overview" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total Users", value: users.length, icon: Users, color: "text-blue-400" },
                    { label: "Total Balance", value: `$${users.reduce((s,u)=>s+(u.balance||0),0).toFixed(2)}`, icon: DollarSign, color: "text-green-400" },
                    { label: "Pending Deposits", value: pendingDeps, icon: ArrowDownToLine, color: "text-amber-400" },
                    { label: "Pending Payouts", value: pendingWiths, icon: ArrowUpFromLine, color: "text-red-400" },
                ].map(s => (
                    <div key={s.label} className="bg-slate-800 p-6 rounded-2xl border border-slate-700">
                        <s.icon className={`${s.color} mb-2`} />
                        <p className="text-2xl font-black">{s.value}</p>
                        <p className="text-slate-400 text-xs">{s.label}</p>
                    </div>
                ))}
            </div>
        )}

        {tab === "users" && (
            <div className="space-y-4">
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="bg-slate-800 border-slate-700 text-white" />
                <div className="space-y-2">
                    {filteredUsers.map(u => (
                        <div key={u.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="font-bold">{u.full_name || u.username}</p>
                                <p className="text-slate-400 text-xs">{u.email} · {u.country}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <p className="text-green-400 font-black">${(u.balance || 0).toFixed(2)}</p>
                                <Button size="sm" onClick={() => { setEditingUser(u); setNewBalance(String(u.balance || 0)); }} className="bg-slate-700 hover:bg-slate-600"><Edit3 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === "generators" && (
            <div className="space-y-4">
                <Button onClick={() => { setEditingGen({ id: 'new', name: '', subtitle: '', price: 0, daily_income: 0, expire_days: 30, max_rentals: 1, published: true, color: 'from-amber-400 to-orange-500', roi: '300%', investors: '1.2k' }); setGenModalOpen(true); }} className="bg-amber-500 text-slate-900 font-bold"><Plus className="w-4 h-4 mr-2" /> Create Generator</Button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {generators.map(g => (
                        <div key={g.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{g.name}</h3>
                                    <p className="text-slate-400 text-xs">{g.subtitle}</p>
                                </div>
                                <Badge variant={g.published ? "default" : "outline"}>{g.published ? "Active" : "Draft"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-slate-500">Price</p>
                                    <p className="font-bold text-green-400">${g.price}</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-slate-500">Daily</p>
                                    <p className="font-bold text-amber-400">${g.daily_income}</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-slate-500">Limit</p>
                                    <p className="font-bold">{g.max_rentals} per user</p>
                                </div>
                                <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-slate-500">Days</p>
                                    <p className="font-bold">{g.expire_days}</p>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={() => { setEditingGen(g); setGenModalOpen(true); }} className="flex-1 bg-slate-700 hover:bg-slate-600"><Edit3 className="w-4 h-4 mr-2" /> Edit</Button>
                                <Button onClick={() => { if(confirm('Delete generator?')) adminMutateGenerator('delete', { id: g.id }).then(fetchData); }} variant="destructive" className="flex-none"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === "deposits" && (
            <div className="space-y-4">
                {deposits.map(d => (
                    <div key={d.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{getUserDisplayName(users.find(u => u.id === d.user_id))}</p>
                            <p className="text-slate-400 text-xs">TXID: {d.tx_id} · {new Date(d.created_at).toLocaleDateString()}</p>
                            <Badge className="mt-1">{d.status}</Badge>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                            <p className="text-green-400 font-black">${d.amount.toFixed(2)}</p>
                            {d.status === 'pending' && (
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => adminHandleDeposit(d.id, 'approve', d.user_id, d.amount).then(fetchData)}>Approve</Button>
                                    <Button size="sm" variant="destructive" onClick={() => adminHandleDeposit(d.id, 'reject').then(fetchData)}>Reject</Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {tab === "withdrawals" && (
            <div className="space-y-4">
                {withdrawals.map(w => (
                    <div key={w.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <p className="font-bold">{getUserDisplayName(users.find(u => u.id === w.user_id))}</p>
                            <p className="text-slate-400 text-xs">{w.method} · {new Date(w.created_at).toLocaleDateString()}</p>
                            <Badge className="mt-1">{w.status}</Badge>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                            <p className="text-amber-400 font-black">${w.amount.toFixed(2)}</p>
                            {w.status === 'pending' && (
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-500" onClick={() => adminHandleWithdrawal(w.id, 'process').then(fetchData)}>Process</Button>
                                    <Button size="sm" variant="destructive" onClick={() => adminHandleWithdrawal(w.id, 'reject', w.user_id, w.amount).then(fetchData)}>Reject</Button>
                                </div>
                            )}
                            {w.status === 'processing' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => adminHandleWithdrawal(w.id, 'complete').then(fetchData)}>Complete</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>

      {editingUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-sm">
                  <h3 className="text-lg font-bold mb-4">Edit Balance for {getUserDisplayName(editingUser)}</h3>
                  <div className="space-y-4">
                      <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
                      <div className="flex gap-2">
                          <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1">Cancel</Button>
                          <Button onClick={() => handleUpdateBalance(editingUser.id, parseFloat(newBalance))} className="flex-1 bg-amber-500 text-slate-900 font-bold">Save</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <Dialog open={genModalOpen} onOpenChange={setGenModalOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
              <DialogHeader><DialogTitle>{editingGen?.id === 'new' ? 'Create' : 'Edit'} Generator</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <Label>ID (Slug)</Label>
                          <Input disabled={editingGen?.id !== 'new'} value={editingGen?.id} onChange={e => setEditingGen({...editingGen, id: e.target.value})} className="bg-slate-700 border-slate-600" />
                      </div>
                      <div className="space-y-1">
                          <Label>Name</Label>
                          <Input value={editingGen?.name} onChange={e => setEditingGen({...editingGen, name: e.target.value})} className="bg-slate-700 border-slate-600" />
                      </div>
                  </div>
                  <div className="space-y-1">
                      <Label>Subtitle</Label>
                      <Input value={editingGen?.subtitle} onChange={e => setEditingGen({...editingGen, subtitle: e.target.value})} className="bg-slate-700 border-slate-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <Label>Price ($)</Label>
                          <Input type="number" value={editingGen?.price} onChange={e => setEditingGen({...editingGen, price: parseFloat(e.target.value)})} className="bg-slate-700 border-slate-600" />
                      </div>
                      <div className="space-y-1">
                          <Label>Daily Income ($)</Label>
                          <Input type="number" value={editingGen?.daily_income} onChange={e => setEditingGen({...editingGen, daily_income: parseFloat(e.target.value)})} className="bg-slate-700 border-slate-600" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                          <Label>Expire Days</Label>
                          <Input type="number" value={editingGen?.expire_days} onChange={e => setEditingGen({...editingGen, expire_days: parseInt(e.target.value)})} className="bg-slate-700 border-slate-600" />
                      </div>
                      <div className="space-y-1">
                          <Label>Lifetime Limit per User</Label>
                          <Input type="number" value={editingGen?.max_rentals} onChange={e => setEditingGen({...editingGen, max_rentals: parseInt(e.target.value)})} className="bg-slate-700 border-slate-600" />
                      </div>
                  </div>
                  <div className="space-y-1">
                      <Label>Image URL</Label>
                      <Input value={editingGen?.image_url} onChange={e => setEditingGen({...editingGen, image_url: e.target.value})} className="bg-slate-700 border-slate-600" placeholder="https://..." />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                      <Checkbox id="published" checked={editingGen?.published} onCheckedChange={v => setEditingGen({...editingGen, published: !!v})} />
                      <Label htmlFor="published">Published & Available for Rent</Label>
                  </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setGenModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveGenerator} className="bg-amber-500 text-slate-900 font-bold">Save Changes</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
