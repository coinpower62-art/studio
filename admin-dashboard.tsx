import { useState } from "react";
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
  Pencil, ImagePlus, TrendingUp,
  Info, Building2, Phone, Mail, MapPin, Lock, Percent, Clock3,
  ExternalLink, Activity, Clock, ArrowUpRight, AlertTriangle, CreditCard, Menu, Gift
} from "lucide-react";

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

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const switchTab = (id: Tab) => {
    if (id === "users") setSearch("");
    setTab(id);
    setSidebarOpen(false);
  };
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });

  // Generator modal states
  const [showCreateGen, setShowCreateGen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generator | null>(null);
  const [newGen, setNewGen] = useState<NewGenerator>({ ...BLANK_GEN });

  const { data: admin, isLoading: adminLoading } = useQuery({ queryKey: ["/api/admin/me"], retry: false });
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<UserRecord[]>({
    queryKey: ["/api/admin/users"], enabled: !!admin, retry: false, refetchInterval: 30000,
  });
  const { data: generators = [], isLoading: gensLoading, refetch: refetchGens } = useQuery<Generator[]>({
    queryKey: ["/api/admin/generators"], enabled: !!admin, retry: false,
  });
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
  const [uploadingGenId, setUploadingGenId] = useState<string | null>(null);
  const [uploadingActivity, setUploadingActivity] = useState<string | null>(null);
  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");
  const [generatedCode, setGeneratedCode] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const { data: bonusCodes = [], refetch: refetchCodes } = useQuery<any[]>({
    queryKey: ["/api/admin/bonus-codes"], enabled: !!admin && tab === "codes", retry: false,
  });
  const [activityForm, setActivityForm] = useState({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });
  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) =>
      apiRequest("PATCH", `/api/admin/users/${id}/balance`, { balance }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Balance updated" }); setEditingUser(null); setNewBalance(""); },
  });
  const resetUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/users/${id}/reset`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Account reset to $0.00" }); },
  });
  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User deleted" }); },
  });
  const createActivityPostMutation = useMutation({
    mutationFn: async (data: typeof activityForm) => {
      const res = await apiRequest("POST", "/api/admin/activity-posts", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-posts"] });
      refetchActivityPosts();
      setActivityForm({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });
      toast({ title: "Activity post added!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteActivityPostMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/activity-posts/${id}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity-posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-posts"] });
      refetchActivityPosts();
      toast({ title: "Post deleted" });
    },
  });
  const approveDepositMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/admin/deposits/${id}/approve`, {}); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Deposit approved! Balance updated." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const rejectDepositMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/admin/deposits/${id}/reject`, {}); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] }); toast({ title: "Deposit rejected." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const approveWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/admin/withdrawals/${id}/approve`, {}); if (!r.ok) { const e = await r.json(); throw new Error(e.message); } return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] }); toast({ title: "Withdrawal approved!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const rejectWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/admin/withdrawals/${id}/reject`, {}); if (!r.ok) { const e = await r.json(); throw new Error(e.message); } return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] }); queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "Withdrawal rejected — balance refunded." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteWithdrawalMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("DELETE", `/api/admin/withdrawals/${id}`, {}); if (!r.ok) { const e = await r.json(); throw new Error(e.message); } return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] }); toast({ title: "Record deleted." }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const signoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/signout", {}),
    onSuccess: () => { queryClient.clear(); navigate("/admin"); },
  });
  const createGenMutation = useMutation({
    mutationFn: (data: NewGenerator) => apiRequest("POST", "/api/admin/generators", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] }); queryClient.invalidateQueries({ queryKey: ["/api/generators"] }); toast({ title: "Generator created!" }); setShowCreateGen(false); setNewGen({ ...BLANK_GEN }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateGenMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Generator> & { id: string }) =>
      apiRequest("PATCH", `/api/admin/generators/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] }); queryClient.invalidateQueries({ queryKey: ["/api/generators"] }); toast({ title: "Generator updated" }); setEditingGen(null); },
  });
  const deleteGenMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/generators/${id}`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] }); queryClient.invalidateQueries({ queryKey: ["/api/generators"] }); toast({ title: "Generator deleted" }); },
  });

  const createCodeMutation = useMutation({
    mutationFn: (data: { amount: number; note: string }) => apiRequest("POST", "/api/admin/bonus-codes", data).then(r => r.json()),
    onSuccess: (data: any) => {
      setGeneratedCode(data);
      setNewCodeAmount(""); setNewCodeNote("");
      refetchCodes();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bonus-codes"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCodeMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/bonus-codes/${id}`, {}),
    onSuccess: () => { refetchCodes(); toast({ title: "Code deleted" }); },
    onError: (e: any) => toast({ title: "Cannot delete used code", description: e.message, variant: "destructive" }),
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof createUserForm) => {
      const res = await apiRequest("POST", "/api/admin/users/create", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      refetchUsers();
      setShowCreateUser(false);
      setCreateUserForm({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
      toast({ title: "User created successfully!" });
    },
    onError: (e: any) => toast({ title: "Failed to create user", description: e.message, variant: "destructive" }),
  });

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading admin panel...</p></div>;
  if (!admin) { navigate("/admin"); return null; }

  const filtered = users.filter(u => [u.fullName, u.username, u.email, u.country].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingCount = withdrawals.filter(w => w.status === "pending").length;
  const pendingDepositsCount = deposits.filter(d => d.status === "pending").length;
  const copyText = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));

  const uploadGenImage = async (genId: string, file: File) => {
    setUploadingGenId(genId);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`/api/admin/upload/generator/${genId}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/generators"] });
      queryClient.invalidateQueries({ queryKey: ["/api/generators"] });
      toast({ title: "Image uploaded successfully" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingGenId(null);
    }
  };

  const uploadActivityImage = async (key: string, file: File) => {
    setUploadingActivity(key);
    const fd = new FormData();
    fd.append("image", file);
    try {
      const res = await fetch(`/api/admin/upload/activity/${key}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      queryClient.invalidateQueries({ queryKey: ["/api/admin/activity-images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity-images"] });
      refetchActivityImgs();
      toast({ title: "Activity image updated" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingActivity(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* ── GLOBAL CONFIRM DIALOG ── */}
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
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── SIDEBAR BACKDROP ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SLIDE-OUT SIDEBAR ── */}
      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-slate-900 border-r border-slate-700 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Sidebar header */}
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
          <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Admin badge */}
        <div className="mx-3 mt-3 mb-1 flex items-center gap-2.5 bg-slate-800 rounded-xl px-3 py-2.5 border border-slate-700">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-black text-white flex-shrink-0">A</div>
          <div>
            <p className="text-white text-xs font-bold">Administrator</p>
            <p className="text-slate-400 text-[10px]">Full access</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {tabs.map(({ id, label, icon: Icon, badge, color }) => {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={() => switchTab(id)}
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

        {/* Sign out */}
        <div className="px-3 pb-4 pt-2 border-t border-slate-700 flex-shrink-0">
          <button onClick={() => signoutMutation.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── TOP HEADER ── */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between">
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
        {/* Active tab label */}
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

      {/* Main */}
      <div className="pt-12 min-h-screen">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div><h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1><p className="text-slate-400 text-sm">Welcome back, Administrator</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: String(users.length), icon: Users, color: "from-blue-500 to-blue-600" },
                  { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600" },
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Recent Users</h3>
                    <button onClick={() => switchTab("users")} className="text-amber-400 text-xs flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  {users.length === 0 ? <p className="text-slate-500 text-sm">No users yet</p> : (
                    <div className="space-y-3">{users.slice(0, 5).map(u => {
                      const initials = u.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                      return (
                        <div key={u.id} className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 flex-shrink-0"><AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar>
                          <div className="flex-1 min-w-0"><p className="text-white text-sm font-medium truncate">{u.fullName}</p><p className="text-slate-400 text-xs">@{u.username}</p></div>
                          <p className="text-green-400 text-sm font-bold">${(u.balance || 0).toFixed(2)}</p>
                        </div>
                      );
                    })}</div>
                  )}
                </div>
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Pending Withdrawals</h3>
                    <button onClick={() => switchTab("withdrawals")} className="text-amber-400 text-xs flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="space-y-3">
                    {withdrawals.filter(w => w.status === "pending").slice(0, 4).map(w => (
                      <div key={w.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0"><p className="text-white text-sm font-medium truncate">{w.fullName}</p><p className="text-slate-400 text-xs">{w.method.toUpperCase()} · @{w.username}</p></div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-amber-400 text-sm font-bold">${w.amount.toFixed(2)}</span>
                          <Badge className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-1.5">pending</Badge>
                        </div>
                      </div>
                    ))}
                    {pendingCount === 0 && <p className="text-slate-500 text-sm">No pending withdrawals</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">User Accounts</h1><p className="text-slate-400 text-sm">{users.length} registered users</p></div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 pr-8 h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm" />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors" title="Clear search">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button onClick={() => refetchUsers()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => setShowCreateUser(true)} size="sm" className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold flex-shrink-0 gap-1.5"><Plus className="w-3.5 h-3.5" /> Create User</Button>
                </div>
              </div>

              {/* ── CREATE USER MODAL ── */}
              {showCreateUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                      <div>
                        <h2 className="text-white font-black text-lg">Create User Account</h2>
                        <p className="text-slate-400 text-xs mt-0.5">Account saves permanently to Supabase</p>
                      </div>
                      <button onClick={() => setShowCreateUser(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Full Name *</label>
                          <Input value={createUserForm.fullName} onChange={e => setCreateUserForm(f => ({ ...f, fullName: e.target.value }))}
                            placeholder="e.g. Kofi Mensah" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Username *</label>
                          <Input value={createUserForm.username} onChange={e => setCreateUserForm(f => ({ ...f, username: e.target.value }))}
                            placeholder="jamescole" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Email *</label>
                        <Input type="email" value={createUserForm.email} onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="james@example.com" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Password *</label>
                          <Input value={createUserForm.password} onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="Min 6 chars" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Starting Balance</label>
                          <Input type="number" min="0" step="0.01" value={createUserForm.balance} onChange={e => setCreateUserForm(f => ({ ...f, balance: e.target.value }))}
                            className="h-9 bg-slate-700 border-slate-600 text-white text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Country *</label>
                          <select value={createUserForm.country} onChange={e => setCreateUserForm(f => ({ ...f, country: e.target.value }))}
                            className="w-full h-9 rounded-md bg-slate-700 border border-slate-600 text-white text-sm px-3">
                            {["Ghana","Nigeria","Kenya","South Africa","Tanzania","Uganda","Cameroon","Côte d'Ivoire","Senegal","Ethiopia","Egypt","Morocco","United States","United Kingdom","Canada"].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Phone</label>
                          <Input value={createUserForm.phone} onChange={e => setCreateUserForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="+233..." className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => setShowCreateUser(false)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                        <Button
                          onClick={() => createUserMutation.mutate(createUserForm)}
                          disabled={createUserMutation.isPending || !createUserForm.fullName || !createUserForm.username || !createUserForm.email || !createUserForm.password}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold">
                          {createUserMutation.isPending ? "Creating…" : "✓ Create Account"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {search && filtered.length < users.length && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-300 text-sm">Search filter active — showing <span className="font-bold">{filtered.length}</span> of <span className="font-bold">{users.length}</span> users. <button onClick={() => setSearch("")} className="underline hover:text-amber-200">Clear filter</button></p>
                </div>
              )}
              {usersLoading ? <p className="text-slate-400 text-sm">Loading...</p> : filtered.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">{search ? "No users match your search" : "No users registered yet"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(u => {
                    const initials = u.fullName?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                    const isShowingPass = showPassFor === u.id;
                    return (
                      <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10 flex-shrink-0"><AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar>
                            <div className="min-w-0"><p className="text-white font-bold text-sm">{u.fullName}</p><p className="text-slate-400 text-xs">@{u.username} · {u.country}</p></div>
                          </div>
                          <p className="text-green-400 font-black text-base flex-shrink-0">${(u.balance || 0).toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">User ID</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-slate-200 text-xs font-mono truncate">{u.id}</p>
                              <button onClick={() => copyText(u.id, "User ID")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>
                            </div>
                          </div>
                          <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Referral Code</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-amber-400 text-xs font-bold font-mono">{u.referralCode || "—"}</p>
                              {u.referralCode && <button onClick={() => copyText(u.referralCode!, "Referral code")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>}
                            </div>
                          </div>
                          <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Email</p>
                            <p className="text-slate-200 text-xs truncate">{u.email}</p>
                          </div>
                          <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-0.5">Password</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-slate-200 text-xs font-mono flex-1 truncate">{isShowingPass ? u.password : "••••••••"}</p>
                              <button onClick={() => setShowPassFor(isShowingPass ? null : u.id)} className="text-slate-500 hover:text-amber-400 flex-shrink-0">{isShowingPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}</button>
                              {isShowingPass && <button onClick={() => copyText(u.password, "Password")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>}
                            </div>
                          </div>
                        </div>
                        {/* Active Plans */}
                        {u.activeGenerators && u.activeGenerators.length > 0 && (
                          <div className="mb-3">
                            <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide mb-1.5">Active Plans ({u.activeGeneratorCount})</p>
                            <div className="flex flex-wrap gap-1.5">
                              {u.activeGenerators.map((g, i) => (
                                <div key={i} className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/50 rounded-lg px-2 py-1">
                                  <span className="text-xs">{g.icon}</span>
                                  <span className="text-amber-300 text-[11px] font-bold">{g.name}</span>
                                  <span className="text-amber-500 text-[10px]">+${g.dailyIncome}/day</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {(!u.activeGenerators || u.activeGenerators.length === 0) && (
                          <div className="mb-3 px-3 py-2 rounded-xl bg-slate-700/30 border border-slate-700">
                            <p className="text-slate-500 text-[11px]">No active plans</p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setEditingUser(u); setNewBalance(String(u.balance || 0)); }}
                            data-testid={`button-edit-user-${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 text-xs font-semibold">
                            <Edit3 className="w-3 h-3" /> Edit Balance
                          </button>
                          <button onClick={() => { if (confirm(`Reset ${u.fullName}'s balance to $0?`)) resetUserMutation.mutate(u.id); }}
                            data-testid={`button-restart-user-${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-900/30 text-orange-400 border border-orange-800 hover:bg-orange-900/50 text-xs font-semibold">
                            <RotateCcw className="w-3 h-3" /> Restart
                          </button>
                          <button onClick={() => openConfirm(
                              "Delete User Account",
                              `You are about to permanently delete "${u.fullName}" (@${u.username}). Their balance, generators, and all data will be erased. This CANNOT be undone.`,
                              () => deleteUserMutation.mutate(u.id)
                            )}
                            data-testid={`button-delete-user-${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 text-xs font-semibold">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── DEPOSITS ── */}
          {tab === "deposits" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-white">Deposit Requests</h1>
                  <p className="text-slate-400 text-sm">{pendingDepositsCount} pending · {deposits.length} total</p>
                </div>
                <Button onClick={() => refetchDeposits()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
              {deposits.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No deposit requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deposits.map(d => (
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
            </div>
          )}

          {/* ── WITHDRAWALS ── */}
          {tab === "withdrawals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">Withdrawal Requests</h1><p className="text-slate-400 text-sm">{pendingCount} pending · {withdrawals.length} total</p></div>
                <Button onClick={() => refetchWithdrawals()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
              {withdrawals.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <ArrowUpFromLine className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No withdrawal requests yet.</p>
                </div>
              ) : (
              <div className="space-y-3">
                {withdrawals.map(w => {
                  const dateStr = new Date(w.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const methodLabel = w.method === "momo" ? "MTN MOMO" : w.method === "tigo" ? "AirtelTigo" : w.method === "usdt" ? "USDT" : w.method === "card" ? "CARD" : w.method.toUpperCase();
                  const statusColor = w.status === "approved" ? "bg-green-900/40 text-green-400 border-green-700" : w.status === "rejected" ? "bg-red-900/40 text-red-400 border-red-700" : "bg-yellow-900/40 text-yellow-400 border-yellow-700";
                  return (
                  <div key={w.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${w.status === "pending" ? "bg-yellow-900/40" : w.status === "approved" ? "bg-green-900/40" : "bg-red-900/40"}`}>
                        <ArrowUpFromLine className={`w-5 h-5 ${w.status === "pending" ? "text-yellow-400" : w.status === "approved" ? "text-green-400" : "text-red-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white font-semibold text-sm">{w.fullName}</p>
                          <Badge className={`text-xs border px-1.5 py-0 ${statusColor}`}>{w.status}</Badge>
                        </div>
                        <p className="text-slate-400 text-xs">@{w.username} · {methodLabel} · {w.country} · {dateStr}</p>
                        <p className="text-slate-500 text-xs">Net: <span className="text-slate-300">${w.netAmount.toFixed(2)}</span> · Fee: ${w.fee.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className="text-amber-400 font-black text-base">${w.amount.toFixed(2)}</span>
                      <div className="flex gap-2 items-center">
                        {w.status === "pending" ? (
                          <>
                            <button onClick={() => approveWithdrawalMutation.mutate(w.id)}
                              disabled={approveWithdrawalMutation.isPending}
                              data-testid={`button-approve-withdrawal-${w.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => openConfirm("Reject Withdrawal", `Reject withdrawal of $${w.amount.toFixed(2)} from ${w.fullName}? The amount will be refunded to their balance.`, () => rejectWithdrawalMutation.mutate(w.id))}
                              disabled={rejectWithdrawalMutation.isPending}
                              data-testid={`button-reject-withdrawal-${w.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 text-xs font-semibold disabled:opacity-50">
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </>
                        ) : w.status === "approved" ? (
                          <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> Rejected</span>
                        )}
                        <button
                          onClick={() => openConfirm(
                            "Delete Withdrawal Record",
                            `Remove the withdrawal record for $${w.amount.toFixed(2)} from ${w.fullName}? This cannot be undone.`,
                            () => deleteWithdrawalMutation.mutate(w.id)
                          )}
                          data-testid={`button-delete-withdrawal-${w.id}`}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-950/40 text-red-500 border border-red-800/50 hover:bg-red-900/50 hover:text-red-300 transition-colors flex-shrink-0"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* ── REFERRALS ── */}
          {tab === "referrals" && (
            <div className="space-y-4">
              <div><h1 className="text-xl font-black text-white">Referral Management</h1><p className="text-slate-400 text-sm">Track referral codes and referred users</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total Referrals", value: referrals.reduce((s: number, r: any) => s + r.referredCount, 0).toString(), icon: Link2, color: "text-amber-400" },
                  { label: "Active Codes", value: referrals.filter((r: any) => r.referralCode).length.toString(), icon: CheckCircle, color: "text-green-400" },
                  { label: "Total Users", value: referrals.length.toString(), icon: Users, color: "text-blue-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 text-center">
                    <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                    <p className="text-white text-xl font-black">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {referrals.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <Link2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No referral data yet.</p>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b border-slate-700 bg-slate-700/50">
                        <th className="text-left px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">User</th>
                        <th className="text-left px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">Referral Code</th>
                        <th className="text-center px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">Referred</th>
                        <th className="text-right px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">Balance</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-700">
                        {referrals.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-700/40 transition-colors">
                            <td className="px-4 py-3"><p className="text-white font-medium text-sm">{r.fullName}</p><p className="text-slate-400 text-xs">@{r.username}</p></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-bold font-mono text-xs bg-amber-900/30 border border-amber-700 px-2 py-0.5 rounded-lg">{r.referralCode || "—"}</span>
                                {r.referralCode && <button onClick={() => copyText(r.referralCode, "Referral code")} className="text-slate-500 hover:text-amber-400"><Copy className="w-3 h-3" /></button>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center"><Badge className={`text-xs border ${r.referredCount > 0 ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-700 text-slate-400 border-slate-600"}`}>{r.referredCount} users</Badge></td>
                            <td className="px-4 py-3 text-right"><span className="text-green-400 font-bold text-sm">${(r.balance || 0).toFixed(2)}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── GENERATORS FACTORY ── */}
          {tab === "generators" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-white">Generators Factory</h1>
                  <p className="text-slate-400 text-sm">Create, edit, publish generators · {generators.length} total · {generators.filter(g => g.published).length} published</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => refetchGens()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => { setNewGen({ ...BLANK_GEN }); setShowCreateGen(true); }}
                    data-testid="button-create-generator"
                    className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center gap-1.5 rounded-xl shadow-md">
                    <Plus className="w-4 h-4" /> New Generator
                  </Button>
                </div>
              </div>

              {gensLoading ? <p className="text-slate-400 text-sm">Loading generators...</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generators.map(g => (
                    <div key={g.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                      <div className={`bg-gradient-to-r ${g.color} p-4 flex items-center justify-between`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{g.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-white text-sm">{g.name}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${g.published ? "bg-green-500 text-white" : "bg-black/30 text-white/70"}`}>
                                {g.published ? "LIVE" : "DRAFT"}
                              </span>
                            </div>
                            <p className="text-white/70 text-xs">{g.subtitle}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-xl font-black">{g.roi}</p>
                          <p className="text-white/70 text-xs">{g.period}</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: "Generator ID", value: g.id },
                            { label: "Rent Price", value: `$${g.price.toLocaleString()}` },
                            { label: "Expire Days", value: `${g.expireDays} days` },
                            { label: "Daily Income", value: `$${g.dailyIncome}` },
                            { label: "Min Invest", value: g.minInvest },
                            { label: "Max Invest", value: g.maxInvest },
                          ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-700/50 rounded-xl px-2.5 py-2">
                              <p className="text-slate-400 text-[10px]">{label}</p>
                              <p className="text-white text-xs font-semibold truncate">{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingGen({ ...g })}
                            data-testid={`button-edit-gen-${g.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 text-xs font-semibold">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => updateGenMutation.mutate({ id: g.id, published: !g.published })}
                            data-testid={`button-publish-gen-${g.id}`}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${g.published ? "bg-green-900/30 border-green-600 text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.25)]" : "bg-slate-700/60 border-slate-600 text-slate-400 hover:border-slate-500"}`}
                          >
                            {/* Toggle track */}
                            <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${g.published ? "bg-green-500" : "bg-slate-600"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${g.published ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </div>
                            {/* Label */}
                            <span className="tracking-widest text-[11px]">{g.published ? "ON" : "OFF"}</span>
                          </button>
                          <button onClick={() => openConfirm(
                              "Delete Generator",
                              `Are you sure you want to delete "${g.name}"? Users who have already rented it will keep their plans, but it will be removed from the market.`,
                              () => deleteGenMutation.mutate(g.id)
                            )}
                            data-testid={`button-delete-gen-${g.id}`}
                            className="px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 text-xs font-semibold">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* ── ACTIVITY POSTS ── */}
          {tab === "activity" && (
            <div className="space-y-5 max-w-2xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-white">Activity Feed</h1>
                  <p className="text-slate-400 text-sm">Add posts that appear in the Live Activity Feed</p>
                </div>
                <Button onClick={() => refetchActivityPosts()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>

              {/* Add Post Form */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 space-y-4">
                <h2 className="text-white font-bold text-sm flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                  New Activity Post
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">User Name *</label>
                    <Input value={activityForm.username} onChange={e => setActivityForm(f => ({ ...f, username: e.target.value }))}
                      data-testid="input-activity-username" placeholder="e.g. John K."
                      className="h-10 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 placeholder:text-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Country *</label>
                    <Input value={activityForm.country} onChange={e => setActivityForm(f => ({ ...f, country: e.target.value }))}
                      data-testid="input-activity-country" placeholder="e.g. Ghana"
                      className="h-10 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 placeholder:text-slate-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-slate-400 text-xs mb-1.5 block">Action *</label>
                    <Input value={activityForm.action} onChange={e => setActivityForm(f => ({ ...f, action: e.target.value }))}
                      data-testid="input-activity-action" placeholder="e.g. Earned daily income from PG2 Generator"
                      className="h-10 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 placeholder:text-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Amount *</label>
                    <Input value={activityForm.amount} onChange={e => setActivityForm(f => ({ ...f, amount: e.target.value }))}
                      data-testid="input-activity-amount" placeholder="e.g. +$1.00"
                      className="h-10 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 placeholder:text-slate-500" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs mb-1.5 block">Badge Color</label>
                    <select value={activityForm.color} onChange={e => setActivityForm(f => ({ ...f, color: e.target.value }))}
                      data-testid="select-activity-color"
                      className="w-full h-10 bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 focus:border-amber-500 focus:outline-none">
                      <option value="from-amber-400 to-orange-500">Gold</option>
                      <option value="from-green-400 to-emerald-600">Green</option>
                      <option value="from-blue-400 to-indigo-600">Blue</option>
                      <option value="from-purple-500 to-pink-600">Purple</option>
                      <option value="from-red-400 to-rose-500">Red</option>
                      <option value="from-teal-400 to-cyan-500">Teal</option>
                    </select>
                  </div>
                </div>
                <Button
                  onClick={() => createActivityPostMutation.mutate(activityForm)}
                  disabled={createActivityPostMutation.isPending || !activityForm.username || !activityForm.country || !activityForm.action || !activityForm.amount}
                  data-testid="button-add-activity-post"
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl">
                  {createActivityPostMutation.isPending ? "Adding..." : "Add to Feed"}
                </Button>
              </div>

              {/* Posts List */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                  <h2 className="text-white font-bold text-sm">Published Posts ({activityPosts.length})</h2>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-green-400 text-xs font-medium">Live on Activity page</span>
                  </div>
                </div>
                {activityPosts.length === 0 ? (
                  <div className="p-8 text-center">
                    <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">No activity posts yet.</p>
                    <p className="text-slate-500 text-xs mt-1">Add your first post above to populate the activity feed.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {activityPosts.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm`}>
                          {p.avatar || p.username?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-xs font-semibold">{p.username}</p>
                            <span className="text-slate-500 text-xs">·</span>
                            <span className="text-slate-400 text-xs flex items-center gap-1"><Globe className="w-3 h-3" />{p.country}</span>
                          </div>
                          <p className="text-slate-400 text-xs truncate">{p.action}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <p className="text-green-400 text-xs font-bold flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />{p.amount}
                          </p>
                          <button onClick={() => openConfirm(
                              "Delete Activity Post",
                              `Remove this activity post by "${p.username}"? It will disappear from the Activity feed immediately.`,
                              () => deleteActivityPostMutation.mutate(p.id)
                            )}
                            data-testid={`button-delete-activity-${p.id}`}
                            className="p-1.5 rounded-lg bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── MEDIA ── */}
          {tab === "media" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-black text-white">Media Manager</h1>
                <p className="text-slate-400 text-sm">Upload images for generators and activity pages</p>
              </div>

              {/* Generator Images */}
              <div>
                <h2 className="text-base font-bold text-amber-400 mb-3 flex items-center gap-2"><Zap className="w-4 h-4" /> Generator Images</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generators.map(g => {
                    const currentImg = (g as any).imageUrl;
                    const isUploading = uploadingGenId === g.id;
                    return (
                      <div key={g.id} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className={`bg-gradient-to-r ${g.color} px-4 py-2.5 flex items-center gap-2`}>
                          <span className="text-lg">{g.icon}</span>
                          <p className="font-bold text-white text-sm">{g.name}</p>
                        </div>
                        <div className="p-4">
                          <div className="w-full h-32 rounded-xl overflow-hidden bg-slate-700 mb-3 relative">
                            {(currentImg || generatorImages[g.id]) ? (
                              <img
                                src={currentImg || generatorImages[g.id]}
                                alt={g.name}
                                className="w-full h-full object-cover"
                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; const fb = e.currentTarget.nextElementSibling as HTMLElement; if (fb) fb.style.display = "flex"; }}
                              />
                            ) : null}
                            <div className={`w-full h-full ${(currentImg || generatorImages[g.id]) ? "hidden" : "flex"} flex-col items-center justify-center gap-1`} style={{ display: (currentImg || generatorImages[g.id]) ? "none" : "flex" }}>
                              <ImagePlus className="w-8 h-8 text-slate-500" />
                              <p className="text-slate-500 text-xs">No image</p>
                            </div>
                          </div>
                          <label data-testid={`upload-gen-${g.id}`}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${isUploading ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed" : "bg-amber-500/20 text-amber-400 border-amber-600 hover:bg-amber-500/30"}`}>
                            {isUploading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> {currentImg ? "Replace Image" : "Upload Image"}</>}
                            <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadGenImage(g.id, f); e.target.value = ""; }} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activity Images */}
              <div>
                <h2 className="text-base font-bold text-amber-400 mb-3 flex items-center gap-2"><Globe className="w-4 h-4" /> Activity Page Images</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: "hero", label: "Hero Banner", desc: "Main banner at the top of the Activity page" },
                    { key: "teamwork", label: "Teamwork Photo", desc: "Team photo shown in the community section" },
                  ].map(({ key, label, desc }) => {
                    const current = activityImages.find((i: any) => i.key === key);
                    const isUploading = uploadingActivity === key;
                    return (
                      <div key={key} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="bg-slate-700/50 px-4 py-2.5">
                          <p className="font-bold text-white text-sm">{label}</p>
                          <p className="text-slate-400 text-xs">{desc}</p>
                        </div>
                        <div className="p-4">
                          <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-700 mb-3">
                            {(current?.url || activityDefaultImages[key]) ? (
                              <img src={current?.url || activityDefaultImages[key]} alt={label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                <ImagePlus className="w-8 h-8 text-slate-500" />
                                <p className="text-slate-500 text-xs">No image</p>
                              </div>
                            )}
                          </div>
                          <label data-testid={`upload-activity-${key}`}
                            className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${isUploading ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed" : "bg-amber-500/20 text-amber-400 border-amber-600 hover:bg-amber-500/30"}`}>
                            {isUploading ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Uploading...</> : <><Upload className="w-3.5 h-3.5" /> {current?.url ? "Replace Image" : "Upload Image"}</>}
                            <input type="file" accept="image/*" className="hidden" disabled={isUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadActivityImage(key, f); e.target.value = ""; }} />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── GIFT CODES ── */}
          {tab === "codes" && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-black text-white">Gift Codes</h1>
                <p className="text-slate-400 text-sm">Generate bonus codes to reward users — they paste the code in their Gift Box to receive funds</p>
              </div>

              {/* Generate form */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                <h2 className="text-rose-400 font-bold text-sm mb-4 flex items-center gap-2"><Gift className="w-4 h-4" /> Generate New Code</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Amount ($)</p>
                    <input type="number" min="0.01" step="0.01" placeholder="e.g. 5.00" value={newCodeAmount}
                      onChange={e => setNewCodeAmount(e.target.value)} data-testid="input-code-amount"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Label / Note (optional)</p>
                    <input type="text" placeholder="e.g. Welcome Bonus" value={newCodeNote}
                      onChange={e => setNewCodeNote(e.target.value)} data-testid="input-code-note"
                      className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500" />
                  </div>
                </div>
                <button
                  data-testid="button-generate-code"
                  onClick={() => createCodeMutation.mutate({ amount: Number(newCodeAmount), note: newCodeNote })}
                  disabled={!newCodeAmount || Number(newCodeAmount) <= 0 || createCodeMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Gift className="w-4 h-4" />
                  {createCodeMutation.isPending ? "Generating..." : "Generate Code"}
                </button>
              </div>

              {/* Generated code display */}
              {generatedCode && (
                <div className="bg-gradient-to-r from-rose-900/40 to-pink-900/40 border border-rose-500/50 rounded-2xl p-5">
                  <p className="text-rose-300 text-xs font-semibold uppercase tracking-wide mb-2">✓ New Code Ready — Share with user</p>
                  <div className="flex items-center gap-3 bg-slate-900 rounded-xl px-4 py-3 mb-3">
                    <p className="text-white font-black text-xl tracking-widest flex-1 font-mono">{generatedCode.code}</p>
                    <button data-testid="button-copy-generated-code"
                      onClick={() => { navigator.clipboard.writeText(generatedCode.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold">
                      {copiedCode ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-green-900/40 text-green-400 border border-green-700 rounded-full px-3 py-1 text-xs font-bold">+${generatedCode.amount}</span>
                    {generatedCode.note && <span className="bg-slate-800 text-slate-300 rounded-full px-3 py-1 text-xs">{generatedCode.note}</span>}
                    <button onClick={() => setGeneratedCode(null)} className="text-slate-500 text-xs hover:text-slate-300 ml-auto">Dismiss ✕</button>
                  </div>
                </div>
              )}

              {/* All codes list */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-slate-300 font-bold text-sm">All Codes <span className="text-slate-500">({bonusCodes.length})</span></h2>
                  <div className="flex gap-2 text-[10px] font-bold">
                    <span className="bg-green-900/40 text-green-400 border border-green-700 rounded-full px-2 py-0.5">{bonusCodes.filter((c: any) => !c.isUsed).length} active</span>
                    <span className="bg-slate-700 text-slate-400 rounded-full px-2 py-0.5">{bonusCodes.filter((c: any) => c.isUsed).length} used</span>
                  </div>
                </div>
                {bonusCodes.length === 0 ? (
                  <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                    <Gift className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">No codes yet</p>
                    <p className="text-slate-600 text-xs mt-1">Generate your first bonus code above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {bonusCodes.map((bc: any) => (
                      <div key={bc.id} data-testid={`code-row-${bc.id}`}
                        className={`bg-slate-800 rounded-xl border p-3.5 flex items-center gap-3 ${bc.isUsed ? "border-slate-700/60 opacity-70" : "border-slate-600"}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${bc.isUsed ? "bg-slate-500" : "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-black tracking-widest text-sm font-mono">{bc.code}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bc.isUsed ? "bg-slate-700 text-slate-400" : "bg-green-900/50 text-green-400 border border-green-700"}`}>{bc.isUsed ? "USED" : "ACTIVE"}</span>
                            <span className="bg-amber-900/30 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-700/50">${bc.amount}</span>
                            {bc.note && <span className="text-slate-400 text-xs italic">{bc.note}</span>}
                          </div>
                          {bc.isUsed && bc.usedByUsername && (
                            <p className="text-slate-500 text-xs mt-0.5">Used by <span className="text-slate-400">@{bc.usedByUsername}</span> · {bc.usedAt ? new Date(bc.usedAt).toLocaleString() : ""}</p>
                          )}
                          {!bc.isUsed && <p className="text-slate-600 text-[10px] mt-0.5">Created {new Date(bc.createdAt).toLocaleDateString()}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!bc.isUsed && (
                            <button onClick={() => { navigator.clipboard.writeText(bc.code); toast({ title: "Code copied!" }); }}
                              className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!bc.isUsed && (
                            <button
                              onClick={() => openConfirm("Delete Code", `Delete code "${bc.code}" ($${bc.amount})? It cannot be used after this.`, () => deleteCodeMutation.mutate(bc.id))}
                              className="p-1.5 rounded-lg bg-red-900/30 text-red-400 border border-red-800/50 hover:bg-red-900/50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div className="space-y-4 max-w-xl">
              <div><h1 className="text-xl font-black text-white">Admin Settings</h1><p className="text-slate-400 text-sm">Platform configuration</p></div>
              {[
                { label: "Platform Name", value: "CoinPower" },
                { label: "Admin Username", value: "admin" },
                { label: "Admin Password", value: "coinpower2026" },
                { label: "Withdrawal Fee", value: "15%" },
                { label: "Processing Time", value: "1 – 24 hours" },
                { label: "Manager Contact", value: "+233592682060" },
                { label: "Deposit Number", value: "+233592682060 (M.F)" },
                { label: "Headquarters", value: "Rome, Italy" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center justify-between">
                  <div><p className="text-slate-400 text-xs">{label}</p><p className="text-white font-semibold text-sm mt-0.5">{value}</p></div>
                  <button onClick={() => copyText(value, label)} className="text-slate-500 hover:text-amber-400 p-1"><Copy className="w-4 h-4" /></button>
                </div>
              ))}
              {/* ── DATA BACKUP ── */}
              <div className="bg-slate-800 rounded-xl border border-amber-500/30 p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md flex-shrink-0">
                    <ArrowUpFromLine className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-amber-400 font-bold text-sm">Data Backup &amp; Export</p>
                    <p className="text-slate-400 text-xs">Download a copy of all platform data</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href="/api/admin/export/json"
                    download
                    data-testid="button-export-json"
                    className="flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 font-semibold text-sm rounded-xl h-10 px-4 transition-colors"
                  >
                    <ArrowUpFromLine className="w-4 h-4" />
                    Full Backup (JSON)
                  </a>
                  <a
                    href="/api/admin/export/users-csv"
                    download
                    data-testid="button-export-csv"
                    className="flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500/50 text-green-300 font-semibold text-sm rounded-xl h-10 px-4 transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    Users List (CSV)
                  </a>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-3 py-2">
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    <span className="text-amber-400 font-semibold">Full Backup</span> includes all users, deposits, and generator data in JSON format. <span className="text-green-400 font-semibold">Users CSV</span> opens in Excel/Sheets showing all accounts with balances.
                  </p>
                </div>
              </div>

              <div className="bg-slate-800 rounded-xl border border-red-900/40 p-4">
                <p className="text-red-400 font-semibold text-sm mb-1">Danger Zone</p>
                <p className="text-slate-400 text-xs mb-3">Sign out of the admin session</p>
                <Button onClick={() => signoutMutation.mutate()} className="bg-red-900/30 border border-red-700 text-red-400 hover:bg-red-900/50 text-sm font-semibold rounded-xl h-9">Sign Out of Admin</Button>
              </div>
            </div>
          )}

          {/* ── ABOUT ── */}
          {tab === "about" && (
            <div className="space-y-5 max-w-2xl">
              <div>
                <h1 className="text-xl font-black text-white">About CoinPower</h1>
                <p className="text-slate-400 text-sm">Platform information &amp; contact details</p>
              </div>

              {/* Brand card */}
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg flex-shrink-0">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-black text-lg">CoinPower</h2>
                  <p className="text-amber-400 text-sm font-semibold">Investment &amp; Power Generation Platform</p>
                  <p className="text-slate-400 text-xs mt-1">© {new Date().getFullYear()} CoinPower. All rights reserved.</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: Building2, label: "Company", value: "CoinPower Ltd.", color: "from-blue-500 to-blue-600" },
                  { icon: MapPin,    label: "Headquarters", value: "Rome, Italy", color: "from-rose-500 to-pink-600" },
                  { icon: Globe,     label: "Website", value: "coinpower.replit.app", color: "from-teal-500 to-cyan-600" },
                  { icon: Phone,     label: "Manager Phone", value: "+233592682060", color: "from-green-500 to-emerald-600" },
                  { icon: Mail,      label: "Deposit Account", value: "M.F", color: "from-violet-500 to-purple-600" },
                  { icon: Phone,     label: "Deposit Number", value: "+233592682060", color: "from-amber-500 to-orange-500" },
                  { icon: Percent,   label: "Withdrawal Fee", value: "15%", color: "from-red-500 to-rose-600" },
                  { icon: Clock3,    label: "Processing Time", value: "1 – 24 Hours", color: "from-indigo-500 to-indigo-600" },
                  { icon: Lock,      label: "Admin Username", value: "admin", color: "from-slate-500 to-slate-600" },
                  { icon: Lock,      label: "Admin Password", value: "coinpower2026", color: "from-slate-500 to-slate-600" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-400 text-xs">{label}</p>
                      <p className="text-white font-semibold text-sm truncate">{value}</p>
                    </div>
                    <button onClick={() => copyText(value, label)} className="text-slate-500 hover:text-amber-400 p-1 flex-shrink-0">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Generators summary */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-sm">Generator Plans</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: "PG1", price: "FREE", daily: "$0.20/day", days: "3 days" },
                    { name: "PG2", price: "$10",  daily: "$1.00/day", days: "10 days" },
                    { name: "PG3", price: "$15",  daily: "$1.20/day", days: "15 days" },
                    { name: "PG4", price: "$20",  daily: "$1.50/day", days: "20 days" },
                  ].map(({ name, price, daily, days }) => (
                    <div key={name} className="bg-slate-700/60 rounded-lg px-3 py-2.5 border border-slate-600">
                      <p className="text-amber-400 font-bold text-sm">{name} · {price}</p>
                      <p className="text-slate-300 text-xs">{daily}</p>
                      <p className="text-slate-500 text-xs">{days}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-3">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-slate-400" /> Quick Links
                </h3>
                {[
                  { label: "Telegram Group", url: "https://t.me/coinpow_group", color: "text-blue-400" },
                  { label: "User App", url: "/", color: "text-amber-400" },
                  { label: "Admin Panel", url: "/admin", color: "text-green-400" },
                ].map(({ label, url, color }) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                    className={`flex items-center justify-between ${color} hover:underline text-sm font-medium`}>
                    <span>{label}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4"><h3 className="text-white font-bold">Edit User Balance</h3><button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
            <p className="text-slate-300 text-sm font-medium">{editingUser.fullName}</p>
            <p className="text-slate-500 text-xs mb-1">@{editingUser.username} · {editingUser.country}</p>
            <p className="text-green-400 text-sm mb-4">Current: ${(editingUser.balance || 0).toFixed(2)}</p>
            <div className="mb-4">
              <label className="text-slate-300 text-xs font-medium mb-1.5 block">New Balance ($)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} data-testid="input-new-balance" placeholder="0.00" min="0" step="0.01" className="pl-7 h-11 bg-slate-700 border-slate-600 text-white focus:border-amber-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
              <Button onClick={() => updateBalanceMutation.mutate({ id: editingUser.id, balance: parseFloat(newBalance) || 0 })} disabled={updateBalanceMutation.isPending} data-testid="button-save-balance" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                {updateBalanceMutation.isPending ? "Saving..." : "Save Balance"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Generator Modal */}
      {showCreateGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div><h3 className="text-white font-black text-lg">Create New Generator</h3><p className="text-slate-400 text-xs mt-0.5">Fill in the details and publish</p></div>
              <button onClick={() => setShowCreateGen(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Generator Name *</label>
                  <Input value={newGen.name} onChange={e => setNewGen({ ...newGen, name: e.target.value })} placeholder="e.g. PG5 Generator" data-testid="input-gen-name" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Subtitle</label>
                  <Input value={newGen.subtitle} onChange={e => setNewGen({ ...newGen, subtitle: e.target.value })} placeholder="e.g. Ultra Power Plan" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Rent Price ($) *</label>
                  <Input type="number" value={newGen.price || ""} onChange={e => setNewGen({ ...newGen, price: parseFloat(e.target.value) || 0 })} placeholder="100" data-testid="input-gen-price" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Expire Days *</label>
                  <Input type="number" value={newGen.expireDays || ""} onChange={e => setNewGen({ ...newGen, expireDays: parseInt(e.target.value) || 0 })} placeholder="30" data-testid="input-gen-expire" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Daily Income ($) *</label>
                  <Input type="number" value={newGen.dailyIncome || ""} onChange={e => setNewGen({ ...newGen, dailyIncome: parseFloat(e.target.value) || 0 })} placeholder="10" data-testid="input-gen-income" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">ROI Display</label>
                  <Input value={newGen.roi} onChange={e => setNewGen({ ...newGen, roi: e.target.value })} placeholder="e.g. 8%" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Period</label>
                  <Input value={newGen.period} onChange={e => setNewGen({ ...newGen, period: e.target.value })} placeholder="Daily" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Icon (emoji)</label>
                  <Input value={newGen.icon} onChange={e => setNewGen({ ...newGen, icon: e.target.value })} placeholder="⚡" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 text-center" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Min Invest</label>
                  <Input value={newGen.minInvest} onChange={e => setNewGen({ ...newGen, minInvest: e.target.value })} placeholder="$100" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Max Invest</label>
                  <Input value={newGen.maxInvest} onChange={e => setNewGen({ ...newGen, maxInvest: e.target.value })} placeholder="$9,999" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-xs font-medium mb-2 block">Color Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => setNewGen({ ...newGen, color: c.value })}
                      className={`h-10 rounded-xl bg-gradient-to-r ${c.value} text-white text-xs font-bold border-2 transition-all ${newGen.color === c.value ? "border-white scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-semibold">Publish immediately</p>
                  <p className="text-slate-400 text-xs">Make visible in Market</p>
                </div>
                <button onClick={() => setNewGen({ ...newGen, published: !newGen.published })}
                  data-testid="toggle-gen-published"
                  className={`w-12 h-6 rounded-full transition-colors relative ${newGen.published ? "bg-green-500" : "bg-slate-600"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${newGen.published ? "translate-x-6" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Preview */}
              {newGen.name && (
                <div className={`rounded-xl bg-gradient-to-r ${newGen.color} p-3 flex items-center gap-3`}>
                  <span className="text-2xl">{newGen.icon}</span>
                  <div className="flex-1">
                    <p className="text-white font-black text-sm">{newGen.name}</p>
                    <p className="text-white/70 text-xs">${newGen.price}/rent · ${newGen.dailyIncome}/day · {newGen.expireDays}d</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${newGen.published ? "bg-green-500 text-white" : "bg-black/30 text-white/70"}`}>{newGen.published ? "LIVE" : "DRAFT"}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <Button onClick={() => setShowCreateGen(false)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
              <Button
                onClick={() => { if (!newGen.name) { toast({ title: "Name is required", variant: "destructive" }); return; } createGenMutation.mutate(newGen); }}
                disabled={createGenMutation.isPending}
                data-testid="button-save-new-generator"
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                {createGenMutation.isPending ? "Creating..." : <><Plus className="w-4 h-4 mr-1" /> Create Generator</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Generator Modal */}
      {editingGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2"><span>{editingGen.icon}</span>{editingGen.name}</h3>
              <button onClick={() => setEditingGen(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Name", key: "name", type: "text" },
                { label: "Subtitle", key: "subtitle", type: "text" },
                { label: "ROI Display", key: "roi", type: "text" },
                { label: "Period", key: "period", type: "text" },
                { label: "Rent Price ($)", key: "price", type: "number" },
                { label: "Expire Days", key: "expireDays", type: "number" },
                { label: "Daily Income ($)", key: "dailyIncome", type: "number" },
                { label: "Min Invest", key: "minInvest", type: "text" },
                { label: "Max Invest", key: "maxInvest", type: "text" },
                { label: "Investors", key: "investors", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="text-slate-400 text-xs font-medium mb-1 block">{label}</label>
                  <Input type={type} value={(editingGen as any)[key]} onChange={e => setEditingGen({ ...editingGen, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value })}
                    className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              ))}
              <div>
                <label className="text-slate-300 text-xs font-medium mb-2 block">Color Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(c => (
                    <button key={c.value} onClick={() => setEditingGen({ ...editingGen, color: c.value })}
                      className={`h-8 rounded-xl bg-gradient-to-r ${c.value} text-white text-xs font-bold border-2 transition-all ${editingGen.color === c.value ? "border-white scale-105" : "border-transparent opacity-70"}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setEditingGen(null)} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
              <Button onClick={() => updateGenMutation.mutate(editingGen)} disabled={updateGenMutation.isPending} data-testid="button-save-generator" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                <Save className="w-3.5 h-3.5 mr-1.5" />{updateGenMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
