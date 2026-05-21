'use client';

import { useState, useEffect, Suspense } from "react";
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
  CheckCircle, XCircle, X, BarChart3, Zap,
  ArrowUpFromLine, Settings, ChevronRight, RefreshCw,
  Eye, EyeOff, Copy, Link2, Save, Plus,
  Pencil, ImagePlus,
  Info, Building2, Phone, Mail, MapPin, 
  ExternalLink, Clock, AlertTriangle, CreditCard, Menu, Gift, DatabaseZap, KeyRound, User as UserIcon, Lock, Unlock, Video, Landmark, Network, Hash, ArrowUpRight
} from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { countries } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";
import {
  adminGetAllData,
  adminUpdateUserBalance,
  adminDeleteUser,
  adminCreateUser,
  adminHandleDeposit,
  adminHandleWithdrawal,
  adminMutateGenerator,
  adminUpdateGeneratorImage,
  adminUpsertMedia,
  adminCreateGiftCode,
  adminDeleteGiftCode,
  adminResetUserPassword,
  adminToggleWithdrawalLock,
  adminDeleteMedia,
  adminDeleteGeneratorImage,
} from "./actions";
import { Switch } from "@/components/ui/switch";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "media" | "codes" | "settings" | "about";

type DepositRequest = {
  id: string; user_id: string;
  amount: number; tx_id: string; status: "pending" | "approved" | "rejected"; created_at: string;
};

type UserRecord = {
  id: string;
  created_at: string;
  full_name: string | null;
  username: string | null;
  email: string;
  country: string | null;
  balance: number;
  referral_code: string | null;
  parent_id: string | null;
  referral_count?: number;
  phone?: string | null;
  has_withdrawal_pin?: boolean;
  withdrawal_locked?: boolean;
  rented_generators?: { id: string; name: string; expires_at: string; rented_at: string; }[];
};

type Generator = {
  id: string; name: string; subtitle: string; icon: string; color: string;
  price: number; expire_days: number; daily_income: number; published: boolean;
  roi: string; period: string; min_invest: string; max_invest: string; investors: string;
  image_url?: string;
  max_rentals: number;
};

type NewGenerator = Omit<Generator, "id">;

type GiftCode = {
  id: string;
  code: string;
  amount: number;
  note: string | null;
  created_at: string;
  is_redeemed: boolean;
  redeemed_at: string | null;
  redeemed_by_user_id: string | null;
};

type RentedGeneratorRaw = {
  user_id: string;
  generator_id: string;
  expires_at: string;
  rented_at: string;
}

const BLANK_GEN: NewGenerator = {
  name: "", subtitle: "", icon: "⚡", color: "from-amber-400 to-orange-500",
  price: 0, expire_days: 30, daily_income: 0, published: false,
  roi: "", period: "Daily", min_invest: "", max_invest: "", investors: "0",
  max_rentals: 1,
};

const COLORS = [
  { label: "Gold", value: "from-amber-400 to-orange-500" },
  { label: "Green", value: "from-green-400 to-emerald-600" },
  { label: "Blue", value: "from-blue-400 to-indigo-600" },
  { label: "Purple", value: "from-purple-500 to-pink-600" },
  { label: "Red", value: "from-red-500 to-rose-600" },
  { label: "Teal", value: "from-teal-400 to-cyan-600" },
];

const DEFAULT_GENERATORS: Generator[] = [
  { id: 'pg1', name: "PG1 Generator", subtitle: "Basic Power", icon: "⚡", color: "from-amber-400 to-orange-500", price: 0, expire_days: 2, daily_income: 0.5, published: true, roi: "10%", period: "Daily", min_invest: "$0", max_invest: "$0", investors: "12050", max_rentals: 1 },
  { id: 'pg2', name: "PG2 Generator", subtitle: "Standard Power", icon: "🔋", color: "from-green-400 to-emerald-600", price: 25, expire_days: 30, daily_income: 2.5, published: true, roi: "12%", period: "Daily", min_invest: "$25", max_invest: "$1000", investors: "8520", max_rentals: 2 },
  { id: 'pg3', name: "PG3 Generator", subtitle: "Mega Power", icon: "💡", color: "from-blue-400 to-indigo-600", price: 100, expire_days: 45, daily_income: 10, published: true, roi: "15%", period: "Daily", min_invest: "$100", max_invest: "$5000", investors: "4310", max_rentals: 1 },
  { id: 'pg4', name: "PG4 Generator", subtitle: "Ultra Power", icon: "🚀", color: "from-purple-500 to-pink-600", price: 500, expire_days: 30, daily_income: 55, published: true, roi: "20%", period: "Daily", min_invest: "$500", max_invest: "$20000", investors: "1250", max_rentals: 2 },
];

