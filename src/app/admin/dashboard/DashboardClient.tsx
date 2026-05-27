
"use client";

import { useState, useMemo } from "react";
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
  Pencil, ImagePlus, Activity,
  Building2, Phone, Mail, MapPin, Lock, Percent, Clock,
  ExternalLink, CreditCard, Menu, Gift
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

  const { data: admin, isLoading: adminLoading } = useQuery({ queryKey: ["/api/admin/me"], retry: false });
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"], enabled: !!admin, retry: false, refetchInterval: 30000,
  });
  const users = usersData || [];

  const { data: generatorsData, isLoading: gensLoading, refetch: refetchGens } = useQuery({
    queryKey: ["/api/admin/generators"], enabled: !!admin, retry: false,
  });
  const generatorsList = generatorsData || [];

  const { data: referrals = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/referrals"], enabled: !!admin && tab === "referrals", retry: false,
  });
  const { data: deposits = [], refetch: refetchDeposits } = useQuery<DepositRequest[]>({
    queryKey: ["/api/admin/deposits"], enabled: !!admin, retry: false, refetchInterval: 10000,
  });
  const { data: withdrawals = [], refetch: refetchWithdrawals } = useQuery<WithdrawalRecord[]>({
    queryKey: ["/api/admin/withdrawals"], enabled: !!admin, retry: false, refetchInterval: 15000,
  });
  const { data: activityImages = [], refetch: refetchActivityImgs } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-images"], enabled: !!admin && tab === "media", retry: false,
  });
  const { data: activityPosts = [], refetch: refetchActivityPosts } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-posts"], enabled: !!admin && tab === "activity", retry: false,
  });
  const { data: bonusCodes = [], refetch: refetchCodes } = useQuery<any[]>({
    queryKey: ["/api/admin/bonus-codes"], enabled: !!admin && tab === "codes", retry: false,
  });

  const [uploadingGenId, setUploadingGenId] = useState<string | null>(null);
  const [uploadingActivity, setUploadingActivity] = useState<string | null>(null);

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) => adminUpdateUserBalance(id, balance),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Balance updated" }); setEditingUser(null); setNewBalance(""); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User deleted" }); },
  });

  const createGenMutation = useMutation({
    mutationFn: (data: any) => adminMutateGenerator("create", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] }); setShowCreateGen(false); toast({ title: "Generator created" }); },
  });

  const deleteGenMutation = useMutation({
    mutationFn: (id: string) => adminMutateGenerator("delete", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] }); toast({ title: "Generator deleted" }); },
  });

  const signoutMutation = useMutation({
    mutationFn: async () => {
        document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    }
  });

  const createCodeMutation = useMutation({
    mutationFn: (data: { amount: number; note: string }) => adminCreateGiftCode(data.amount, data.note),
    onSuccess: (response: any) => {
      setGeneratedCode(response.data);
      setNewCodeAmount(""); setNewCodeNote("");
      refetchCodes();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id: string) => adminDeleteGiftCode(id),
    onSuccess: () => { refetchCodes(); toast({ title: "Code deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createUserMutation = useMutation({
    mutationFn: (data: any) => adminCreateUser(data),
    onSuccess: () => {
      refetchUsers();
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

  const switchTab = (id: Tab) => {
    if (id === "users") setSearch("");
    setTab(id);
    setSidebarOpen(false);
  };

  const uploadGenImage = async (genId: string, file: File) => {
    setUploadingGenId(genId);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`/api/admin/upload/generator/${genId}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] });
      toast({ title: "Image uploaded successfully" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingGenId(null);
    }
  };

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">Loading...</div>;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-900 text-white">
      {/* Sidebar logic */}
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
          {tabs.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="flex-1 text-left">{label}</span>
            </button>
          ))} dawn
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-slate-700 flex-shrink-0">
          <button onClick={() => signoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:ml-72 flex-1 p-6">
        {tab === "overview" && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard Overview</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <p className="text-slate-400 text-sm">Active Generators</p>
                <p className="text-2xl font-bold">{generatorsList.length}</p>
              </div>
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Users</h1>
              <Button onClick={() => setShowCreateUser(true)}>Add New User</Button>
            </div>
            <Input 
                placeholder="Search users..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="bg-slate-800 border-slate-700"
            />
            <div className="grid gap-4">
              {filteredUsersList.map(u => (
                <div key={u.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white">{u.full_name || u.fullName}</p>
                    <p className="text-sm text-slate-400">@{u.username}</p>
                    <p className="text-xs text-slate-500">Balance: ${u.balance?.toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {setEditingUser(u); setNewBalance(String(u.balance));}}>Edit Balance</Button>
                    <Button variant="destructive" size="sm" onClick={() => openConfirm("Delete User", "Are you sure?", () => deleteUserMutation.mutate(u.id))}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other tab contents (codes, deposits, etc.) follow similar pattern */}
      </div>

      <AlertDialog open={confirmDialog.open} onOpenChange={open => setConfirmDialog(s => ({ ...s, open }))}>
        <AlertDialogContent className="bg-slate-800 border border-red-700/50 max-w-sm">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center mx-auto mb-1">
              <AlertTriangle className="w-6 h-6 text-red-400" />
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
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
