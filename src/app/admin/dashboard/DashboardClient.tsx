
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Eye, EyeOff, Copy, RotateCcw, Link2, Plus,
  Pencil, ImagePlus, Activity, Clock, AlertTriangle, CreditCard, Menu, Gift,
  Building2, Phone, Mail, MapPin, Lock, Percent, ExternalLink
} from "lucide-react";

import {
  adminGetAllData,
  adminUpdateUserBalance,
  adminDeleteUser,
  adminHandleDeposit,
  adminHandleWithdrawal,
  adminMutateGenerator,
  adminCreateGiftCode,
  adminDeleteGiftCode,
  adminCreateUser
} from "./actions";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "activity" | "media" | "codes" | "settings" | "about";

interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  tx_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profiles?: {
    full_name: string;
    username: string;
  };
}

interface UserRecord {
  id: string;
  full_name: string;
  username: string;
  email: string;
  password?: string;
  country: string;
  balance: number;
  referral_code: string | null;
  phone?: string;
}

interface Generator {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  price: number;
  expire_days: number;
  daily_income: number;
  published: boolean;
  roi: string;
  period: string;
  min_invest: string;
  max_invest: string;
  investors: string;
  image_url?: string;
}

const BLANK_GEN: Omit<Generator, "id"> = {
  name: "",
  subtitle: "",
  icon: "⚡",
  color: "from-amber-400 to-orange-500",
  price: 0,
  expire_days: 30,
  daily_income: 0,
  published: false,
  roi: "",
  period: "Daily",
  min_invest: "",
  max_invest: "",
  investors: "0",
};

const COLORS = [
  { label: "Gold", value: "from-amber-400 to-orange-500" },
  { label: "Green", value: "from-green-400 to-emerald-600" },
  { label: "Blue", value: "from-blue-400 to-indigo-600" },
  { label: "Purple", value: "from-purple-500 to-pink-600" },
  { label: "Red", value: "from-red-500 to-rose-600" },
  { label: "Teal", value: "from-teal-400 to-cyan-600" },
];