type WithdrawalRecord = {
  id: string; user_id: string; country: string;
  method: string; amount: number; net_amount: number; fee: number;
  details: string; status: "pending" | "processing" | "complete" | "rejected"; created_at: string;
};

type MediaAsset = {
    id: string;
    url: string;
}

function DepositRow({ d, user, onApprove, onReject, onDelete, copyText }: {
  d: DepositRequest;
  user?: UserRecord;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  copyText: (text: string, label: string) => void;
}) {
  const isCard = Boolean(d.tx_id?.match(/\[CARD/i));
  let method = "Unknown";
  let country = "Unknown";
  let cleanTxId = d.tx_id || "";

  const match = d.tx_id?.match(/^\[(.*?)\|(.*?)\]\s*(.*)$/);
  if (match) {
    method = match[1];
    country = match[2];
    cleanTxId = match[3];
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
      {isCard && d.status === "pending" && (
        <div className="flex items-start gap-2 bg-orange-950/50 border border-orange-700/50 rounded-xl px-3 py-2.5 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-300 text-xs font-bold">Card Payment — Verify Before Approving</p>
          </div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex gap-3 min-w-0">
          <Avatar><AvatarFallback className="bg-amber-600">{user?.username?.[0].toUpperCase()}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">{user?.full_name || user?.username}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-black text-base">${d.amount.toFixed(2)}</p>
          <Badge className={d.status === 'pending' ? 'bg-yellow-900/40 text-yellow-400' : d.status === 'approved' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}>{d.status}</Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="bg-slate-700/50 p-2 rounded-lg">
          <p className="text-slate-400 mb-0.5 uppercase tracking-widest text-[8px]">Method</p>
          <p className="text-white font-bold">{method}</p>
        </div>
        <div className="bg-slate-700/50 p-2 rounded-lg">
          <p className="text-slate-400 mb-0.5 uppercase tracking-widest text-[8px]">Phone</p>
          <p className="text-white font-bold">{user?.phone || '—'}</p>
        </div>
        <div className="bg-slate-700/50 p-2 rounded-lg col-span-2">
          <p className="text-slate-400 mb-0.5 uppercase tracking-widest text-[8px]">Transaction ID</p>
          <div className="flex justify-between items-center gap-2">
            <p className="text-amber-400 font-mono font-bold break-all">{cleanTxId}</p>
            <button onClick={() => copyText(cleanTxId, 'TX ID')} className="text-slate-400 hover:text-white flex-shrink-0"><Copy className="w-3 h-3" /></button>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {d.status === 'pending' && (
          <>
            <Button onClick={onApprove} size="sm" className="flex-1 bg-green-600 h-8 text-xs">Approve</Button>
            <Button onClick={onReject} size="sm" variant="destructive" className="flex-1 h-8 text-xs">Reject</Button>
          </>
        )}
        <Button onClick={onDelete} size="sm" variant="ghost" className="text-red-400 px-2 h-8"><Trash2 className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

function AdminWithdrawalStepper({ status }: { status: "pending" | "processing" | "complete" | "rejected" }) {
    const stages = [
        { id: "pending", label: "Pending" },
        { id: "processing", label: "Processing" },
        { id: "complete", label: "Complete" },
    ];

    if (status === 'rejected') {
        return (
            <div className="flex items-center gap-1.5 text-red-400 bg-red-900/30 border border-red-700 rounded-full px-2.5 py-1 w-full justify-center">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">Rejected</span>
            </div>
        )
    }

    const currentStageIndex = stages.findIndex(s => s.id === status);

    return (
        <div className="flex items-center gap-2 mt-2 bg-slate-900/50 p-2 rounded-lg w-full">
            {stages.map((stage, index) => {
                const isCompleted = index < currentStageIndex;
                const isActive = index === currentStageIndex;
                
                return (
                    <div key={stage.id} className="flex-1 flex items-center gap-1">
                        {index > 0 && <div className={`flex-1 h-0.5 ${index <= currentStageIndex ? 'bg-green-500' : 'bg-slate-700'}`} />}
                        <div className="flex items-center gap-1">
                            {isCompleted ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : isActive ? <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" /> : <div className="w-2 h-2 rounded-full bg-slate-600" />}
                            <span className={`text-[10px] ${isActive ? 'text-blue-400 font-bold' : 'text-slate-500'}`}>{stage.label}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function DashboardContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Data State ---
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [bonusCodes, setBonusCodes] = useState<GiftCode[]>([]);
  const [visits, setVisits] = useState<{date: string, view_count: number}[]>([]);
  const [allRentedGenerators, setAllRentedGenerators] = useState<RentedGeneratorRaw[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
      setLoading(true);
      const result = await adminGetAllData();
      if (result.error || !result.data) {
        toast({ title: 'Error fetching admin data', description: result.error, variant: 'destructive' });
      } else {
        const rawUsers = result.data.users as UserRecord[];
        const allGenerators = result.data.generators as Generator[];
        const rentedGensRaw = result.data.rentedGenerators as RentedGeneratorRaw[] || [];
        setAllRentedGenerators(rentedGensRaw);

        const generatorMap = new Map(allGenerators.map(g => [g.id, g.name]));
        const rentedByUser = rentedGensRaw.reduce((acc, rg) => {
            if (!acc[rg.user_id]) acc[rg.user_id] = [];
            acc[rg.user_id].push({
                id: rg.generator_id,
                name: generatorMap.get(rg.generator_id) || 'Unknown Gen',
                expires_at: rg.expires_at,
                rented_at: rg.rented_at,
            });
            return acc;
        }, {} as Record<string, any[]>);
        
        const referralCounts = rawUsers.reduce((acc, user) => {
          if (user.parent_id) acc[user.parent_id] = (acc[user.parent_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const usersWithData = rawUsers.map(user => ({
          ...user,
          referral_count: referralCounts[user.id] || 0,
          rented_generators: rentedByUser[user.id] || [],
        }));

        setUsers(usersWithData);
        setGenerators(allGenerators);
        setDeposits(result.data.deposits as DepositRequest[]);
        setWithdrawals(result.data.withdrawals as WithdrawalRecord[]);
        setMedia(result.data.media as MediaAsset[]);
        setBonusCodes(result.data.codes as GiftCode[]);
        setVisits(result.data.visits as any[] || []);
      }
      setLoading(false);
  }

  useEffect(() => {
    const isAdmin = document.cookie.includes('admin_logged_in=true');
    if (!isAdmin) { router.push('/login'); return; }
    fetchData();
  }, [router]);

  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [editingPassword, setEditingPassword] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });

  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleApproveDeposit = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleDeposit(id, 'approve', userId, amount);
    if (!result.error) fetchData();
  }

  const handleRejectDeposit = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleDeposit(id, 'reject', userId, amount);
    if (!result.error) fetchData();
  }

  const handleProcessWithdrawal = async (id: string) => {
    const result = await adminHandleWithdrawal(id, 'process');
    if (!result.error) fetchData();
  }

  const handleCompleteWithdrawal = async (id: string) => {
    const result = await adminHandleWithdrawal(id, 'complete');
    if (!result.error) fetchData();
  }

  const handleRejectWithdrawal = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleWithdrawal(id, 'reject', userId, amount);
    if (!result.error) fetchData();
  }

  const handleUpdateBalance = async (userId: string, balance: number) => {
    const res = await adminUpdateUserBalance(userId, balance);
    if (!res.error) { setEditingUser(null); fetchData(); }
  }

  const handleResetPassword = async (userId: string, pass: string) => {
    const res = await adminResetUserPassword(userId, pass);
    if (!res.error) { setEditingPassword(null); toast({ title: "Password Reset" }); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;

  const filteredUsers = users.filter(u => [u.full_name, u.username, u.email].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const activeRentalsCount = allRentedGenerators.filter(g => new Date(g.expires_at).getTime() > Date.now()).length;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex">
      <AlertDialog open={confirmDialog.open} onOpenChange={o => setConfirmDialog(s => ({ ...s, open: o }))}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm} className="bg-red-600">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-800 bg-slate-900 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-slate-800 font-black text-xl flex items-center gap-2">
          <Shield className="text-amber-500" /> Admin
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${tab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <Button onClick={handleSignOut} variant="destructive" className="w-full">Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <header className="flex items-center justify-between mb-6 md:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 bg-slate-800 rounded-lg"><Menu /></button>
            <h1 className="font-bold text-lg capitalize">{tab}</h1>
            <div className="w-10 h-10" />
        </header>

        {tab === "overview" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black">Overview</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 { label: "Total Users", value: users.length, icon: Users, col: "text-blue-400" },
                 { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, col: "text-green-400" },
                 { label: "Active Rentals", value: activeRentalsCount, icon: Zap, col: "text-amber-400" },
                 { label: "Pending Deposits", value: deposits.filter(d => d.status === 'pending').length, icon: ArrowUpFromLine, col: "text-red-400" },
               ].map(s => (
                 <div key={s.label} className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                    <s.icon className={`${s.col} mb-2 w-5 h-5`} />
                    <p className="text-xl font-black">{s.value}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{s.label}</p>
                 </div>
               ))}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h1 className="text-2xl font-black">Users</h1>
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full sm:w-64 bg-slate-800 border-slate-700" />
             </div>
             <div className="grid gap-3">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate">{u.full_name || u.username}</p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                       <span className="text-green-400 font-bold">${u.balance.toFixed(2)}</span>
                       <Button size="sm" onClick={() => { setEditingUser(u); setNewBalance(String(u.balance)); }} variant="outline" className="h-8 border-slate-700">Balance</Button>
                       <Button size="sm" onClick={() => { setEditingPassword(u); setNewPassword(''); }} variant="outline" className="h-8 border-slate-700 text-xs">Reset Pass</Button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {tab === "deposits" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black">Deposits</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deposits.map(d => (
                <DepositRow key={d.id} d={d} user={users.find(u => u.id === d.user_id)} onApprove={() => handleApproveDeposit(d.id, d.user_id, d.amount)} onReject={() => handleRejectDeposit(d.id, d.user_id, d.amount)} onDelete={() => fetchData()} copyText={(txt) => { navigator.clipboard.writeText(txt); toast({ title: "Copied" }); }} />
              ))}
            </div>
          </div>
        )}

        {tab === "withdrawals" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-black">Withdrawals</h1>
            {withdrawals.map(w => (
              <div key={w.id} className="bg-slate-800 p-4 rounded-2xl border border-slate-700 space-y-3">
                 <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{users.find(u => u.id === w.user_id)?.full_name || 'User'}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest truncate">{w.method} · {w.country}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-amber-400 font-black text-lg">${w.amount.toFixed(2)}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Net: ${w.net_amount.toFixed(2)}</p>
                    </div>
                 </div>
                 <AdminWithdrawalStepper status={w.status} />
                 <div className="flex gap-2 pt-1">
                    {w.status === 'pending' && <Button onClick={() => handleProcessWithdrawal(w.id)} size="sm" className="bg-blue-600 h-8 text-xs flex-1">Process</Button>}
                    {w.status === 'processing' && <Button onClick={() => handleCompleteWithdrawal(w.id)} size="sm" className="bg-green-600 h-8 text-xs flex-1">Complete</Button>}
                    {(w.status === 'pending' || w.status === 'processing') && <Button onClick={() => handleRejectWithdrawal(w.id, w.user_id, w.amount)} size="sm" variant="destructive" className="h-8 text-xs flex-1">Reject</Button>}
                 </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
            <h2 className="font-black text-lg mb-4">Update Balance</h2>
            <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="mb-4 bg-slate-700 border-slate-600" />
            <div className="flex gap-2">
              <Button onClick={() => setEditingUser(null)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={() => handleUpdateBalance(editingUser.id, parseFloat(newBalance))} className="flex-1 bg-amber-600 font-bold">Save</Button>
            </div>
          </div>
        </div>
      )}

      {editingPassword && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-800 p-6 rounded-2xl w-full max-w-sm border border-slate-700 shadow-2xl">
            <h2 className="font-black text-lg mb-4">Reset Password</h2>
            <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" className="mb-4 bg-slate-700 border-slate-600" />
            <div className="flex gap-2">
              <Button onClick={() => setEditingPassword(null)} variant="ghost" className="flex-1">Cancel</Button>
              <Button onClick={() => handleResetPassword(editingPassword.id, newPassword)} className="flex-1 bg-amber-600 font-bold">Reset</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "deposits", label: "Deposits", icon: DollarSign },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { id: "generators", label: "Generators", icon: Zap },
  { id: "media", label: "Media", icon: ImagePlus },
  { id: "codes", label: "Gift Codes", icon: Gift },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DashboardClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}
