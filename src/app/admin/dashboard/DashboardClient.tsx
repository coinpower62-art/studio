"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import gen1Img from "@assets/6f957afd1-300x300_1773138232842.png";
import gen2Img from "@assets/41c5f1dc-6c58-428e-b41f-2bc1784b1bd2_1773138232843.webp";
import gen3Img from "@assets/63f52963-e7bd-4550-aaf9-7b5c68b27b3a_1773138232844.jpg";
import gen4Img from "@assets/200kVA-250kVA-300kVA-400kVA-Electric-AC-Three-Phase-Silent-Die_1773138232846.jpg";
import defaultHeroImg from "@assets/grok_image_1771017969948_1773138463661.jpg";
import defaultTeamWorkImg from "@assets/grok_image_1771018028526_1773138463663.jpg";
import { apiRequest } from "@/lib/queryClient";
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
  Pencil, ImagePlus, Activity,
  Building2, Phone, Mail, MapPin, Lock, Percent, Clock, Menu, Gift
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
  adminToggleWithdrawalLock,
} from "./actions";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "activity" | "media" | "codes" | "settings" | "about";

const generatorImages: Record<string, string> = {
  pg1: gen1Img,
  pg2: gen2Img,
  pg3: gen3Img,
  pg4: gen4Img,
};

const activityDefaultImages: Record<string, string> = {
  hero: defaultHeroImg,
  teamwork: defaultTeamWorkImg,
};

type DepositRequest = {
  id: string; userId: string; username: string; fullName: string;
  amount: number; txId: string; date: string; status: "pending" | "approved" | "rejected"; createdAt: number;
};

type ActiveGen = { id: string; name: string; icon: string; dailyIncome: number; expiresAt: number; };
type UserRecord = {
  id: string; fullName: string; username: string; email: string;
  password: string; country: string; balance: number;
  referralCode: string | null; referredBy: string | null;
  activeGenerators?: ActiveGen[];
  activeGeneratorCount?: number;
  totalGenerators?: number;
};

type Generator = {
  id: string; name: string; subtitle: string; icon: string; color: string;
  price: number; expireDays: number; dailyIncome: number; published: boolean;
  roi: string; period: string; minInvest: string; maxInvest: string; investors: string;
};

type NewGenerator = Omit<Generator, "id">;