export function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });

  const [showCreateGen, setShowCreateGen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generator | null>(null);
  const [newGen, setNewGen] = useState<Omit<Generator, "id">>({ ...BLANK_GEN });

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  // Load Data
  const { data: adminData, isLoading: adminLoading, refetch: refetchAll } = useQuery({ 
    queryKey: ["adminData"], 
    queryFn: async () => {
      const res = await adminGetAllData();
      if (res.error) throw new Error(res.error);
      return res.data;
    }
  });

  const users = adminData?.users || [];
  const generators = adminData?.generators || [];
  const deposits = adminData?.deposits || [];
  const withdrawals = adminData?.withdrawals || [];
  const bonusCodes = adminData?.codes || [];

  const updateBalanceMutation = useMutation({
    mutationFn: (args: { id: string; balance: number }) => adminUpdateUserBalance(args.id, args.balance),
    onSuccess: () => { refetchAll(); toast({ title: "Balance updated" }); setEditingUser(null); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => { refetchAll(); toast({ title: "User deleted" }); },
  });

  const signoutMutation = useMutation({
    mutationFn: async () => {
        document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push('/login');
    }
  });

  const filteredUsersList = users.filter((u: any) =>
    [u.full_name, u.username, u.email, u.country].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalBalanceVal = users.reduce((s: number, u: any) => s + (u.balance || 0), 0);
  const pendingCount = withdrawals.filter((w: any) => w.status === "pending").length;
  const pendingDepositsCount = deposits.filter((d: any) => d.status === "pending").length;

  const tabs: { id: Tab; label: string; icon: any; badge?: number; color: string }[] = [
    { id: "overview",     label: "Overview",    icon: BarChart3,       color: "from-blue-500 to-blue-600" },
    { id: "users",        label: "Users",       icon: Users,           color: "from-violet-500 to-purple-600", badge: users.length },
    { id: "deposits",     label: "Deposits",    icon: DollarSign,      color: "from-green-500 to-emerald-600", badge: pendingDepositsCount || undefined },
    { id: "withdrawals",  label: "Withdrawals", icon: ArrowUpFromLine, color: "from-amber-500 to-orange-500",  badge: pendingCount || undefined },
    { id: "generators",   label: "Generators",  icon: Zap,             color: "from-yellow-400 to-amber-500",  badge: generators.length },
    { id: "codes",        label: "Gift Codes",  icon: Gift,            color: "from-rose-500 to-pink-600",     badge: bonusCodes.length },
    { id: "settings",     label: "Settings",    icon: Settings,        color: "from-slate-500 to-slate-600" },
    { id: "about",        label: "About",       icon: Info,            color: "from-indigo-500 to-indigo-600" },
  ];

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading admin panel...</p></div>;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-900 text-white">
      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent className="bg-slate-800 border border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">Cancel</AlertDialogCancel>
            <button className="bg-red-600 px-4 py-2 rounded text-white font-bold" onClick={confirmDialog.onConfirm}>Confirm</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-slate-900 border-r border-slate-700 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-none">CoinPower</p>
              <p className="text-amber-400 text-[10px] leading-none mt-0.5">Admin Panel</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {tabs.map(({ id, label, icon: Icon, badge, color }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => { setTab(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-slate-700 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="flex-1 text-left">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? "bg-amber-500 text-white" : "bg-slate-600 text-slate-300"}`}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-slate-700 flex-shrink-0">
          <button onClick={() => signoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-none">CoinPower</p>
              <p className="text-amber-400 text-[10px] leading-none">Admin Panel</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 md:pl-72 min-h-screen">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
          {tab === "overview" && (
            <div className="space-y-5">
              <h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-xs">Total Users</p>
                    <p className="text-xl font-bold">{users.length}</p>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-xs">System Balance</p>
                    <p className="text-xl font-bold text-green-400">${totalBalanceVal.toFixed(2)}</p>
                 </div>
                 <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <p className="text-slate-400 text-xs">Pending Withdraw</p>
                    <p className="text-xl font-bold text-amber-400">{pendingCount}</p>
                 </div>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-black">User Accounts</h1>
                <Button onClick={() => setShowCreateUser(true)}>Add User</Button>
              </div>
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="bg-slate-800 border-slate-700" />
              <div className="space-y-3">
                {filteredUsersList.map((u: any) => (
                    <div key={u.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center text-white">
                        <div>
                            <p className="font-bold">{u.full_name}</p>
                            <p className="text-xs text-slate-400">@{u.username}</p>
                            <p className="text-green-400 text-sm mt-1">${(u.balance || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                             <Button size="sm" variant="outline" onClick={() => { setEditingUser(u); setNewBalance(u.balance.toString()); }}>Edit</Button>
                             <Button size="sm" variant="destructive" onClick={() => openConfirm("Delete User", "Are you sure?", () => deleteUserMutation.mutate(u.id))}>Delete</Button>
                        </div>
                    </div>
                ))}
              </div>
            </div>
          )}
          
          {tab === "settings" && (
            <div className="space-y-4 max-w-xl">
              <div><h1 className="text-xl font-black text-white">Admin Settings</h1><p className="text-slate-400 text-sm">Platform configuration</p></div>
              {[
                { label: "Platform Name", value: "CoinPower" },
                { label: "Admin Username", value: "admin" },
                { label: "Admin Password", value: "coinpower2026" },
                { label: "Withdrawal Fee", value: "15%" },
                { label: "Processing Time", value: "1 – 24 hours" },
                { label: "Headquarters", value: "Rome, Italy" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
                  <div><p className="text-slate-400 text-xs">{label}</p><p className="text-white font-semibold text-sm mt-0.5">{value}</p></div>
                  <button onClick={() => { navigator.clipboard.writeText(value); toast({ title: "Copied" }); }} className="text-slate-500 hover:text-amber-400 p-1"><Copy className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === "about" && (
            <div className="space-y-5 max-w-2xl">
              <h1 className="text-xl font-black text-white">About CoinPower</h1>
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg">CoinPower</h2>
                  <p className="text-amber-400 text-sm font-semibold">Digital Energy Mining Platform</p>
                  <p className="text-slate-400 text-xs mt-1">© {new Date().getFullYear()} CoinPower Italy. All rights reserved.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Edit User Balance</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
              <label className="text-slate-300 text-xs font-medium mb-1.5 block">New Balance ($)</label>
              <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={() => updateBalanceMutation.mutate({ id: editingUser.id, balance: parseFloat(newBalance) || 0 })} disabled={updateBalanceMutation.isPending} className="flex-1 bg-amber-500 text-white">
                {updateBalanceMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
