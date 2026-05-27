
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
  Eye, EyeOff, Copy, RotateCcw, Link2, Upload, Save, Plus,
  Pencil, ImagePlus, Activity, Clock, AlertTriangle, CreditCard, Menu, Gift
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
  adminResetUserPassword,
  adminCreateUser
} from "./actions";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "activity" | "media" | "codes" | "settings" | "about";

interface DepositRequest {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  amount: number;
  txId: string;
  date: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

interface UserRecord {
  id: string;
  fullName: string;
  username: string;
  email: string;
  password?: string;
  country: string;
  balance: number;
  referralCode: string | null;
  referredBy: string | null;
  activeGenerators?: any[];
  activeGeneratorCount?: number;
}

interface Generator {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  price: number;
  expireDays: number;
  dailyIncome: number;
  published: boolean;
  roi: string;
  period: string;
  minInvest: string;
  maxInvest: string;
  investors: string;
  imageUrl?: string;
}

const BLANK_GEN: Omit<Generator, "id"> = {
  name: "",
  subtitle: "",
  icon: "⚡",
  color: "from-amber-400 to-orange-500",
  price: 0,
  expireDays: 30,
  dailyIncome: 0,
  published: false,
  roi: "",
  period: "Daily",
  minInvest: "",
  maxInvest: "",
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

type WithdrawalRecord = {
  id: string; userId: string; username: string; fullName: string; country: string;
  method: string; amount: number; netAmount: number; fee: number;
  details: string; status: "pending" | "approved" | "rejected"; createdAt: number;
};

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

  const [generatedCode, setGeneratedCode] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");
  const [activityForm, setActivityForm] = useState({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });

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
  const activityPosts = adminData?.activityPosts || [];
  const activityImages = adminData?.activityImages || [];

  // Mutations
  const updateBalanceMutation = useMutation({
    mutationFn: (args: { id: string; balance: number }) => adminUpdateUserBalance(args.id, args.balance),
    onSuccess: () => { refetchAll(); toast({ title: "Balance updated" }); setEditingUser(null); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => { refetchAll(); toast({ title: "User deleted" }); },
  });

  const createGenMutation = useMutation({
    mutationFn: (data: any) => adminMutateGenerator("create", data),
    onSuccess: () => { refetchAll(); setShowCreateGen(false); toast({ title: "Generator created" }); },
  });

  const deleteGenMutation = useMutation({
    mutationFn: (id: string) => adminMutateGenerator("delete", { id }),
    onSuccess: () => { refetchAll(); toast({ title: "Generator deleted" }); },
  });

  const signoutMutation = useMutation({
    mutationFn: async () => {
        document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push('/login');
    }
  });

  const createCodeMutation = useMutation({
    mutationFn: (data: { amount: number; note: string }) => adminCreateGiftCode(data.amount, data.note),
    onSuccess: (res: any) => {
      setGeneratedCode(res.data);
      setNewCodeAmount(""); setNewCodeNote("");
      refetchAll();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id: string) => adminDeleteGiftCode(id),
    onSuccess: () => { refetchAll(); toast({ title: "Code deleted" }); },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminCreateUser(data),
    onSuccess: () => {
      refetchAll();
      setShowCreateUser(false);
      setCreateUserForm({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
      toast({ title: "User created successfully!" });
    },
    onError: (e: any) => toast({ title: "Failed to create user", description: e.message, variant: "destructive" }),
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

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
    { id: "referrals",    label: "Referrals",   icon: Link2,           color: "from-pink-500 to-rose-600" },
    { id: "generators",   label: "Generators",  icon: Zap,             color: "from-yellow-400 to-amber-500",  badge: generators.length },
    { id: "activity",     label: "Activity",    icon: Activity,        color: "from-emerald-500 to-green-600" },
    { id: "media",        label: "Media",       icon: ImagePlus,       color: "from-teal-500 to-cyan-600" },
    { id: "codes",        label: "Gift Codes",  icon: Gift,            color: "from-rose-500 to-pink-600" },
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <button className="bg-red-600 px-4 py-2 rounded text-white" onClick={confirmDialog.onConfirm}>Confirm</button>
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

        <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-black text-white flex-shrink-0">A</div>
          <div>
            <p className="text-white text-xs font-bold">Administrator</p>
            <p className="text-slate-400 text-[10px]">Full access</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {tabs.map(({ id, label, icon: Icon, badge, color }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
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
          })} vacation
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

      <div className="pt-12 min-h-screen">
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
                             <Button size="sm" onClick={() => { setEditingUser(u); setNewBalance(u.balance.toString()); }}>Edit Balance</Button>
                             <Button size="sm" variant="destructive" onClick={() => openConfirm("Delete User", "Are you sure?", () => deleteUserMutation.mutate(u.id))}>Delete</Button>
                        </div>
                    </div>
                ))}
              </div>
            </div>
          )}

          {tab === "deposits" && (
              <div className="space-y-4">
                <h1 className="text-xl font-black">Deposit Requests</h1>
                {deposits.map((d: any) => (
                    <DepositRow
                      key={d.id}
                      d={d}
                      onApprove={() => approveDepositMutation.mutate(d.id)}
                      onReject={() => rejectDepositMutation.mutate(d.id)}
                      approvePending={approveDepositMutation.isPending}
                      rejectPending={rejectDepositMutation.isPending}
                    />
                ))}
              </div>
          )}
          
          {/* ... Implement other tabs similarly ... */}
        </div>
      </div>
    </div>
  );
}
