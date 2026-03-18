
'use client';

import { useState, useEffect } from "react";
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
  Pencil, ImagePlus,
  Info, Building2, Phone, Mail, MapPin, Percent, Clock3,
  ExternalLink, Activity, Clock, ArrowUpRight, AlertTriangle, CreditCard, Menu, Gift
} from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { countries } from "@/lib/data";


type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "activity" | "media" | "codes" | "settings" | "about";

const generatorImages: Record<string, string | undefined> = {
  pg1: PlaceHolderImages.find(i => i.id === 'gen-pg1')?.imageUrl,
  pg2: PlaceHolderImages.find(i => i.id === 'gen-pg2')?.imageUrl,
  pg3: PlaceHolderImages.find(i => i.id === 'gen-pg3')?.imageUrl,
  pg4: PlaceHolderImages.find(i => i.id === 'gen-pg4')?.imageUrl,
};

const activityDefaultImages: Record<string, string | undefined> = {
  hero: PlaceHolderImages.find(i => i.id === 'activity-hero')?.imageUrl,
  teamwork: PlaceHolderImages.find(i => i.id === 'activity-teamwork')?.imageUrl,
};

type DepositRequest = {
  id: string; userId: string; username: string; fullName: string;
  amount: number; txId: string; date: string; status: "pending" | "approved" | "rejected"; createdAt: number;
};