const BLANK_GEN: NewGenerator = {
  name: "", subtitle: "", icon: "⚡", color: "from-amber-400 to-orange-500",
  price: 0, expireDays: 30, dailyIncome: 0, published: false,
  roi: "", period: "Daily", minInvest: "", maxInvest: "", investors: "0",
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

function DepositRow({ d, onApprove, onReject, approvePending, rejectPending }: {
  d: DepositRequest;
  onApprove: () => void;
  onReject: () => void;
  approvePending: boolean;
  rejectPending: boolean;
}) {
  const isCard = Boolean(d.txId?.includes("[CARD") || d.txId?.toUpperCase().includes("CARD-"));
  return (
    <div data-testid={`deposit-${d.id}`} className={`bg-slate-800 rounded-2xl border p-4 flex flex-col gap-3 ${isCard && d.status === "pending" ? "border-orange-500/50" : "border-slate-700"}`}>
      {isCard && d.status === "pending" && (
        <div className="flex items-start gap-2 bg-orange-950/50 border border-orange-700/50 rounded-xl px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-300 text-xs font-bold">Card Payment — Verify Before Approving</p>
            <p className="text-orange-400/80 text-[11px] mt-0.5 leading-relaxed">
              Do NOT approve until you have confirmed the funds were actually received in your account. Fake or declined card payments will still appear here — always verify first.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCard ? "bg-blue-900/40" : d.status === "pending" ? "bg-amber-900/40" : d.status === "approved" ? "bg-green-900/40" : "bg-red-900/40"}`}>
            {isCard
              ? <CreditCard className={`w-5 h-5 ${d.status === "pending" ? "text-blue-400" : d.status === "approved" ? "text-green-400" : "text-red-400"}`} />
              : <DollarSign className={`w-5 h-5 ${d.status === "pending" ? "text-amber-400" : d.status === "approved" ? "text-green-400" : "text-red-400"}`} />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm">{d.fullName}</p>
              <span className="text-slate-400 text-xs">@{d.username}</span>
              {isCard && <Badge className="text-[10px] border px-1.5 py-0 bg-blue-900/40 text-blue-300 border-blue-700">CARD</Badge>}
              <Badge className={`text-xs border px-1.5 py-0 ${d.status === "pending" ? "bg-yellow-900/40 text-yellow-400 border-yellow-700" : d.status === "approved" ? "bg-green-900/40 text-green-400 border-green-700" : "bg-red-900/40 text-red-400 border-red-700"}`}>{d.status}</Badge>
            </div>
            <p className="text-slate-400 text-xs">TX: {d.txId} · {d.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-green-400 font-black text-base">${d.amount.toFixed(2)}</span>
          {d.status === "pending" ? (
            <div className="flex gap-2">
              <button data-testid={`button-approve-deposit-${d.id}`} onClick={onApprove} disabled={approvePending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold disabled:opacity-50">
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
              <button data-testid={`button-reject-deposit-${d.id}`} onClick={onReject} disabled={rejectPending}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 text-xs font-semibold disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          ) : (
            <span className={`flex items-center gap-1 text-xs font-semibold ${d.status === "approved" ? "text-green-400" : "text-red-400"}`}>
              {d.status === "approved" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {d.status === "approved" ? "Approved" : "Rejected"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const [, navigate] = useLocation();
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
  const [newGen, setNewGen] = useState<NewGenerator>({ ...BLANK_GEN });

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

  // Queries
  const { data: adminData, isLoading: adminLoading } = useQuery({ queryKey: ["adminData"], queryFn: adminGetAllData });

  const users = adminData?.data?.users || [];
  const generators = adminData?.data?.generators || [];
  const deposits = adminData?.data?.deposits || [];
  const withdrawals = adminData?.data?.withdrawals || [];
  const bonusCodes = adminData?.data?.codes || [];
  const activityPosts = adminData?.data?.activityPosts || [];
  const activityImages = adminData?.data?.activityImages || [];

  // Mutations
  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) => adminUpdateUserBalance(id, balance),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminData"] }); toast({ title: "Balance updated" }); setEditingUser(null); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminData"] }); toast({ title: "User deleted" }); },
  });

  const createGenMutation = useMutation({
    mutationFn: (data: any) => adminMutateGenerator("create", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminData"] }); setShowCreateGen(false); toast({ title: "Generator created" }); },
  });

  const deleteGenMutation = useMutation({
    mutationFn: (id: string) => adminMutateGenerator("delete", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminData"] }); toast({ title: "Generator deleted" }); },
  });

  const signoutMutation = useMutation({
    mutationFn: async () => {
        document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        navigate("/admin");
    }
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

  const pendingDepositsCount = deposits.filter((d: any) => d.status === "pending").length;
  const pendingCount = withdrawals.filter((w: any) => w.status === "pending").length;
  const totalBalanceVal = users.reduce((s: number, u: any) => s + (u.balance || 0), 0);

  const switchTabInternal = (id: Tab) => {
    if (id === "users") setSearch("");
    setTab(id);
    setSidebarOpen(false);
  };

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading admin panel...</p></div>;

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
    { id: "about",        label: "About",       icon: BarChart3,       color: "from-indigo-500 to-indigo-600" },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-900 text-white">

      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent className="bg-slate-800 border border-red-700/50 max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center mx-auto mb-1">
              <Shield className="w-6 h-6 text-red-400" />
            </div>
            <AlertDialogTitle className="text-white text-center text-lg">{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400 text-center text-sm leading-relaxed">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 justify-center mt-1">
            <AlertDialogCancel className="flex-1 bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }}
              className="flex-1 bg-red-700 hover:bg-red-600 text-white border-0">
              Yes, Action
            </AlertDialogAction>
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
                onClick={() => switchTabInternal(id)}
                data-testid={`sidebar-tab-${id}`}
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
            data-testid="button-open-sidebar"
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
        <p className="text-slate-300 text-xs font-semibold capitalize hidden sm:block">
          {tabs.find(t => t.id === tab)?.label || ""}
        </p>
        <div className="flex items-center gap-2">
          {(pendingDepositsCount > 0 || pendingCount > 0) && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1">
              <span className="text-amber-400 text-[10px] font-bold">{pendingDepositsCount + pendingCount} pending</span>
            </div>
          )}
          <button onClick={() => signoutMutation.mutate()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 text-xs font-semibold transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="pt-12 min-h-screen">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-6">
          {tab === "overview" && (
            <div className="space-y-5">
              <div><h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1><p className="text-slate-400 text-sm">Welcome back, Administrator</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: String(users.length), icon: Users, color: "from-blue-500 to-blue-600" },
                  { label: "Total Balance", value: `$${totalBalanceVal.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600" },
                  { label: "Pending Withdrawals", value: String(pendingCount), icon: ArrowUpFromLine, color: "from-amber-500 to-amber-600" },
                  { label: "Active Countries", value: "21", icon: Globe, color: "from-purple-500 to-purple-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}><Icon className="w-4 h-4 text-white" /></div>
                    <p className="text-xl font-black text-white">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">User Accounts</h1><p className="text-slate-400 text-sm">{users.length} registered users</p></div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 pr-8 h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm" />
                  </div>
                  <Button variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => setShowCreateUser(true)} size="sm" className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold flex-shrink-0 gap-1.5"><Plus className="w-3.5 h-3.5" /> Create User</Button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredUsersList.map(u => (
                  <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10"><AvatarFallback>{u.fullName?.charAt(0) || '?'}</AvatarFallback></Avatar>
                        <div><p className="text-white font-bold">{u.fullName}</p><p className="text-slate-400 text-xs">@{u.username}</p></div>
                      </div>
                      <p className="text-green-400 font-bold">${(u.balance || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
