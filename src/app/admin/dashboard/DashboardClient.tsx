'use client';

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Eye, EyeOff, Copy, RotateCcw, Link2, Video, Landmark, Hash, ShieldCheck, Gift, AlertTriangle, Info, Package, Image as ImageIcon
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  adminDeleteMedia,
} from "./actions";
import { Switch } from "@/components/ui/switch";

type Tab = "overview" | "users" | "deposits" | "withdrawals" | "referrals" | "generators" | "media" | "codes" | "settings" | "about";

type DepositRequest = {
  id: string; 
  user_id: string;
  amount: number; 
  tx_id: string; 
  status: "pending" | "approved" | "rejected"; 
  created_at: string;
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

type WithdrawalRecord = {
  id: string; user_id: string; country: string;
  method: string; amount: number; net_amount: number; fee: number;
  details: string; status: "pending" | "processing" | "complete" | "rejected"; created_at: string;
};

type MediaAsset = {
    id: string;
    url: string;
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

export function DashboardContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Data State ---
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [bonusCodes, setBonusCodes] = useState<GiftCode[]>([]);
  const [visits, setVisits] = useState<{date: string, view_count: number}[]>([]);
  
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [editingPassword, setEditingPassword] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ full_name: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);

  const [showCreateGen, setShowCreateGen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generator | null>(null);
  const [newGen, setNewGen] = useState<NewGenerator>({ ...BLANK_GEN });

  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  const fetchData = useCallback(async () => {
      const result = await adminGetAllData();
      if (result.error || !result.data) {
        toast({ title: 'Error fetching data', description: result.error, variant: 'destructive' });
      } else {
        setUsers(result.data.users as UserRecord[]);
        setGenerators(result.data.generators as Generator[]);
        setDeposits(result.data.deposits as DepositRequest[]);
        setWithdrawals(result.data.withdrawals as WithdrawalRecord[]);
        setMedia(result.data.media as MediaAsset[]);
        setBonusCodes(result.data.codes as GiftCode[]);
        setVisits(result.data.visits as any[]);
      }
      setUsersLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleUpdateBalance = async (userId: string, balance: number) => {
    const res = await adminUpdateUserBalance(userId, balance);
    if (res.success) {
        toast({ title: "Balance updated" });
        setEditingUser(null);
        fetchData();
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleResetPassword = async (userId: string, pass: string) => {
    const res = await adminResetUserPassword(userId, pass);
    if (res.success) {
        toast({ title: "Password reset successfully" });
        setEditingPassword(null);
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const res = await adminDeleteUser(userId);
    if (res.success) {
        toast({ title: "User deleted" });
        fetchData();
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleToggleWithdrawalLock = async (userId: string, current: boolean) => {
    const res = await adminToggleWithdrawalLock(userId, !current);
    if (res.success) {
        toast({ title: `Withdrawals ${!current ? 'Locked' : 'Unlocked'}` });
        fetchData();
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleCreateGiftCodeAction = async () => {
    const res = await adminCreateGiftCode(parseFloat(newCodeAmount), newCodeNote);
    if (res.data) {
        toast({ title: "Gift code created", description: res.data.code });
        setNewCodeAmount("");
        setNewCodeNote("");
        fetchData();
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const totalBalanceVal = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const pendingDeposits = deposits.filter(d => d.status === 'pending').length;
  const pendingWithdraws = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing').length;

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900 sticky top-0 z-20">
        <h2 className="text-xl font-bold text-white capitalize">{tab}</h2>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchData} className="text-slate-300 border-slate-700">
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="destructive" size="sm" onClick={handleSignOut}>
                Logout
            </Button>
        </div>
      </header>

      <div className="p-8 space-y-8">
        {tab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-xl"><Users className="w-6 h-6 text-blue-500" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Total Users</p>
                            <p className="text-2xl font-bold text-white">{users.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500/10 rounded-xl"><DollarSign className="w-6 h-6 text-green-500" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Total Assets</p>
                            <p className="text-2xl font-bold text-white">${totalBalanceVal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-yellow-500/10 rounded-xl"><ArrowUpFromLine className="w-6 h-6 text-yellow-500" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Pending Withdrawals</p>
                            <p className="text-2xl font-bold text-white">{pendingWithdraws}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-xl"><Package className="w-6 h-6 text-purple-500" /></div>
                        <div>
                            <p className="text-slate-400 text-sm">Pending Deposits</p>
                            <p className="text-2xl font-bold text-white">{pendingDeposits}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {tab === "users" && (
            <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search users by name, email or username..." 
                        className="bg-transparent border-none outline-none text-white w-full"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-1 gap-4">
                    {filteredUsers.map(user => (
                        <div key={user.id} className="bg-slate-800 p-5 rounded-2xl border border-slate-700 flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <h4 className="text-white font-bold">{user.full_name || 'No Name'} (@{user.username})</h4>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                                <div className="flex gap-4 mt-2">
                                    <span className="text-xs text-slate-500">Balance: <b className="text-white">${user.balance.toFixed(2)}</b></span>
                                    <span className="text-xs text-slate-500">Country: <b className="text-white">{user.country}</b></span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>Adjust Balance</Button>
                                <Button size="sm" variant="destructive" onClick={() => openConfirm("Delete User", "Are you sure?", () => handleDeleteUser(user.id))}>Delete</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Other tabs would be implemented here in a similar fashion */}
      </div>
    </div>
  );
}

export function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading Dashboard...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}