type ActiveGen = { id: string; name: string; icon: string; dailyIncome: number; expiresAt: number; };
type UserRecord = {
  id: string; fullName: string; username: string; email: string;
  password?: string; country: string; balance: number;
  referralCode: string | null; referredBy: string | null;
  referralCount?: number;
  activeGenerators?: ActiveGen[];
  activeGeneratorCount?: number;
  totalGenerators?: number;
  phone?: string;
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

type ActivityPost = {
  id: string; username: string; country: string; action: string; amount: string; color: string; createdAt: number;
}

// MOCK DATA
const MOCK_USERS: UserRecord[] = [
  { id: 'usr_1', fullName: 'John Doe', username: 'johndoe', email: 'john.d@example.com', country: 'United States', balance: 1250, referralCode: 'CP-JOHN', referredBy: null, referralCount: 1, activeGeneratorCount: 2, password: 'password123' },
  { id: 'usr_2', fullName: 'Ama Serwaa', username: 'amaser', email: 'ama.s@example.com', country: 'Ghana', balance: 850.50, referralCode: 'CP-AMAS', referredBy: 'CP-JOHN', referralCount: 1, activeGeneratorCount: 1, password: 'password123' },
  { id: 'usr_3', fullName: 'Chioma Okoro', username: 'chiooko', email: 'chioma.o@example.com', country: 'Nigeria', balance: 3200, referralCode: 'CP-CHIO', referredBy: 'CP-AMAS', referralCount: 0, activeGeneratorCount: 3, password: 'password123' },
];

const MOCK_DEPOSITS: DepositRequest[] = [
  { id: 'dep_1', userId: 'usr_1', username: 'johndoe', fullName: 'John Doe', amount: 500, txId: 'TX12345', date: '2024-03-10', status: 'approved', createdAt: Date.now() - 200000 },
  { id: 'dep_2', userId: 'usr_2', username: 'amaser', fullName: 'Ama Serwaa', amount: 250, txId: 'TX67890', date: '2024-03-11', status: 'pending', createdAt: Date.now() - 100000 },
  { id: 'dep_3', userId: 'usr_3', username: 'chiooko', fullName: 'Chioma Okoro', amount: 1000, txId: 'TX54321', date: '2024-03-11', status: 'rejected', createdAt: Date.now() - 50000 },
];

const MOCK_WITHDRAWALS: WithdrawalRecord[] = [
  { id: 'wd_1', userId: 'usr_1', username: 'johndoe', fullName: 'John Doe', country: 'United States', method: 'MTN MOMO', amount: 100, netAmount: 85, fee: 15, details: '0241234567', status: 'approved', createdAt: Date.now() - 300000 },
  { id: 'wd_2', userId: 'usr_3', username: 'chiooko', fullName: 'Chioma Okoro', country: 'Nigeria', method: 'MTN MOMO', amount: 500, netAmount: 425, fee: 75, details: '08012345678', status: 'pending', createdAt: Date.now() - 150000 },
]

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
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Mock Data State ---
  const [admin, setAdmin] = useState<{name: string} | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [gensLoading, setGensLoading] = useState(true);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [activityPosts, setActivityPosts] = useState<ActivityPost[]>([]);

  useEffect(() => {
    // Simulate auth check
    const isAdminLoggedIn = localStorage.getItem('admin_logged_in') === 'true';
    if (!isAdminLoggedIn) {
      router.push('/admin');
    } else {
      setAdmin({ name: 'Admin' });
    }
    setAdminLoading(false);
    
    // Simulate data fetching
    setTimeout(() => {
      setUsers(MOCK_USERS);
      setUsersLoading(false);
      // @ts-ignore
      setGenerators(require('@/lib/data').generators);
      setGensLoading(false);
      setDeposits(MOCK_DEPOSITS.sort((a,b) => b.createdAt - a.createdAt));
      setWithdrawals(MOCK_WITHDRAWALS.sort((a,b) => b.createdAt - a.createdAt));
    }, 1000);
  }, [router]);


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

  const [uploadingGenId, setUploadingGenId] = useState<string | null>(null);
  const [uploadingActivity, setUploadingActivity] = useState<string | null>(null);
  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");
  const [generatedCode, setGeneratedCode] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [bonusCodes, setBonusCodes] = useState<any[]>([]);

  const [activityForm, setActivityForm] = useState({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });
  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  // --- Mock Mutations ---
  const handleSignOut = () => {
    localStorage.removeItem('admin_logged_in');
    router.push('/admin');
  };

  const handleUpdateBalance = (userId: string, newBalance: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? {...u, balance: newBalance} : u));
    toast({ title: 'Balance updated' });
    setEditingUser(null);
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: 'User deleted' });
  }

  const handleCreateUser = () => {
    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      balance: parseFloat(createUserForm.balance),
      referralCount: 0,
      referralCode: `CP-NEW${Date.now()}`.slice(0,10),
      referredBy: null,
      ...createUserForm
    }
    setUsers(prev => [newUser, ...prev]);
    toast({ title: "User created successfully!" });
    setShowCreateUser(false);
    setCreateUserForm({ fullName: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
  }

  const handleCreateActivityPost = () => {
    const newPost: ActivityPost = {
      id: `act_${Date.now()}`,
      createdAt: Date.now(),
      ...activityForm,
    }
    setActivityPosts(prev => [newPost, ...prev]);
    toast({ title: "Activity post created!" });
    setActivityForm({ username: "", country: "", action: "", amount: "", color: "from-amber-400 to-orange-500" });
  }
  
  const handleDeleteActivityPost = (id: string) => {
    setActivityPosts(prev => prev.filter(p => p.id !== id));
    toast({ title: "Activity post deleted." });
  }
  
  const handleApproveDeposit = (id: string) => {
    setDeposits(prev => prev.map(d => d.id === id ? {...d, status: 'approved'} : d));
    const deposit = deposits.find(d => d.id === id);
    if(deposit) {
        setUsers(prev => prev.map(u => u.id === deposit.userId ? {...u, balance: u.balance + deposit.amount} : u));
    }
    toast({ title: "Deposit approved! Balance updated." });
  }
  const handleRejectDeposit = (id: string) => {
    setDeposits(prev => prev.map(d => d.id === id ? {...d, status: 'rejected'} : d));
    toast({ title: "Deposit rejected." });
  }

  const handleApproveWithdrawal = (id: string) => {
    setWithdrawals(prev => prev.map(w => w.id === id ? {...w, status: 'approved'} : w));
    toast({ title: "Withdrawal approved!" });
  }

  const handleRejectWithdrawal = (id: string) => {
     setWithdrawals(prev => prev.map(w => w.id === id ? {...w, status: 'rejected'} : w));
    const withdrawal = withdrawals.find(w => w.id === id);
    if(withdrawal) {
        setUsers(prev => prev.map(u => u.id === withdrawal.userId ? {...u, balance: u.balance + withdrawal.amount} : u));
    }
    toast({ title: "Withdrawal rejected — balance refunded." });
  }

  const handleDeleteWithdrawal = (id: string) => {
    setWithdrawals(prev => prev.filter(w => w.id !== id));
    toast({ title: "Record deleted." });
  }

  const handleCreateGenerator = () => {
    const createdGen: Generator = {
      id: `gen_${Date.now()}`,
      ...newGen,
    };
    setGenerators(prev => [createdGen, ...prev]);
    toast({ title: "Generator created!" });
    setShowCreateGen(false);
    setNewGen({ ...BLANK_GEN });
  }

  const handleUpdateGenerator = () => {
    if (editingGen) {
      setGenerators(prev => prev.map(g => g.id === editingGen.id ? editingGen : g));
      toast({ title: "Generator updated!" });
      setEditingGen(null);
    }
  }

  const handleDeleteGenerator = (id: string) => {
    setGenerators(prev => prev.filter(g => g.id !== id));
    toast({ title: 'Generator deleted' });
  };

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading admin panel...</p></div>;
  if (!admin) { router.push("/admin"); return null; }

  const filteredUsers = users.filter(u => [u.fullName, u.username, u.email, u.country].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === "pending").length;
  const pendingDepositsCount = deposits.filter(d => d.status === "pending").length;
  const copyText = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
  const totalReferrals = users.reduce((s, u) => s + (u.referralCount || 0), 0);

  const tabs: { id: Tab; label: string; icon: any; badge?: number; color: string }[] = [
    { id: "overview",     label: "Overview",    icon: BarChart3,       color: "from-blue-500 to-blue-600" },
    { id: "users",        label: "Users",       icon: Users,           color: "from-violet-500 to-purple-600", badge: users.length },
    { id: "deposits",     label: "Deposits",    icon: DollarSign,      color: "from-green-500 to-emerald-600", badge: pendingDepositsCount || undefined },
    { id: "withdrawals",  label: "Withdrawals", icon: ArrowUpFromLine, color: "from-amber-500 to-orange-500",  badge: pendingWithdrawalsCount || undefined },
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
              Yes, Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── SIDEBAR BACKDROP ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SLIDE-OUT SIDEBAR ── */}
      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-slate-900 border-r border-slate-700 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:relative`}>
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
          <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden">
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
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── TOP HEADER (MOBILE) ── */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between md:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-300 text-xs font-semibold capitalize">
          {tabs.find(t => t.id === tab)?.label || ""}
        </p>
        <div className="flex items-center gap-2">
          {(pendingDepositsCount > 0 || pendingWithdrawalsCount > 0) && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1">
              <span className="text-amber-400 text-[10px] font-bold">{pendingDepositsCount + pendingWithdrawalsCount} pending</span>
            </div>
          )}
        </div>
      </div>
      
      <main className="flex flex-col md:pl-72 pt-12 md:pt-0">
        <div className="flex-1 p-4 sm:p-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div><h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1><p className="text-slate-400 text-sm">Welcome back, Administrator</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: String(users.length), icon: Users, color: "from-blue-500 to-blue-600" },
                  { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600" },
                  { label: "Pending Withdrawals", value: String(pendingWithdrawalsCount), icon: ArrowUpFromLine, color: "from-amber-500 to-amber-600" },
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
                    {pendingWithdrawalsCount === 0 && <p className="text-slate-500 text-sm">No pending withdrawals</p>}
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
                  <Button onClick={() => {}} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0"><RefreshCw className="w-3.5 h-3.5" /></Button>
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
                        <p className="text-slate-400 text-xs mt-0.5">Account saves to local state for demo</p>
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
                            placeholder="kofimensah" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Email *</label>
                        <Input type="email" value={createUserForm.email} onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="kofi@example.com" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
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
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
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
                          onClick={handleCreateUser}
                          disabled={!createUserForm.fullName || !createUserForm.username || !createUserForm.email || !createUserForm.password}
                          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold">
                           ✓ Create Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {usersLoading ? <p className="text-slate-400 text-sm">Loading...</p> : filteredUsers.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">{search ? "No users match your search" : "No users registered yet"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map(u => {
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
                        
                         {editingUser?.id === u.id ? (
                          <div className="mb-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                              <p className="text-slate-300 text-xs font-semibold mb-2">Edit Balance for {u.fullName}</p>
                              <div className="flex gap-2">
                                <Input 
                                  type="number" 
                                  value={newBalance} 
                                  onChange={e => setNewBalance(e.target.value)} 
                                  className="h-8 bg-slate-600 border-slate-500 text-white text-sm"
                                />
                                <Button size="sm" onClick={() => handleUpdateBalance(u.id, parseFloat(newBalance))} className="h-8 bg-green-600 hover:bg-green-500 text-white">Save</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)} className="h-8 text-slate-400 hover:bg-slate-600 hover:text-white">Cancel</Button>
                              </div>
                          </div>
                        ) : null}

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
                              {isShowingPass && u.password && <button onClick={() => copyText(u.password!, "Password")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setEditingUser(u); setNewBalance(String(u.balance || 0)); }}
                            data-testid={`button-edit-user-${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 text-xs font-semibold">
                            <Edit3 className="w-3 h-3" /> Edit Balance
                          </button>
                          <button onClick={() => openConfirm("Delete User Account", `You are about to permanently delete "${u.fullName}" (@${u.username}). Their balance, generators, and all data will be erased. This CANNOT be undone.`,() => handleDeleteUser(u.id))}
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
                <Button onClick={() => {}} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
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
                      onApprove={() => handleApproveDeposit(d.id)}
                      onReject={() => handleRejectDeposit(d.id)}
                      approvePending={false}
                      rejectPending={false}
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
                <div><h1 className="text-xl font-black text-white">Withdrawal Requests</h1><p className="text-slate-400 text-sm">{pendingWithdrawalsCount} pending · {withdrawals.length} total</p></div>
                <Button onClick={() => {}} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
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
                            <button onClick={() => handleApproveWithdrawal(w.id)}
                              data-testid={`button-approve-withdrawal-${w.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold disabled:opacity-50">
                              <CheckCircle className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => openConfirm("Reject Withdrawal", `Reject withdrawal of $${w.amount.toFixed(2)} from ${w.fullName}? The amount will be refunded to their balance.`, () => handleRejectWithdrawal(w.id))}
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
                          onClick={() => openConfirm("Delete Withdrawal Record", `Remove the withdrawal record for $${w.amount.toFixed(2)} from ${w.fullName}? This cannot be undone.`, () => handleDeleteWithdrawal(w.id))}
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
                  { label: "Total Referrals", value: totalReferrals.toString(), icon: Link2, color: "text-amber-400" },
                  { label: "Active Codes", value: users.filter((r: any) => r.referralCode).length.toString(), icon: CheckCircle, color: "text-green-400" },
                  { label: "Total Users", value: users.length.toString(), icon: Users, color: "text-blue-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 text-center">
                    <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                    <p className="text-white text-xl font-black">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              {users.length === 0 ? (
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
                        {users.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-700/40 transition-colors">
                            <td className="px-4 py-3"><p className="text-white font-medium text-sm">{r.fullName}</p><p className="text-slate-400 text-xs">@{r.username}</p></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-bold font-mono text-xs bg-amber-900/30 border border-amber-700 px-2 py-0.5 rounded-lg">{r.referralCode || "—"}</span>
                                {r.referralCode && <button onClick={() => copyText(r.referralCode, "Referral code")} className="text-slate-500 hover:text-amber-400"><Copy className="w-3 h-3" /></button>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center"><Badge className={`text-xs border ${(r.referralCount || 0) > 0 ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-700 text-slate-400 border-slate-600"}`}>{r.referralCount || 0} users</Badge></td>
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
                  <Button onClick={() => {}} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => { setNewGen({ ...BLANK_GEN }); setShowCreateGen(true); }}
                    data-testid="button-create-generator"
                    className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center gap-1.5 rounded-xl shadow-md">
                    <Plus className="w-4 h-4" /> New Generator
                  </Button>
                </div>
              </div>

              {gensLoading ? <p className="text-slate-400 text-sm">Loading...</p> : (
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
                            onClick={() => {
                                const updatedGen = {...g, published: !g.published};
                                setGenerators(gens => gens.map(gen => gen.id === g.id ? updatedGen : gen));
                                toast({ title: `Generator ${updatedGen.published ? 'published' : 'unpublished'}`});
                            }}
                            data-testid={`button-publish-gen-${g.id}`}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${g.published ? "bg-green-900/30 border-green-600 text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.25)]" : "bg-slate-700/60 border-slate-600 text-slate-400 hover:border-slate-500"}`}
                          >
                            <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${g.published ? "bg-green-500" : "bg-slate-600"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${g.published ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </div>
                            <span className="tracking-widest text-[11px]">{g.published ? "ON" : "OFF"}</span>
                          </button>
                          <button onClick={() => openConfirm(
                              "Delete Generator",
                              `Are you sure you want to delete "${g.name}"? This cannot be undone.`,
                              () => handleDeleteGenerator(g.id)
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
                <Button onClick={() => {}} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
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
                      data-testid="input-activity-action" placeholder="e.g. Earned daily income"
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
                      {COLORS.map(c => <option key={c} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <Button
                  onClick={handleCreateActivityPost}
                  disabled={!activityForm.username || !activityForm.country || !activityForm.action || !activityForm.amount}
                  data-testid="button-add-activity-post"
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold rounded-xl">
                  Add to Feed
                </Button>
              </div>

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
                              `Remove this activity post by "${p.username}"?`,
                              () => handleDeleteActivityPost(p.id)
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
             <div className="space-y-4">
              <div><h1 className="text-xl font-black text-white">Media Management</h1><p className="text-slate-400 text-sm">Update images for generators and activity page</p></div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Generator Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['pg1', 'pg2', 'pg3', 'pg4'].map(id => (
                      <div key={id} className="text-center">
                         <img src={PlaceHolderImages.find(i => i.id === `gen-${id}`)?.imageUrl} alt={id} className="w-full h-auto rounded-lg aspect-square object-cover" />
                         <label htmlFor={`gen-upload-${id}`} className="mt-2 text-xs text-amber-400 cursor-pointer hover:underline">
                            Upload for {id.toUpperCase()}
                         </label>
                         <input type="file" id={`gen-upload-${id}`} className="hidden" accept="image/*" disabled />
                      </div>
                    ))}
                  </div>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Activity Page Images</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['hero', 'teamwork'].map(id => (
                      <div key={id} className="text-center">
                         <img src={activityDefaultImages[id]} alt={id} className="w-full h-auto rounded-lg aspect-[16/9] object-cover" />
                         <label htmlFor={`act-upload-${id}`} className="mt-2 text-xs text-amber-400 cursor-pointer hover:underline">
                            Upload {id} image
                         </label>
                         <input type="file" id={`act-upload-${id}`} className="hidden" accept="image/*" disabled />
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          )}

          {/* ── GIFT CODES ── */}
          {tab === "codes" && (
            <div className="space-y-4">
              <div><h1 className="text-xl font-black text-white">Gift Code Generator</h1><p className="text-slate-400 text-sm">Create bonus codes that add funds to a user's account</p></div>
               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Create New Code</h3>
                   <p className="text-xs text-slate-400">This feature is not yet implemented.</p>
               </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === "settings" && (
            <div className="space-y-4">
              <div><h1 className="text-xl font-black text-white">Site Settings</h1><p className="text-slate-400 text-sm">Manage global configurations</p></div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-slate-400 text-sm">Settings page is not yet implemented.</p>
              </div>
            </div>
          )}

          {/* ── ABOUT ── */}
          {tab === "about" && (
            <div className="space-y-4">
               <div><h1 className="text-xl font-black text-white">About CoinPower</h1><p className="text-slate-400 text-sm">Version and system information</p></div>
               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-2">
                 <p className="text-white">CoinPower Admin Panel v1.0.0</p>
                 <p className="text-slate-400 text-xs">Built with Next.js, Supabase, and shadcn/ui.</p>
               </div>
            </div>
          )}
        </div>
      </main>

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
              <Button onClick={() => handleUpdateBalance(editingUser.id, parseFloat(newBalance) || 0)} data-testid="button-save-balance" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                Save Balance
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
                onClick={() => { if (!newGen.name) { toast({ title: "Name is required", variant: "destructive" }); return; } handleCreateGenerator(); }}
                data-testid="button-save-new-generator"
                className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                <Plus className="w-4 h-4 mr-1" /> Create Generator
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
              <Button onClick={handleUpdateGenerator} data-testid="button-save-generator" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
                <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

    