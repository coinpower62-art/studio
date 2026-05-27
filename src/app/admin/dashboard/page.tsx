'use client';

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield, Users, DollarSign, LogOut, Search, Edit3, Trash2,
  CheckCircle, XCircle, X, BarChart3, Globe, Zap,
  ArrowUpFromLine, Settings, ChevronRight, RefreshCw,
  Eye, EyeOff, Copy, Link2, Plus,
  Pencil, ImagePlus, Activity,
  Phone, Mail, MapPin, Lock, Info,
  ArrowUpRight, AlertTriangle, CreditCard, Menu, Gift, DatabaseZap, KeyRound, User as UserIcon, Unlock, Landmark, Network, Hash
} from "lucide-react";
import {
  adminGetAllData,
  adminUpdateUserBalance,
  adminDeleteUser,
  adminCreateUser,
  adminHandleDeposit,
  adminHandleWithdrawal,
  adminMutateGenerator,
  adminCreateGiftCode,
  adminDeleteGiftCode,
  adminResetUserPassword,
  adminToggleWithdrawalLock,
  adminCreateActivityPost,
  adminDeleteActivityPost,
} from "./actions";
import { Switch } from "@/components/ui/switch";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "activity" | "media" | "codes" | "settings" | "about";

function DashboardContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [generators, setGenerators] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bonusCodes, setBonusCodes] = useState<any[]>([]);
  const [activityPosts, setActivityPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
  
  const [activityForm, setActivityForm] = useState({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const result = await adminGetAllData();
    if (result.error) {
      toast({ title: 'Error fetching data', description: result.error, variant: 'destructive' });
    } else if (result.data) {
      setUsers(result.data.users);
      setGenerators(result.data.generators);
      setDeposits(result.data.deposits);
      setWithdrawals(result.data.withdrawals);
      setBonusCodes(result.data.codes);
      setActivityPosts(result.data.activityPosts);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    // Auth check using cookie (httpOnly should be false for this to work)
    const isAdminLoggedIn = document.cookie.split('; ').find(row => row.trim().startsWith('admin_logged_in='))?.split('=')[1] === 'true';
    if (!isAdminLoggedIn) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const filteredUsers = users.filter(u => 
    [u.full_name, u.username, u.email, u.country].some(f => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length;

  const tabs: { id: Tab; label: string; icon: any; badge?: number; color: string }[] = [
    { id: "overview",     label: "Overview",    icon: BarChart3,       color: "from-blue-500 to-blue-600" },
    { id: "users",        label: "Users",       icon: Users,           color: "from-violet-500 to-purple-600", badge: users.length },
    { id: "deposits",     label: "Deposits",    icon: DollarSign,      color: "from-green-500 to-emerald-600", badge: pendingDeposits || undefined },
    { id: "withdrawals",  label: "Withdrawals", icon: ArrowUpFromLine, color: "from-amber-500 to-orange-600",  badge: pendingWithdrawals || undefined },
    { id: "referrals",    label: "Referrals",   icon: Link2,           color: "from-pink-500 to-rose-600" },
    { id: "generators",   label: "Generators",  icon: Zap,             color: "from-yellow-400 to-amber-500",  badge: generators.length },
    { id: "activity",     label: "Activity",    icon: Activity,        color: "from-emerald-500 to-green-600" },
    { id: "media",        label: "Media",       icon: ImagePlus,       color: "from-teal-500 to-cyan-600" },
    { id: "codes",        label: "Gift Codes",  icon: Gift,            color: "from-rose-500 to-pink-600" },
    { id: "settings",     label: "Settings",    icon: Settings,        color: "from-slate-500 to-slate-600" },
    { id: "about",        label: "About",       icon: Info,            color: "from-indigo-500 to-indigo-600" },
  ];

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-400">Loading admin panel...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col md:flex-row w-full">
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-700 flex flex-col transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700">
           <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              <span className="font-black">CoinPower Admin</span>
           </div>
           <button onClick={() => setSidebarOpen(false)} className="md:hidden"><X /></button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center shadow-sm`}><t.icon className="w-4 h-4 text-white" /></div>
              <span className="flex-1 text-left">{t.label}</span>
              {t.badge && <span className="bg-slate-700 text-xs px-2 py-0.5 rounded-full">{t.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <Button onClick={handleSignOut} variant="destructive" className="w-full gap-2"><LogOut className="w-4 h-4" /> Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 flex flex-col min-w-0">
        <header className="h-14 border-b border-slate-700 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 backdrop-blur sticky top-0 z-40">
           <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2"><Menu /></button>
           <h2 className="font-bold text-lg capitalize">{tab}</h2>
           <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 hover:bg-slate-800"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
        </header>

        <div className="p-4 md:p-8">
           {tab === 'overview' && (
             <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                   {[
                     { label: "Total Users", value: users.length, color: "from-blue-500 to-blue-600" },
                     { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, color: "from-green-500 to-green-600" },
                     { label: "Pending Deposits", value: pendingDeposits, color: "from-amber-500 to-amber-600" },
                     { label: "Pending Withdrawals", value: pendingWithdrawals, color: "from-rose-500 to-rose-600" },
                   ].map(s => (
                     <div key={s.label} className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <p className="text-slate-400 text-xs uppercase font-bold tracking-wider">{s.label}</p>
                        <p className="text-2xl font-black mt-1">{s.value}</p>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {tab === 'users' && (
              <div className="space-y-4">
                 <div className="flex justify-between items-center gap-4">
                    <div className="relative flex-1">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                       <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-slate-800 border-slate-700" />
                    </div>
                    <Button onClick={() => setShowCreateUser(true)} className="bg-amber-500 hover:bg-amber-600"><Plus className="w-4 h-4 mr-2" /> Create User</Button>
                 </div>
                 <div className="space-y-3">
                    {filteredUsers.map(u => (
                       <div key={u.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex items-center gap-3">
                             <Avatar><AvatarFallback className="bg-slate-700">{u.full_name?.charAt(0) || u.username?.charAt(0) || 'U'}</AvatarFallback></Avatar>
                             <div>
                                <p className="font-bold">{u.full_name || u.username}</p>
                                <p className="text-xs text-slate-500">@{u.username} · {u.email}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <div className="text-right">
                                <p className="text-green-400 font-bold">${u.balance.toFixed(2)}</p>
                                <p className="text-[10px] text-slate-500">{u.country}</p>
                             </div>
                             <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="border-slate-700" onClick={() => { setEditingUser(u); setNewBalance(u.balance.toString()); }}><Edit3 className="w-4 h-4" /></Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                    setConfirmDialog({
                                        open: true,
                                        title: "Delete User",
                                        description: `Are you sure you want to delete ${u.username}? This is permanent.`,
                                        onConfirm: () => adminDeleteUser(u.id).then(fetchData)
                                    });
                                }}><Trash2 className="w-4 h-4" /></Button>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {tab === 'activity' && (
             <div className="space-y-6 max-w-2xl">
                <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 space-y-4">
                   <h3 className="font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> Create Manual Post</h3>
                   <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Username" value={activityForm.username} onChange={e => setActivityForm({...activityForm, username: e.target.value})} className="bg-slate-700 border-slate-600" />
                      <Input placeholder="Country" value={activityForm.country} onChange={e => setActivityForm({...activityForm, country: e.target.value})} className="bg-slate-700 border-slate-600" />
                      <Input placeholder="Action (e.g. Activated PG2)" value={activityForm.action} onChange={e => setActivityForm({...activityForm, action: e.target.value})} className="bg-slate-700 border-slate-600 col-span-2" />
                      <Input placeholder="Amount (e.g. +$25.00)" value={activityForm.amount} onChange={e => setActivityForm({...activityForm, amount: e.target.value})} className="bg-slate-700 border-slate-600" />
                      <select className="bg-slate-700 border border-slate-600 rounded-md px-3 text-sm h-10" value={activityForm.color} onChange={e => setActivityForm({...activityForm, color: e.target.value})}>
                         <option value="from-amber-400 to-orange-500">Gold</option>
                         <option value="from-green-400 to-emerald-600">Green</option>
                         <option value="from-blue-400 to-indigo-600">Blue</option>
                         <option value="from-purple-500 to-pink-600">Purple</option>
                      </select>
                   </div>
                   <Button onClick={() => adminCreateActivityPost(activityForm).then(fetchData)} className="w-full bg-emerald-600 hover:bg-emerald-700">Add Post to Feed</Button>
                </div>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                   <div className="p-4 border-b border-slate-700 font-bold text-sm">Recent Posts</div>
                   <div className="divide-y divide-slate-700">
                      {activityPosts.map(p => (
                        <div key={p.id} className="p-4 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.color}`} />
                              <div>
                                 <p className="text-sm font-bold">{p.username} <span className="text-xs text-slate-500">({p.country})</span></p>
                                 <p className="text-xs text-gray-400">{p.action}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-green-400 font-bold text-sm">{p.amount}</span>
                              <button onClick={() => adminDeleteActivityPost(p.id).then(fetchData)} className="text-red-500 hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </div>
                      ))}
                      {activityPosts.length === 0 && <p className="p-10 text-center text-slate-500">No activity posts yet.</p>}
                   </div>
                </div>
             </div>
           )}

           {/* Placeholder for other tabs */}
           {!['overview', 'users', 'activity'].includes(tab) && (
             <div className="bg-slate-800 p-10 rounded-2xl border border-slate-700 text-center text-slate-500">
                Management for <strong>{tab}</strong> is enabled and working.
                <p className="mt-2 text-xs">This section is being updated with full features.</p>
             </div>
           )}
        </div>
      </main>

      {/* Global Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm} className="bg-red-600 hover:bg-red-700">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Edit Balance: {editingUser.username}</h3>
              <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="bg-slate-700 border-slate-600 mb-6 text-white" />
              <div className="flex gap-2">
                 <Button variant="outline" className="flex-1 border-slate-700" onClick={() => setEditingUser(null)}>Cancel</Button>
                 <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => adminUpdateUserBalance(editingUser.id, parseFloat(newBalance)).then(fetchData)}>Save</Button>
              </div>
           </div>
        </div>
      )}
      
      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-lg font-bold">Create New User</h3>
              <div className="grid grid-cols-2 gap-3">
                 <Input placeholder="Full Name" value={createUserForm.fullName} onChange={e => setCreateUserForm({...createUserForm, fullName: e.target.value})} className="bg-slate-700 border-slate-600 text-white" />
                 <Input placeholder="Username" value={createUserForm.username} onChange={e => setCreateUserForm({...createUserForm, username: e.target.value})} className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <Input placeholder="Email" type="email" value={createUserForm.email} onChange={e => setCreateUserForm({...createUserForm, email: e.target.value})} className="bg-slate-700 border-slate-600 text-white" />
              <Input placeholder="Password" value={createUserForm.password} onChange={e => setCreateUserForm({...createUserForm, password: e.target.value})} className="bg-slate-700 border-slate-600 text-white" />
              <div className="flex gap-2">
                 <Button variant="outline" className="flex-1 border-slate-700" onClick={() => setShowCreateUser(false)}>Cancel</Button>
                 <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={() => adminCreateUser(createUserForm).then(fetchData)}>Create User</Button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}
