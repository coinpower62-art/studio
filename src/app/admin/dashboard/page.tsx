
'use client';

import { useState, useEffect, Suspense } from "react";
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
  Eye, EyeOff, Copy, RotateCcw, Link2, Upload, Save, Plus,
  Pencil, ImagePlus, Activity,
  Info, Building2, Phone, Mail, MapPin, Percent, Clock3,
  ExternalLink, Clock, ArrowUpRight, AlertTriangle, CreditCard, Menu, Gift, DatabaseZap, KeyRound, User as UserIcon, Lock, Unlock, Video, Landmark, Network, Hash
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
  referred_by: string | null;
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

function DepositRow({ d, user, onApprove, onReject, onDelete, approvePending, rejectPending, copyText }: {
  d: DepositRequest;
  user?: UserRecord;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  approvePending: boolean;
  rejectPending: boolean;
  copyText: (text: string, label: string) => void;
}) {
  const isCard = Boolean(d.tx_id?.match(/\[CARD/i));
  let method = "Unknown";
  let country = "Unknown";
  let cleanTxId = d.tx_id || "";
  let cardDetails = "";

  const match = d.tx_id?.match(/^\[(.*?)\|(.*?)\]\s*(.*)$/);
  if (match) {
    method = match[1];
    country = match[2];
    cleanTxId = match[3];
    if (method.toUpperCase() === 'CARD') {
        cardDetails = cleanTxId;
        cleanTxId = "";
    }
  }

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
      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCard ? "bg-blue-900/40" : d.status === "pending" ? "bg-amber-900/40" : d.status === "approved" ? "bg-green-900/40" : "bg-red-900/40"}`}>
            {isCard
              ? <CreditCard className={`w-5 h-5 ${d.status === "pending" ? "text-blue-400" : d.status === "approved" ? "text-green-400" : "text-red-400"}`} />
              : <DollarSign className={`w-5 h-5 ${d.status === "pending" ? "text-amber-400" : d.status === "approved" ? "text-green-400" : "text-red-400"}`} />
            }
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold text-sm">{user?.full_name || 'Unknown User'}</p>
              <span className="text-slate-400 text-xs">@{user?.username || '...'}</span>
              <Badge className={`text-xs border px-1.5 py-0 ${d.status === "pending" ? "bg-yellow-900/40 text-yellow-400 border-yellow-700" : d.status === "approved" ? "bg-green-900/40 text-green-400 border-green-700" : "bg-red-900/40 text-red-400 border-red-700"}`}>{d.status}</Badge>
            </div>
            <p className="text-slate-400 text-xs">{new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-green-400 font-black text-base">${d.amount.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="pt-3 border-t border-slate-700 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Method</p>
                <p className="text-slate-200 text-xs font-semibold">{method}</p>
            </div>
            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> Country</p>
                <p className="text-slate-200 text-xs font-semibold">{user?.country || country}</p>
            </div>
            {user?.phone && (
                <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> User Phone</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-slate-200 text-xs font-mono truncate">{user.phone}</p>
                        <button onClick={() => copyText(user.phone!, "Phone")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>
                    </div>
                </div>
            )}
            {cleanTxId && (
                <div className="bg-slate-700/50 rounded-xl px-3 py-2 sm:col-span-2">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Hash className="w-3 h-3" /> Transaction ID</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-slate-200 text-xs font-mono truncate">{cleanTxId}</p>
                        <button onClick={() => copyText(cleanTxId, "Transaction ID")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>
                    </div>
                </div>
            )}
            {cardDetails && (
                <div className="bg-slate-700/50 rounded-xl px-3 py-2 sm:col-span-2">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Info className="w-3 h-3" /> Card Info</p>
                    <div className="flex items-center gap-1.5">
                        <p className="text-slate-200 text-xs font-mono truncate">{cardDetails}</p>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="flex gap-2 items-center w-full justify-end pt-3 border-t border-slate-700">
        {d.status === "pending" ? (
          <>
            <button data-testid={`button-approve-deposit-${d.id}`} onClick={onApprove} disabled={approvePending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button data-testid={`button-reject-deposit-${d.id}`} onClick={onReject} disabled={rejectPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 text-xs font-semibold disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </>
        ) : (
          <span className={`flex items-center gap-1 text-xs font-semibold ${d.status === "approved" ? "text-green-400" : "text-red-400"}`}>
            {d.status === "approved" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {d.status === "approved" ? "Approved" : "Rejected"}
          </span>
        )}
        <button
          onClick={onDelete}
          data-testid={`button-delete-deposit-${d.id}`}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-950/40 text-red-500 border border-red-800/50 hover:bg-red-900/50 hover:text-red-300 transition-colors flex-shrink-0"
          title="Delete record"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}


function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("overview");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- Data State ---
  const [admin, setAdmin] = useState<{name: string} | null>(null);
  const [adminLoading, setAdminLoading] = useState(true);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [generators, setGenerators] = useState<Generator[]>([]);
  const [gensLoading, setGensLoading] = useState(true);

  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(true);

  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true);

  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const [bonusCodes, setBonusCodes] = useState<GiftCode[]>([]);
  const [codesLoading, setCodesLoading] = useState(true);
  
  const [visits, setVisits] = useState<{date: string, view_count: number}[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [allRentedGenerators, setAllRentedGenerators] = useState<RentedGeneratorRaw[]>([]);


  const fetchData = async () => {
      setUsersLoading(true);
      setGensLoading(true);
      setDepositsLoading(true);
      setWithdrawalsLoading(true);
      setMediaLoading(true);
      setCodesLoading(true);
      setVisitsLoading(true);

      const result = await adminGetAllData();
      if (result.error || !result.data) {
        toast({ title: 'Error fetching admin data', description: result.error, variant: 'destructive' });
      } else {
        const rawUsers = result.data.users as UserRecord[];
        const allGenerators = result.data.generators as Generator[];
        const rentedGensRaw = result.data.rentedGenerators as RentedGeneratorRaw[] || [];
        setAllRentedGenerators(rentedGensRaw);

        // Create a map of generator IDs to names for efficient lookup
        const generatorMap = new Map(allGenerators.map(g => [g.id, g.name]));
        
        const rentedByUser = rentedGensRaw.reduce((acc, rg) => {
            if (!acc[rg.user_id]) {
                acc[rg.user_id] = [];
            }
            acc[rg.user_id].push({
                id: rg.generator_id,
                name: generatorMap.get(rg.generator_id) || 'Unknown Gen',
                expires_at: rg.expires_at,
                rented_at: rg.rented_at,
            });
            return acc;
        }, {} as Record<string, { id: string; name: string; expires_at: string; rented_at: string; }[]>);
        
        const referralCounts = rawUsers.reduce((acc, user) => {
          if (user.referred_by) {
            acc[user.referred_by] = (acc[user.referred_by] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const usersWithData = rawUsers.map(user => ({
          ...user,
          referral_count: user.referral_code ? referralCounts[user.referral_code] || 0 : 0,
          rented_generators: (rentedByUser[user.id] || []).sort((a, b) => new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()),
        }));

        setUsers(usersWithData);
        setGenerators(result.data.generators as Generator[]);
        setDeposits(result.data.deposits as DepositRequest[]);
        setWithdrawals(result.data.withdrawals as WithdrawalRecord[]);
        setMedia(result.data.media as MediaAsset[]);
        setBonusCodes(result.data.codes as GiftCode[]);
        setVisits(result.data.visits as {date: string, view_count: number}[] || []);
      }

      setUsersLoading(false);
      setGensLoading(false);
      setDepositsLoading(false);
      setWithdrawalsLoading(false);
      setMediaLoading(false);
      setCodesLoading(false);
      setVisitsLoading(false);
  }

  useEffect(() => {
    // Auth check
    const isAdminLoggedIn = document.cookie.split('; ').find(row => row.startsWith('admin_logged_in='))?.split('=')[1] === 'true';
    if (!isAdminLoggedIn) {
      router.push('/login');
      return;
    }
    setAdmin({ name: 'Admin' });
    setAdminLoading(false);
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);


  const switchTab = (id: Tab) => {
    if (id === "users") setSearch("");
    setTab(id);
    setSidebarOpen(false);
  };
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [editingPassword, setEditingPassword] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassFor, setShowPassFor] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ full_name: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);

  // Generator modal states
  const [showCreateGen, setShowCreateGen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generator | null>(null);
  const [newGen, setNewGen] = useState<NewGenerator>({ ...BLANK_GEN });

  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");
  const [generatedCode, setGeneratedCode] = useState<GiftCode | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; onConfirm: () => void }>({
    open: false, title: "", description: "", onConfirm: () => {},
  });
  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  // --- DB Mutations ---
  const handleSignOut = () => {
    document.cookie = "admin_logged_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push('/login');
  };

  const handleUpdateBalance = async (userId: string, newBalance: number) => {
    const result = await adminUpdateUserBalance(userId, newBalance);
    if(result.error) {
        toast({ title: 'Error updating balance', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'Balance updated' });
        setEditingUser(null);
        await fetchData();
    }
  }

  const handleResetPassword = async (userId: string, newPass: string) => {
    if (!newPass || newPass.length < 6) {
        toast({ title: 'Invalid Password', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
        return;
    }
    const result = await adminResetUserPassword(userId, newPass);
    if(result.error) {
        toast({ title: 'Error resetting password', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'Password has been reset successfully!' });
        setEditingPassword(null);
        setNewPassword('');
    }
}

  const handleDeleteUser = async (userId: string) => {
    const result = await adminDeleteUser(userId);
    if(result.error) {
        toast({ title: 'Error deleting user', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: 'User profile deleted. Note: Auth user record still exists.' });
        await fetchData();
    }
  }

  const handleToggleWithdrawalLock = async (userId: string, isCurrentlyLocked: boolean) => {
    openConfirm(
      isCurrentlyLocked ? "Unlock Withdrawals?" : "Lock Withdrawals?",
      `Are you sure you want to ${isCurrentlyLocked ? 'allow' : 'prevent'} this user from making withdrawals?`,
      async () => {
        const result = await adminToggleWithdrawalLock(userId, !isCurrentlyLocked);
        if (result.error) {
          toast({ title: 'Error updating lock status', description: result.error, variant: 'destructive' });
        } else {
          toast({ title: `Withdrawals ${!isCurrentlyLocked ? 'Locked' : 'Unlocked'}` });
          await fetchData();
        }
      }
    );
};

  const handleCreateUser = async () => {
    const newUserProfile = {
      full_name: createUserForm.full_name,
      username: createUserForm.username,
      email: createUserForm.email,
      password: createUserForm.password,
      country: createUserForm.country,
      phone: createUserForm.phone,
      balance: parseFloat(createUserForm.balance) || 0,
      referral_code: `CP-${createUserForm.username.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    };
    const result = await adminCreateUser(newUserProfile);
    if (result.error || !result.data) {
        toast({ title: 'Error creating user', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: "User created successfully!", description: "An auth user and profile have been created." });
      setShowCreateUser(false);
      setCreateUserForm({ full_name: "", username: "", email: "", password: "", country: "Ghana", phone: "", balance: "1.00" });
      await fetchData();
    }
  }

  const handleApproveDeposit = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleDeposit(id, 'approve', userId, amount);
    if (result.error) {
      toast({ title: "Error approving deposit", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Deposit approved! Balance updated." });
      await fetchData();
    }
  }

  const handleRejectDeposit = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleDeposit(id, 'reject', userId, amount);
    if (result.error) {
      toast({ title: "Error rejecting deposit", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Deposit rejected." });
      await fetchData();
    }
  }

  const handleDeleteDeposit = async (id: string) => {
    const result = await adminHandleDeposit(id, 'delete');
    if (result.error) {
      toast({ title: "Error deleting record", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Record deleted." });
      await fetchData();
    }
  }

  const handleProcessWithdrawal = async (id: string) => {
    const result = await adminHandleWithdrawal(id, 'process');
    if (result.error) {
      toast({ title: "Error processing withdrawal", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal is now processing!" });
      await fetchData();
    }
  }

  const handleCompleteWithdrawal = async (id: string) => {
    const result = await adminHandleWithdrawal(id, 'complete');
    if (result.error) {
      toast({ title: "Error completing withdrawal", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal marked as complete!" });
      await fetchData();
    }
  }

  const handleRejectWithdrawal = async (id: string, userId: string, amount: number) => {
    const result = await adminHandleWithdrawal(id, 'reject', userId, amount);
    if(result.error) {
      toast({ title: "Error rejecting withdrawal", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal rejected — balance refunded." });
      await fetchData();
    }
  }

  const handleDeleteWithdrawal = async (id: string) => {
    const result = await adminHandleWithdrawal(id, 'delete');
    if (result.error) {
      toast({ title: "Error deleting record", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Record deleted." });
      await fetchData();
    }
  }

  const handleCreateGenerator = async () => {
    const result = await adminMutateGenerator('create', newGen);
    if(result.error || !result.data) {
      toast({ title: "Error creating generator", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Generator created!" });
      setShowCreateGen(false);
      setNewGen({ ...BLANK_GEN });
      await fetchData();
    }
  }

  const handleUpdateGenerator = async () => {
    if (editingGen) {
      const result = await adminMutateGenerator('update', editingGen);
      if (result.error || !result.data) {
        toast({ title: "Error updating generator", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Generator updated!" });
        setEditingGen(null);
        await fetchData();
      }
    }
  }

  const handleDeleteGenerator = async (id: string) => {
    const result = await adminMutateGenerator('delete', { id });
    if (result.error) {
      toast({ title: "Error deleting generator", description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Generator deleted' });
      await fetchData();
    }
  };
  
  const handlePublishToggle = async (gen: Generator) => {
    const updatedGen = {...gen, published: !gen.published};
    const result = await adminMutateGenerator('update', updatedGen);
    if (result.error || !result.data) {
        toast({ title: 'Error updating status', variant: 'destructive', description: result.error });
    } else {
        toast({ title: `Generator ${updatedGen.published ? 'published' : 'unpublished'}`});
        await fetchData();
    }
  }

  const handleFileUpload = async (type: 'generator' | 'activity' | 'video' | 'license', id: string, file: File) => {
      const loadingId = `${type}-${id}`;
      setUploading(loadingId);

      try {
        const fileExt = file.name.split('.').pop();
        let folder = 'assets';
        if (type === 'generator') folder = 'generator-images';
        if (type === 'activity') folder = 'activity-images';
        if (type === 'video') folder = 'tutorial-videos';
        if (type === 'license') folder = 'license-images';
        
        const filePath = `${folder}/${id}-${Date.now()}.${fileExt}`;
        const BUCKET_NAME = 'site_assets';

        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        if (!publicUrl) {
            throw new Error('Could not get public URL for the uploaded file.');
        }

        let dbUpdateResult;
        if (type === 'generator') {
            dbUpdateResult = await adminUpdateGeneratorImage(id, publicUrl);
        } else {
            dbUpdateResult = await adminUpsertMedia(id, publicUrl);
        }

        if (dbUpdateResult.error) {
          throw new Error(dbUpdateResult.error);
        }
        
        if (type === 'generator') {
            setGenerators(currentGenerators => {
                const genIndex = currentGenerators.findIndex(g => g.id === id);
                if (genIndex > -1) {
                    const updatedGenerators = [...currentGenerators];
                    updatedGenerators[genIndex].image_url = publicUrl;
                    return updatedGenerators;
                }
                return currentGenerators;
            });
        } else {
            setMedia(currentMedia => {
                const existingIndex = currentMedia.findIndex(m => m.id === id);
                if (existingIndex > -1) {
                    const updatedMedia = [...currentMedia];
                    updatedMedia[existingIndex] = { id, url: publicUrl };
                    return updatedMedia;
                } else {
                    return [...currentMedia, { id, url: publicUrl }];
                }
            });
        }

        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} updated for ${id}!` });

      } catch (e: any) {
        toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
      } finally {
        setUploading(null);
      }
  };

  const handleSeedGenerators = async () => {
    const result = await adminMutateGenerator('seed', DEFAULT_GENERATORS);
    if (result.error || !result.data) {
      toast({ title: "Error seeding generators", description: result.error, variant: 'destructive' });
    } else {
      toast({ title: "Success", description: "Default generators have been seeded." });
      await fetchData();
    }
  };

  const handleCreateGiftCode = async () => {
    const amount = parseFloat(newCodeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a positive number for the amount.', variant: 'destructive' });
      return;
    }

    const result = await adminCreateGiftCode(amount, newCodeNote);
    if (result.error || !result.data) {
      toast({ title: 'Error creating code', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Gift code created!' });
      setGeneratedCode(result.data);
      setNewCodeAmount("");
      setNewCodeNote("");
      await fetchData(); // Refresh list
    }
  };

  const handleDeleteGiftCode = async (codeId: string) => {
    const result = await adminDeleteGiftCode(codeId);
    if (result.error) {
      toast({ title: 'Error deleting code', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Gift code deleted.' });
      await fetchData();
    }
  };
  
  const getDetailIcon = (key: string) => {
    const lKey = key.toLowerCase();
    if (lKey.includes('phone')) return <Phone className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('name') || lKey.includes('holder')) return <UserIcon className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('bank')) return <Landmark className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('country') || lKey.includes('city')) return <MapPin className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('address')) return <Mail className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('network')) return <Network className="w-3 h-3 text-slate-500" />;
    if (lKey.includes('number')) return <Hash className="w-3 h-3 text-slate-500" />;
    return null;
  }

  if (adminLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading admin panel...</p></div>;
  if (!admin) { router.push("/login"); return null; }

  const filteredUsers = users.filter(function(u) { return [u.full_name, u.username, u.email, u.country, u.referred_by].some(function(f) { return f?.toLowerCase().includes(search.toLowerCase()); }); });
  const totalBalance = users.reduce(function(s, u) { return s + (u.balance || 0); }, 0);
  const pendingWithdrawalsCount = withdrawals.filter(function(w) { return w.status === "pending" || w.status === "processing"; }).length;
  const pendingDepositsCount = deposits.filter(function(d) { return d.status === "pending"; }).length;
  const copyText = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
  const totalReferrals = users.reduce(function(s, u) { return s + (u.referral_count || 0); }, 0);
  const codeToUserMap = new Map(users.map(u => u.referral_code ? [u.referral_code, u] : [null, null]));

  const heroImg = media.find(function(m) { return m.id === 'hero'; })?.url || PlaceHolderImages.find(function(i) { return i.id === 'activity-hero'; })?.imageUrl;
  const teamworkImg = media.find(function(m) { return m.id === 'teamwork'; })?.url || PlaceHolderImages.find(function(i) { return i.id === 'activity-teamwork'; })?.imageUrl;
  const logoImg = media.find(function(m) { return m.id === 'app-logo'; })?.url || PlaceHolderImages.find(function(i) { return i.id === 'signup-logo'; })?.imageUrl;
  const activeRentals = allRentedGenerators.filter(g => g && g.expires_at && new Date(g.expires_at).getTime() > Date.now()).length;

  const tabs: { id: Tab; label: string; icon: any; badge?: number; color: string }[] = [
    { id: "overview",     label: "Overview",    icon: BarChart3,       color: "from-blue-500 to-blue-600" },
    { id: "users",        label: "Users",       icon: Users,           color: "from-violet-500 to-purple-600", badge: users.length },
    { id: "deposits",     label: "Deposits",    icon: DollarSign,      color: "from-green-500 to-emerald-600", badge: pendingDepositsCount || undefined },
    { id: "withdrawals",  label: "Withdrawals", icon: ArrowUpFromLine, color: "from-amber-500 to-orange-600",  badge: pendingWithdrawalsCount || undefined },
    { id: "referrals",    label: "Referrals",   icon: Link2,           color: "from-pink-500 to-rose-600" },
    { id: "generators",   label: "Generators",  icon: Zap,             color: "from-yellow-400 to-amber-500",  badge: generators.length },
    { id: "media",        label: "Media",       icon: ImagePlus,       color: "from-teal-500 to-cyan-600" },
    { id: "codes",        label: "Gift Codes",  icon: Gift,            color: "from-rose-500 to-pink-600" },
    { id: "settings",     label: "Settings",    icon: Settings,        color: "from-slate-500 to-slate-600" },
    { id: "about",        label: "About",       icon: Info,            color: "from-indigo-500 to-indigo-600" },
  ];

  const coreGeneratorIds = ['pg1', 'pg2', 'pg3', 'pg4'];
  const otherGenerators = generators.filter(g => !coreGeneratorIds.includes(g.id));

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* ── GLOBAL CONFIRM DIALOG ── */}
      <AlertDialog open={confirmDialog.open} onOpenChange={function(open) { return setConfirmDialog(function(s) { return ({ ...s, open }); }); }}>
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
              onClick={function() { confirmDialog.onConfirm(); setConfirmDialog(function(s) { return ({ ...s, open: false }); }); }}
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
          onClick={function() { return setSidebarOpen(false); }}
        />
      )}

      {/* ── SLIDE-OUT SIDEBAR ── */}
      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-slate-900 border-r border-slate-700 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
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
          <button onClick={function() { return setSidebarOpen(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors md:hidden">
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
          {tabs.map(function({ id, label, icon: Icon, badge, color }) {
            const isActive = tab === id;
            return (
              <button
                key={id}
                onClick={function() { return switchTab(id); }}
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
            onClick={function() { return setSidebarOpen(true); }}
            data-testid="button-open-sidebar"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-300 text-xs font-semibold capitalize">
          {tabs.find(function(t) { return t.id === tab; })?.label || ""}
        </p>
        <div className="flex items-center gap-2">
          {(pendingDepositsCount > 0 || pendingWithdrawalsCount > 0) && (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-lg px-2 py-1">
              <span className="text-amber-400 text-[10px] font-bold">{pendingDepositsCount + pendingWithdrawalsCount} pending</span>
            </div>
          )}
        </div>
      </div>

      <main className="flex flex-col md:ml-72 pt-12 md:pt-0">
        <div className="flex-1 p-4 sm:p-6">

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div className="space-y-5">
              <div><h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1><p className="text-slate-400 text-sm">Welcome back, Administrator</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: users.length.toLocaleString(), icon: Users, color: "from-blue-500 to-blue-600" },
                  { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600" },
                  { label: "Pending Withdrawals", value: String(pendingWithdrawalsCount), icon: ArrowUpFromLine, color: "from-amber-500 to-amber-600" },
                  { label: "Active Rentals", value: activeRentals.toLocaleString(), icon: Zap, color: "from-teal-500 to-cyan-600" },
                ].map(function({ label, value, icon: Icon, color }) { return (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}><Icon className="w-4 h-4 text-white" /></div>
                    <p className="text-xl font-black text-white">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ); })}
              </div>
              <div className="mt-4">
                <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-slate-400" /> Site Traffic</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

                        const todayVisits = visits.find(v => v.date === today)?.view_count || 0;
                        const yesterdayVisits = visits.find(v => v.date === yesterday)?.view_count || 0;
                        const last7DaysVisits = visits.reduce((sum, v) => sum + v.view_count, 0);
                        
                        return ([
                            { label: "Today's Views", value: todayVisits.toLocaleString() },
                            { label: "Yesterday's Views", value: yesterdayVisits.toLocaleString() },
                            { label: "Last 7 Days", value: last7DaysVisits.toLocaleString() },
                        ].map(({ label, value }) => (
                            <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                                <p className="text-slate-400 text-xs">{label}</p>
                                <p className="text-xl font-black text-white mt-1">{value}</p>
                            </div>
                        )))
                    })()}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm">Pending Withdrawals</h3>
                    <button onClick={function() { return switchTab("withdrawals"); }} className="text-amber-400 text-xs flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="space-y-3">
                    {withdrawals.filter(function(w) { return w.status === "pending"; }).slice(0, 8).map(function(w) {
                      const user = users.find(u => u.id === w.user_id);
                      return (
                      <div key={w.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0"><p className="text-white text-sm font-medium truncate">{user?.full_name || 'Unknown'}</p><p className="text-slate-400 text-xs">@{user?.username || '...'}</p></div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-amber-400 text-sm font-bold">${w.amount.toFixed(2)}</span>
                          <Badge className="text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-700 px-1.5">pending</Badge>
                        </div>
                      </div>
                    )})}
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
                <div><h1 className="text-xl font-black text-white">User Accounts</h1><p className="text-slate-400 text-sm">{users.length.toLocaleString()} registered users</p></div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={function(e) { return setSearch(e.target.value); }} placeholder="Search users..." className="pl-9 pr-8 h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm" />
                    {search && (
                      <button onClick={function() { return setSearch(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors" title="Clear search">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button onClick={function() { return fetchData(); }} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={function() { return setShowCreateUser(true); }} size="sm" className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold flex-shrink-0 gap-1.5"><Plus className="w-3.5 h-3.5" /> Create User</Button>
                </div>
              </div>

              {/* ── CREATE USER MODAL ── */}
              {showCreateUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                      <div>
                        <h2 className="text-white font-black text-lg">Create User Account</h2>
                        <p className="text-slate-400 text-xs mt-0.5">This creates a new auth user and profile.</p>
                      </div>
                      <button onClick={function() { return setShowCreateUser(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Full Name *</label>
                          <Input value={createUserForm.full_name} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, full_name: e.target.value }); }); }}
                            placeholder="e.g. Kofi Mensah" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Username *</label>
                          <Input value={createUserForm.username} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, username: e.target.value }); }); }}
                            placeholder="kofimensah" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Email *</label>
                        <Input type="email" value={createUserForm.email} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, email: e.target.value }); }); }}
                          placeholder="kofi@example.com" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Password *</label>
                          <div className="relative">
                            <Input type={showCreateUserPassword ? "text" : "password"} value={createUserForm.password} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, password: e.target.value }); }); }}
                              placeholder="Min 6 characters" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm pr-10" />
                            <button type="button" onClick={() => setShowCreateUserPassword(!showCreateUserPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-white">
                              {showCreateUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Starting Balance</label>
                          <Input type="number" min="0" step="0.01" value={createUserForm.balance} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, balance: e.target.value }); }); }}
                            className="h-9 bg-slate-700 border-slate-600 text-white text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Country *</label>
                          <select value={createUserForm.country} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, country: e.target.value }); }); }}
                            className="w-full h-9 rounded-md bg-slate-700 border border-slate-600 text-white text-sm px-3">
                            {countries.map(function(c) { return <option key={c} value={c}>{c}</option>; })}
                          </select>
                        </div>
                        <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Phone</label>
                          <Input value={createUserForm.phone} onChange={function(e) { return setCreateUserForm(function(f) { return ({ ...f, phone: e.target.value }); }); }}
                            placeholder="+233..." className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button onClick={function() { return setShowCreateUser(false); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
                        <Button
                          onClick={handleCreateUser}
                          disabled={!createUserForm.full_name || !createUserForm.username || !createUserForm.email || !createUserForm.password}
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
                  {filteredUsers.map(function(u) {
                    const nameForDisplay = u.full_name || u.username || u.email.split('@')[0] || 'Unknown User';
                    const initials = (u.full_name || u.username || u.email)?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
                    const isShowingPass = showPassFor === u.id;
                    const referralLink = u.referral_code ? `https://coinpower-italy.netlify.app/signup?ref=${u.referral_code}` : null;
                    return (
                      <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10 flex-shrink-0"><AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                               <div className="flex items-center gap-2">
                                  <p className="text-white font-bold text-sm truncate">{nameForDisplay}</p>
                                  {u.withdrawal_locked && <Badge className="text-xs bg-red-900/40 text-red-400 border-red-700 px-1.5 py-0"><Lock className="w-2.5 h-2.5 mr-1" />Locked</Badge>}
                                </div>
                                <p className="text-slate-400 text-xs truncate">{u.email}</p>
                            </div>
                          </div>
                          <p className="text-green-400 font-black text-base flex-shrink-0">${(u.balance || 0).toFixed(2)}</p>
                        </div>

                         {editingUser?.id === u.id ? (
                          <div className="mb-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                              <p className="text-slate-300 text-xs font-semibold mb-2">Edit Balance for {nameForDisplay}</p>
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  value={newBalance}
                                  onChange={function(e) { return setNewBalance(e.target.value); }}
                                  className="h-8 bg-slate-600 border-slate-500 text-white text-sm"
                                />
                                <Button size="sm" onClick={function() { return handleUpdateBalance(u.id, parseFloat(newBalance)); }} className="h-8 bg-green-600 hover:bg-green-500 text-white">Save</Button>
                                <Button size="sm" variant="ghost" onClick={function() { return setEditingUser(null); }} className="h-8 text-slate-400 hover:bg-slate-600 hover:text-white">Cancel</Button>
                              </div>
                          </div>
                        ) : null}

                        {editingPassword?.id === u.id ? (
                            <div className="mb-3 p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                                <p className="text-slate-300 text-xs font-semibold mb-2">Reset Password for {nameForDisplay}</p>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            type={isShowingPass ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="New password (min 6 chars)"
                                            className="h-8 bg-slate-600 border-slate-500 text-white text-sm pr-8"
                                        />
                                        <button
                                            onClick={() => setShowPassFor(isShowingPass ? null : u.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                        >
                                            {isShowingPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                    <Button size="sm" onClick={() => handleResetPassword(u.id, newPassword)} className="h-8 bg-green-600 hover:bg-green-500 text-white">Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingPassword(null)} className="h-8 text-slate-400 hover:bg-slate-600 hover:text-white">Cancel</Button>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><UserIcon className="w-3 h-3" /> Full Name</p>
                                <p className="text-slate-200 text-xs truncate">{u.full_name || '—'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1">@ Username</p>
                                <p className="text-slate-200 text-xs truncate">{u.username || u.email?.split('@')[0] || '—'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2 sm:col-span-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Mail className="w-3 h-3"/> Email</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-slate-200 text-xs truncate">{u.email}</p>
                                    <button onClick={() => copyText(u.email, "Email")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>
                                </div>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</p>
                                <p className="text-slate-200 text-xs truncate">{u.phone || '—'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Country</p>
                                <p className="text-slate-200 text-xs truncate">{u.country || '—'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Lock className="w-3 h-3" /> Password</p>
                                <div className="flex items-center justify-between">
                                  <p className="text-slate-200 text-xs truncate font-mono">{"*".repeat(10)}</p>
                                  <button onClick={() => { setEditingPassword(u); setNewPassword(''); setEditingUser(null); }} className="text-slate-400 hover:text-white p-1 -mr-1" title="Reset Password">
                                      <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><KeyRound className="w-3 h-3"/> PIN Set</p>
                                <p className={`text-xs font-bold ${u.has_withdrawal_pin ? "text-green-400" : "text-red-400"}`}>
                                {u.has_withdrawal_pin ? "Yes" : "No"}
                                </p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Link2 className="w-3 h-3"/> Referral Code</p>
                                <div className="flex items-center gap-1.5">
                                <p className="text-amber-400 text-xs font-mono font-bold">{u.referral_code || '—'}</p>
                                {u.referral_code && <button onClick={() => copyText(u.referral_code!, "Referral code")} className="text-slate-500 hover:text-amber-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>}
                                </div>
                            </div>
                             <div className="bg-slate-700/50 rounded-xl px-3 py-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><Users className="w-3 h-3"/> Referred By</p>
                                <p className="text-slate-200 text-xs truncate font-mono">{u.referred_by || '—'}</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2 sm:col-span-2">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-0.5 flex items-center gap-1"><ExternalLink className="w-3 h-3"/> Referral Link</p>
                                <div className="flex items-center gap-1.5">
                                    <a href={referralLink || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline text-xs font-mono truncate">
                                        {referralLink || '—'}
                                    </a>
                                    {referralLink && <button onClick={() => copyText(referralLink!, "Referral link")} className="text-slate-500 hover:text-blue-400 flex-shrink-0"><Copy className="w-3 h-3" /></button>}
                                </div>
                            </div>
                            {u.rented_generators && u.rented_generators.length > 0 && (
                                <div className="bg-slate-700/50 rounded-xl p-3 sm:col-span-2">
                                    <p className="text-slate-400 text-[10px] uppercase tracking-wide mb-2 flex items-center gap-1"><Zap className="w-3 h-3"/> Rented Generators ({u.rented_generators.length})</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                                        {u.rented_generators.map(gen => {
                                            const isExpired = new Date(gen.expires_at).getTime() < Date.now();
                                            const rentedDate = gen.rented_at ? new Date(gen.rented_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
                                            return (
                                                <div key={`${gen.id}-${gen.expires_at}`} className={`flex items-center justify-between text-xs p-2 rounded-lg ${isExpired ? 'bg-slate-800/50' : 'bg-green-950/30'}`}>
                                                    <div>
                                                        <span className={`font-semibold ${isExpired ? 'text-slate-400' : 'text-green-300'}`}>{gen.name}</span>
                                                        <span className={`ml-2 text-[10px] ${isExpired ? 'text-slate-500' : 'text-green-400/80'}`}>Rented: {rentedDate}</span>
                                                    </div>
                                                    {isExpired 
                                                        ? <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-500 px-1.5 py-0">Expired</Badge>
                                                        : <Badge className="text-[9px] bg-green-500/20 border-green-500/30 text-green-300 px-1.5 py-0">Active</Badge>
                                                    }
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button onClick={function() { setEditingUser(u); setNewBalance(String(u.balance || 0)); }}
                            data-testid={`button-edit-user-${u.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 text-xs font-semibold">
                            <Edit3 className="w-3 h-3" /> Edit Balance
                          </button>
                          <button onClick={() => handleToggleWithdrawalLock(u.id, !!u.withdrawal_locked)}
                            data-testid={`button-lock-user-${u.id}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                                u.withdrawal_locked
                                ? "bg-green-900/30 text-green-400 border-green-800 hover:bg-green-900/50" // to unlock
                                : "bg-orange-900/40 text-orange-400 border-orange-700 hover:bg-orange-900/50" // to lock
                            }`}>
                            {u.withdrawal_locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            {u.withdrawal_locked ? 'Unlock Withdrawals' : 'Lock Withdrawals'}
                          </button>
                          <button onClick={function() { return openConfirm("Delete User Account", `You are about to permanently delete "${nameForDisplay}". Their profile and all data will be erased. This CANNOT be undone.`, function() { return handleDeleteUser(u.id); }); }}
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
                <Button onClick={function() { return fetchData(); }} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
              {depositsLoading ? <p className="text-slate-400 text-sm">Loading...</p> : deposits.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <DollarSign className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No deposit requests yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deposits.map(function(d) {
                    const user = users.find(u => u.id === d.user_id);
                    return (
                    <DepositRow
                      key={d.id}
                      d={d}
                      user={user}
                      onApprove={() => handleApproveDeposit(d.id, d.user_id, d.amount)}
                      onReject={() => handleRejectDeposit(d.id, d.user_id, d.amount)}
                      onDelete={() => openConfirm("Delete Deposit Record", `Remove the deposit record for $${d.amount.toFixed(2)} from ${user?.full_name || 'user'}? This cannot be undone.`, () => handleDeleteDeposit(d.id))}
                      approvePending={false}
                      rejectPending={false}
                      copyText={copyText}
                    />
                  ); })}
                </div>
              )}
            </div>
          )}

          {/* ── WITHDRAWALS ── */}
          {tab === "withdrawals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">Withdrawal Requests</h1><p className="text-slate-400 text-sm">{pendingWithdrawalsCount} pending · {withdrawals.length} total</p></div>
                <Button onClick={function() { return fetchData(); }} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
              </div>
              {withdrawalsLoading ? <p className="text-slate-400 text-sm">Loading...</p> : withdrawals.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center">
                  <ArrowUpFromLine className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No withdrawal requests yet.</p>
                </div>
              ) : (
              <div className="space-y-3">
                {withdrawals.map(function(w) {
                  const user = users.find(u => u.id === w.user_id);
                  const dateStr = new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  const methodLabel = w.method === "momo" ? "MTN MOMO" : w.method === "tigo" ? "AirtelTigo" : w.method === "usdt" ? "USDT" : w.method === "card" ? "CARD" : w.method.toUpperCase();
                  const statusColor = 
                    w.status === "complete" ? "bg-green-900/40 text-green-400 border-green-700" 
                    : w.status === "rejected" ? "bg-red-900/40 text-red-400 border-red-700" 
                    : w.status === "processing" ? "bg-blue-900/40 text-blue-400 border-blue-700" 
                    : "bg-yellow-900/40 text-yellow-400 border-yellow-700";

                  return (
                  <div key={w.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColor.replace('text-', 'bg-').replace('-400', '-900/40')}`}>
                          <ArrowUpFromLine className={`w-5 h-5 ${statusColor.replace('bg-', 'text-').replace('border-', 'text-').replace('-900/40', '-400').replace('-700', '-400')}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-semibold text-sm">{user?.full_name || 'Unknown'}</p>
                            <Badge className={`text-xs border px-1.5 py-0 ${statusColor}`}>{w.status}</Badge>
                          </div>
                          <p className="text-slate-400 text-xs">@{user?.username || '...'} · {methodLabel} · {w.country} · {dateStr}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                            <p className="text-amber-400 font-black text-base">${w.amount.toFixed(2)}</p>
                            <p className="text-slate-400 text-xs mt-0.5">Net ${w.net_amount.toFixed(2)} + Fee ${w.fee.toFixed(2)}</p>
                            {w.country === 'Ghana' && (
                              <div className="mt-2 text-green-300 bg-green-900/50 border border-green-700/50 rounded-lg p-2 text-center">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-green-400">Amount to Pay</p>
                                <p className="text-lg font-black text-green-300">GH₵{(w.net_amount * 10).toFixed(2)}</p>
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                     {w.details && (() => {
                        try {
                            const detailsObj = JSON.parse(w.details);
                            return (
                                <div className="pt-3 border-t border-slate-700">
                                    <p className="text-slate-300 text-xs font-semibold mb-2">Withdrawal Details</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 bg-slate-700/50 rounded-xl p-3">
                                        {Object.entries(detailsObj).map(([key, value]) => {
                                            const lKey = key.toLowerCase();
                                            // Security: Don't show sensitive card details
                                            if (w.method === 'card' && (lKey === 'cvv' || lKey === 'cvvvisible')) return null;
                                            
                                            // Don't show internal flags
                                            if (lKey === 'cvvvisible') return null;

                                            if (typeof value !== 'string' && typeof value !== 'number') return null;
                                            
                                            const displayValue = lKey === 'number' && w.method === 'card'
                                                ? String(value).replace(/\d{4}(?=\d{4})/g, "•••• ")
                                                : String(value);

                                            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                                            const isCopyable = ['name', 'holder', 'number', 'phone', 'address'].some(k => lKey.includes(k));

                                            return (
                                                <div key={key}>
                                                    <p className="text-slate-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                                                        {getDetailIcon(key)} {formattedKey}
                                                    </p>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="text-slate-200 text-xs font-mono truncate">{displayValue}</p>
                                                        {isCopyable && (
                                                            <button onClick={() => copyText(String(value), formattedKey)} className="text-slate-500 hover:text-amber-400 flex-shrink-0">
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        } catch (e) {
                            return (
                                <div className="pt-3 border-t border-slate-700">
                                    <p className="text-slate-300 text-xs font-semibold mb-2">Withdrawal Details</p>
                                    <div className="bg-slate-700/50 rounded-xl p-3">
                                        <p className="text-slate-200 text-xs font-mono">{w.details}</p>
                                    </div>
                                </div>
                            )
                        }
                    })()}
                    <div className="flex gap-2 items-center w-full justify-end pt-3 border-t border-slate-700">
                      {w.status === 'pending' && (
                          <>
                              <button onClick={() => handleProcessWithdrawal(w.id)}
                                  data-testid={`button-process-withdrawal-${w.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-700 hover:bg-blue-900/50 text-xs font-semibold">
                                  <RefreshCw className="w-3.5 h-3.5" /> Process
                              </button>
                              <button onClick={() => openConfirm("Reject Withdrawal", `Reject withdrawal of $${w.amount.toFixed(2)} from ${user?.full_name || 'user'}? The amount will be refunded to their balance.`, () => handleRejectWithdrawal(w.id, w.user_id, w.amount))}
                                  data-testid={`button-reject-withdrawal-${w.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 text-xs font-semibold">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                          </>
                      )}
                      {w.status === 'processing' && (
                          <>
                              <button onClick={() => handleCompleteWithdrawal(w.id)}
                                  data-testid={`button-complete-withdrawal-${w.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                              </button>
                              <button onClick={() => openConfirm("Reject Withdrawal", `Reject withdrawal of $${w.amount.toFixed(2)} from ${user?.full_name || 'user'}? The amount will be refunded to their balance.`, () => handleRejectWithdrawal(w.id, w.user_id, w.amount))}
                                  data-testid={`button-reject-withdrawal-${w.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50 text-xs font-semibold">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                          </>
                      )}
                      {w.status === 'complete' && <span className="flex items-center gap-1 text-green-400 text-xs font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>}
                      {w.status === 'rejected' && <span className="flex items-center gap-1 text-red-400 text-xs font-semibold"><XCircle className="w-3.5 h-3.5" /> Rejected</span>}

                      <button
                        onClick={() => openConfirm("Delete Withdrawal Record", `Remove the withdrawal record for $${w.amount.toFixed(2)} from ${user?.full_name || 'user'}? This cannot be undone.`, () => handleDeleteWithdrawal(w.id))}
                        data-testid={`button-delete-withdrawal-${w.id}`}
                        className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-950/40 text-red-500 border border-red-800/50 hover:bg-red-900/50 hover:text-red-300 transition-colors flex-shrink-0"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                  { label: "Active Codes", value: users.filter(function(r: any) { return r.referral_code; }).length.toString(), icon: CheckCircle, color: "text-green-400" },
                  { label: "Total Users", value: users.length.toString(), icon: Users, color: "text-blue-400" },
                ].map(function({ label, value, icon: Icon, color }) { return (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 text-center">
                    <Icon className={`w-6 h-6 ${color} mx-auto mb-2`} />
                    <p className="text-white text-xl font-black">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ); })}
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
                        <th className="text-left px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">Referred By</th>
                        <th className="text-right px-4 py-3 text-slate-300 font-semibold text-xs uppercase tracking-wide">Balance</th>
                      </tr></thead>
                      <tbody className="divide-y divide-slate-700">
                        {users.map((u: UserRecord) => { 
                          const referrer = u.referred_by ? codeToUserMap.get(u.referred_by) : null;
                          return (
                          <tr key={u.id} className="hover:bg-slate-700/40 transition-colors">
                            <td className="px-4 py-3"><p className="text-white font-medium text-sm">{u.full_name}</p><p className="text-slate-400 text-xs">@{u.username}</p></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-400 font-bold font-mono text-xs bg-amber-900/30 border border-amber-700 px-2 py-0.5 rounded-lg">{u.referral_code || "—"}</span>
                                {u.referral_code && <button onClick={() => copyText(u.referral_code!, "Referral code")} className="text-slate-500 hover:text-amber-400"><Copy className="w-3 h-3" /></button>}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center"><Badge className={`text-xs border ${(u.referral_count || 0) > 0 ? "bg-green-900/40 text-green-400 border-green-700" : "bg-slate-700 text-slate-400 border-slate-600"}`}>{u.referral_count || 0} users</Badge></td>
                            <td className="px-4 py-3">
                                {referrer ? (
                                    <div>
                                        <p className="text-slate-300 text-sm font-medium">{referrer.full_name}</p>
                                        <p className="text-slate-500 text-xs">@{referrer.username}</p>
                                    </div>
                                ) : (
                                    <span className="text-slate-500">{u.referred_by || '—'}</span>
                                )}
                            </td>
                            <td className="px-4 py-3 text-right"><span className="text-green-400 font-bold text-sm">${(u.balance || 0).toFixed(2)}</span></td>
                          </tr>
                        ); })}
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-black text-white">Generators Factory</h1>
                  <p className="text-slate-400 text-sm">Create, edit, publish generators · {generators.length} total · {generators.filter(function(g) { return g.published; }).length} published</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
                  <Button onClick={() => openConfirm(
                    "Seed Default Generators?",
                    "This will DELETE all current generators and replace them with the 4 default (PG1-PG4) generators. This cannot be undone.",
                    handleSeedGenerators
                  )} variant="outline" size="sm" className="h-9 border-orange-700/50 bg-orange-950 text-orange-300 hover:bg-orange-900 hover:text-orange-200">
                    <DatabaseZap className="w-4 h-4 mr-2" /> Seed Defaults
                  </Button>
                  <Button onClick={function() { return fetchData(); }} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={function() { return setNewGen({ ...BLANK_GEN }); setShowCreateGen(true); }}
                    data-testid="button-create-generator"
                    className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center gap-1.5 rounded-xl shadow-md">
                    <Plus className="w-4 h-4" /> New Generator
                  </Button>
                </div>
              </div>

              {gensLoading ? <p className="text-slate-400 text-sm">Loading...</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generators.map(function(g) { return (
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
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "ID", value: g.id },
                            { label: "Price", value: `$${g.price.toLocaleString()}` },
                            { label: "Days", value: `${g.expire_days}` },
                            { label: "Daily Income", value: `$${g.daily_income}` },
                            { label: "Max Rentals", value: g.max_rentals },
                          ].map(function({ label, value }) { return (
                            <div key={label} className="bg-slate-700/50 rounded-xl px-2.5 py-2">
                              <p className="text-slate-400 text-[10px]">{label}</p>
                              <p className="text-white text-xs font-semibold truncate">{value}</p>
                            </div>
                          ); })}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={function() { return setEditingGen({ ...g }); }}
                            data-testid={`button-edit-gen-${g.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-900/50 text-xs font-semibold">
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handlePublishToggle(g)}
                            data-testid={`button-publish-gen-${g.id}`}
                            className={`flex-1 flex items-center justify-center gap-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${g.published ? "bg-green-900/30 border-green-600 text-green-300 shadow-[0_0_8px_rgba(34,197,94,0.25)]" : "bg-slate-700/60 border-slate-600 text-slate-400 hover:border-slate-500"}`}
                          >
                            <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 flex-shrink-0 ${g.published ? "bg-green-500" : "bg-slate-600"}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${g.published ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                            </div>
                            <span className="tracking-widest text-[11px]">{g.published ? "ON" : "OFF"}</span>
                          </button>
                          <button onClick={function() { return openConfirm(
                              "Delete Generator",
                              `Are you sure you want to delete "${g.name}"? This cannot be undone.`,
                              function() { return handleDeleteGenerator(g.id); }
                            ); }}
                            data-testid={`button-delete-gen-${g.id}`}
                            className="px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50 text-xs font-semibold">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ); })}
                </div>
              )}

            </div>
          )}

          {/* ── MEDIA ── */}
          {tab === "media" && (
             <div className="space-y-4">
              <div><h1 className="text-xl font-black text-white">Media Management</h1><p className="text-slate-400 text-sm">Update images, videos, and icons for the app.</p></div>

              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Power Page Header</h3>
                  <p className="text-sm text-slate-400">This is the background image for the header on the Power Center page.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                           <img src={media.find(m => m.id === 'power-header-banner')?.url || 'https://picsum.photos/seed/powerheader/1200/400'} alt="Power Page Header" className="w-full h-auto rounded-lg aspect-[16/9] object-cover bg-slate-700" />
                           <label htmlFor={`act-upload-power-header-banner`} className={`mt-2 text-xs cursor-pointer hover:underline ${uploading === 'activity-power-header-banner' ? 'text-slate-400' : 'text-amber-400'}`}>
                              {uploading === 'activity-power-header-banner' ? 'Uploading...' : 'Upload new header image'}
                           </label>
                           <input type="file" id={`act-upload-power-header-banner`} className="hidden" accept="image/*" disabled={uploading === 'activity-power-header-banner'} onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('activity', 'power-header-banner', file);
                           }}/>
                      </div>
                  </div>
              </div>
              
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Homepage Cover Image</h3>
                  <p className="text-sm text-slate-400">This is the main background image on the public homepage.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                           <img src={media.find(m => m.id === 'homepage-cover')?.url || 'https://picsum.photos/seed/joyfulwoman/1080/1920'} alt="Homepage Cover" className="w-full h-auto rounded-lg aspect-[9/16] object-cover bg-slate-700" />
                           <label htmlFor={`act-upload-homepage-cover`} className={`mt-2 text-xs cursor-pointer hover:underline ${uploading === 'activity-homepage-cover' ? 'text-slate-400' : 'text-amber-400'}`}>
                              {uploading === 'activity-homepage-cover' ? 'Uploading...' : 'Upload new cover image'}
                           </label>
                           <input type="file" id={`act-upload-homepage-cover`} className="hidden" accept="image/*" disabled={uploading === 'activity-homepage-cover'} onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('activity', 'homepage-cover', file);
                           }}/>
                      </div>
                  </div>
              </div>

              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">About Page Hero</h3>
                  <p className="text-sm text-slate-400">This is the main background image on the 'About' page.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          <img src={media.find(m => m.id === 'about-page-hero')?.url || 'https://picsum.photos/seed/about-hero/1200/400'} alt="About Page Hero" className="w-full h-auto rounded-lg aspect-video object-cover bg-slate-700" />
                           <label htmlFor={`act-upload-about-page-hero`} className={`mt-2 text-xs cursor-pointer hover:underline ${uploading === 'activity-about-page-hero' ? 'text-slate-400' : 'text-amber-400'}`}>
                              {uploading === 'activity-about-page-hero' ? 'Uploading...' : 'Upload new hero image'}
                           </label>
                           <input type="file" id={`act-upload-about-page-hero`} className="hidden" accept="image/*" disabled={uploading === 'activity-about-page-hero'} onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('activity', 'about-page-hero', file);
                           }}/>
                      </div>
                  </div>
              </div>

              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Tutorial Video</h3>
                  <p className="text-sm text-slate-400">This video appears on the 'How to Start' and 'Video Tutorial' pages.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                          {media.find(m => m.id === 'tutorial-video')?.url ? (
                            <video
                                key={media.find(m => m.id === 'tutorial-video')?.url}
                                controls
                                src={media.find(m => m.id === 'tutorial-video')?.url}
                                className="w-full h-auto rounded-lg aspect-video bg-slate-700"
                            />
                          ) : (
                            <div className="w-full aspect-video rounded-lg bg-slate-700 flex flex-col items-center justify-center text-slate-500">
                                <Video className="w-10 h-10 mb-2" />
                                <span className="text-xs font-semibold">No video uploaded</span>
                            </div>
                          )}
                           <label htmlFor={`vid-upload-tutorial-video`} className={`mt-2 text-xs cursor-pointer hover:underline ${uploading === 'video-tutorial-video' ? 'text-slate-400' : 'text-amber-400'}`}>
                              {uploading === 'video-tutorial-video' ? 'Uploading...' : 'Upload new video'}
                           </label>
                           <input type="file" id={`vid-upload-tutorial-video`} className="hidden" accept="video/mp4,video/webm" disabled={uploading === 'video-tutorial-video'} onChange={async (e) => {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('video', 'tutorial-video', file);
                           }}/>
                      </div>
                  </div>
              </div>

               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Application Logo</h3>
                  <p className="text-sm text-slate-400">This logo appears on the Sign In and Sign Up pages.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center">
                          <img src={logoImg} alt="App Logo" className="w-full h-auto rounded-lg aspect-square object-cover bg-slate-700 p-4" />
                           <label htmlFor={`act-upload-app-logo`} className={`mt-2 text-xs cursor-pointer hover:underline ${uploading === 'activity-app-logo' ? 'text-slate-400' : 'text-amber-400'}`}>
                              {uploading === 'activity-app-logo' ? 'Uploading...' : 'Upload new logo'}
                           </label>
                           <input type="file" id={`act-upload-app-logo`} className="hidden" accept="image/*" disabled={uploading === 'activity-app-logo'} onChange={async function(e) {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('activity', 'app-logo', file);
                           }}/>
                      </div>
                  </div>
              </div>

              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Generator Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {coreGeneratorIds.map(function(id) {
                      const g = generators.find(gen => gen.id === id);
                      const imageUrl = g?.image_url || PlaceHolderImages.find(function(i) { return i.id === `gen-${id}`; })?.imageUrl;
                      const name = g?.name || id.toUpperCase();
                      const isUploading = uploading === `generator-${id}`;
                      return (
                        <div key={id} className="text-center">
                          <img src={imageUrl} alt={name} className="w-full h-auto rounded-lg aspect-square object-contain bg-slate-700" />
                           <label htmlFor={`gen-upload-${id}`} className={`mt-2 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                              {isUploading ? 'Uploading...' : `Upload for ${id.toUpperCase()}`}
                           </label>
                           <input type="file" id={`gen-upload-${id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async function(e) {
                             const file = e.target.files?.[0];
                             if (file) await handleFileUpload('generator', id, file);
                           }}/>
                        </div>
                      );
                    })}
                    {otherGenerators.map(function(g) {
                      const isUploading = uploading === `generator-${g.id}`;
                      return (
                        <div key={g.id} className="text-center">
                          <img src={g.image_url || PlaceHolderImages.find(function(i) { return i.id === `gen-${g.id}`; })?.imageUrl} alt={g.name} className="w-full h-auto rounded-lg aspect-square object-contain bg-slate-700" />
                           <label htmlFor={`gen-upload-${g.id}`} className={`mt-2 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                              {isUploading ? 'Uploading...' : `Upload for ${g.id.toUpperCase()}`}
                           </label>
                           <input type="file" id={`gen-upload-${g.id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async function(e) {
                             const file = e.target.files?.[0];
                             if (file) await handleFileUpload('generator', g.id, file);
                           }}/>
                        </div>
                      );
                    })}
                  </div>
              </div>

               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">License Card Images</h3>
                  <p className="text-sm text-slate-400">These images appear as the background for the license cards on the Activity page.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'license-consob', name: 'CONSOB License' },
                      { id: 'license-banca', name: 'Banca d\'Italia License' },
                      { id: 'license-camera', name: 'Camera di Commercio' },
                      { id: 'license-mica', name: 'EU MiCA Compliance' },
                    ].map(({ id, name }) => {
                        const imageUrl = media.find(m => m.id === id)?.url || `https://picsum.photos/seed/${id}/600/400`;
                        const isUploading = uploading === `license-${id}`;
                        return (
                            <div key={id} className="text-center">
                                <img src={imageUrl} alt={name} className="w-full h-auto rounded-lg aspect-[3/2] object-cover bg-slate-700" />
                                <p className="text-white text-sm font-semibold mt-2">{name}</p>
                                <label htmlFor={`lic-upload-${id}`} className={`mt-1 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                                    {isUploading ? 'Uploading...' : 'Upload new image'}
                                </label>
                                <input type="file" id={`lic-upload-${id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) await handleFileUpload('license', id, file);
                                }}/>
                            </div>
                        )
                    })}
                  </div>
              </div>
              
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Leadership Team Images</h3>
                  <p className="text-sm text-slate-400">These images appear on the About page.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                          { id: 'ceo-portrait', name: 'Alessandro Romano' },
                          { id: 'leader-tn', name: 'Themba Nkosi' },
                          { id: 'leader-jc', name: 'James Carter' },
                          { id: 'leader-sm', name: 'Sophie Müller' },
                      ].map(({ id, name }) => {
                          const imageUrl = media.find(m => m.id === id)?.url || PlaceHolderImages.find(i => i.id === id)?.imageUrl;
                          const isUploading = uploading === `activity-${id}`;
                          return (
                              <div key={id} className="text-center">
                                  <img src={imageUrl} alt={name} className="w-full h-auto rounded-lg aspect-square object-cover bg-slate-700" />
                                  <p className="text-white text-sm font-semibold mt-2">{name}</p>
                                  <label htmlFor={`act-upload-${id}`} className={`mt-1 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                                      {isUploading ? 'Uploading...' : 'Upload new photo'}
                                  </label>
                                  <input type="file" id={`act-upload-${id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) await handleFileUpload('activity', id, file);
                                  }}/>
                              </div>
                          )
                      })}
                  </div>
              </div>
               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Payment Method Icons</h3>
                  <p className="text-sm text-slate-400">These icons appear on the Bank page for deposits and withdrawals.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                          { id: 'payment-usdt', name: 'USDT' },
                          { id: 'payment-mtn-momo', name: 'MTN MOMO' },
                          { id: 'payment-bank-transfer', name: 'Bank Transfer' },
                          { id: 'payment-western-union', name: 'Western Union' },
                          { id: 'payment-card', name: 'Card' },
                      ].map(({ id, name }) => {
                          const imageUrl = media.find(m => m.id === id)?.url || PlaceHolderImages.find(i => i.id === id)?.imageUrl;
                          const isUploading = uploading === `activity-${id}`;
                          return (
                              <div key={id} className="text-center">
                                  <div className="w-full h-auto rounded-lg aspect-square object-contain bg-slate-700 p-2">
                                      {imageUrl ? <img src={imageUrl} alt={name} className="w-full h-full object-contain" /> : <div className="w-full h-full bg-slate-600 rounded-md" />}
                                  </div>
                                  <p className="text-white text-sm font-semibold mt-2">{name}</p>
                                  <label htmlFor={`act-upload-${id}`} className={`mt-1 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                                      {isUploading ? 'Uploading...' : 'Upload new icon'}
                                  </label>
                                  <input type="file" id={`act-upload-${id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) await handleFileUpload('activity', id, file);
                                  }}/>
                              </div>
                          )
                      })}
                  </div>
              </div>
              <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <h3 className="font-bold text-white">Activity Page Images</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {['hero', 'teamwork'].map(function(id) {
                        const isUploading = uploading === `activity-${id}`;
                        return (
                          <div key={id} className="text-center">
                            <img src={id === 'hero' ? heroImg : teamworkImg} alt={id} className="w-full h-auto rounded-lg aspect-[16/9] object-cover" />
                             <label htmlFor={`act-upload-${id}`} className={`mt-2 text-xs cursor-pointer hover:underline ${isUploading ? 'text-slate-400' : 'text-amber-400'}`}>
                                {isUploading ? 'Uploading...' : `Upload ${id} image`}
                             </label>
                             <input type="file" id={`act-upload-${id}`} className="hidden" accept="image/*" disabled={isUploading} onChange={async function(e) {
                               const file = e.target.files?.[0];
                               if (file) await handleFileUpload('activity', id, file);
                             }} />
                          </div>
                        );
                      })}
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
                   <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Amount ($)</label>
                          <Input type="number" value={newCodeAmount} onChange={(e) => setNewCodeAmount(e.target.value)} placeholder="e.g. 10.00" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                      </div>
                      <div className="sm:col-span-2">
                          <label className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide block mb-1">Note (Optional)</label>
                          <Input value={newCodeNote} onChange={(e) => setNewCodeNote(e.target.value)} placeholder="e.g. For marketing campaign" className="h-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 text-sm" />
                      </div>
                   </div>
                   <Button onClick={handleCreateGiftCode} className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold gap-1.5"><Gift className="w-4 h-4" /> Generate Code</Button>
               </div>
               
               {generatedCode && (
                  <div className="p-4 bg-green-900/30 rounded-2xl border border-green-700 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-green-400">Code Generated Successfully!</h3>
                          <p className="text-xs text-slate-400">Share this code with a user to add ${generatedCode.amount.toFixed(2)} to their balance.</p>
                        </div>
                        <button onClick={() => setGeneratedCode(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl p-3">
                        <span className="font-mono font-black text-xl text-amber-400 flex-1 text-center tracking-widest">{generatedCode.code}</span>
                        <Button onClick={() => { copyText(generatedCode.code, 'Gift Code'); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300 hover:bg-slate-700 flex-shrink-0 gap-1.5">
                          {copiedCode ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />} {copiedCode ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                  </div>
               )}

               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                 <h3 className="font-bold text-white">Existing Codes</h3>
                 {codesLoading ? (
                   <p className="text-slate-400 text-sm">Loading codes...</p>
                 ) : bonusCodes.length === 0 ? (
                   <p className="text-slate-500 text-sm text-center py-4">No gift codes created yet.</p>
                 ) : (
                   <div className="space-y-2">
                    {bonusCodes.map(code => (
                      <div key={code.id} className={`p-3 rounded-xl flex items-center justify-between gap-3 ${code.is_redeemed ? 'bg-slate-700/50' : 'bg-slate-700'}`}>
                        <div>
                           <div className="flex items-center gap-2">
                             <p className={`font-mono font-bold text-sm ${code.is_redeemed ? 'text-slate-500 line-through' : 'text-amber-400'}`}>{code.code}</p>
                             <Badge className={`text-xs border px-1.5 py-0 ${code.is_redeemed ? 'bg-red-900/40 text-red-400 border-red-700' : 'bg-green-900/40 text-green-400 border-green-700'}`}>
                               {code.is_redeemed ? 'Redeemed' : 'Active'}
                             </Badge>
                           </div>
                           <p className="text-slate-400 text-xs mt-0.5">${code.amount.toFixed(2)} {code.note ? `· ${code.note}` : ''}</p>
                           <p className="text-slate-500 text-[10px] mt-0.5">Created: {new Date(code.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!code.is_redeemed && <Button onClick={() => copyText(code.code, 'Gift Code')} variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white"><Copy className="w-4 h-4" /></Button>}
                           <Button onClick={() => openConfirm('Delete Code?', `Are you sure you want to delete code ${code.code}? This cannot be undone.`, () => handleDeleteGiftCode(code.id))} variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-900/30"><Trash2 className="w-4 h-4" /></Button>
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
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-black text-white">Site Settings</h1>
                <p className="text-slate-400 text-sm">Manage global configurations for the application.</p>
              </div>

              {/* Withdrawal Settings */}
              <div className="p-5 bg-slate-800 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-white mb-1">Withdrawal Settings</h3>
                <p className="text-slate-400 text-xs mb-4">Control withdrawal limits and fees.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold">Minimum Withdrawal ($)</label>
                    <Input type="number" defaultValue="1" className="mt-1 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold">Withdrawal Fee (%)</label>
                    <Input type="number" defaultValue="15" className="mt-1 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                  <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                    <span className="text-slate-300 text-sm font-medium">Enable Withdrawals</span>
                    <Switch defaultChecked={true} />
                  </div>
                </div>
              </div>

              {/* General Site Information */}
              <div className="p-5 bg-slate-800 rounded-2xl border border-slate-700">
                <h3 className="font-bold text-white mb-1">General Information</h3>
                <p className="text-slate-400 text-xs mb-4">Basic site details and contact info.</p>
                <div className="space-y-4">
                  <div>
                    <label className="text-slate-400 text-xs font-semibold">Site Name</label>
                    <Input defaultValue="CoinPower" className="mt-1 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-semibold">Support Email</label>
                    <Input type="email" defaultValue="support@coinpower.com" className="mt-1 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                   <div>
                    <label className="text-slate-400 text-xs font-semibold">Telegram Group Link</label>
                    <Input defaultValue="https://t.me/coinpow_group" className="mt-1 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                 <Button onClick={() => toast({ title: 'Settings Saved!', description: 'Your changes have been saved.' })} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold">
                   Save Changes
                </Button>
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
            <div className="flex items-center justify-between mb-4"><h3 className="text-white font-bold">Edit User Balance</h3><button onClick={function() { return setEditingUser(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button></div>
            <p className="text-slate-300 text-sm font-medium">{editingUser.full_name}</p>
            <p className="text-slate-500 text-xs mb-1">@{editingUser.username} · {editingUser.country}</p>
            <p className="text-green-400 text-sm mb-4">Current: ${(editingUser.balance || 0).toFixed(2)}</p>
            <div className="mb-4">
              <label className="text-slate-300 text-xs font-medium mb-1.5 block">New Balance ($)</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <Input type="number" value={newBalance} onChange={function(e) { return setNewBalance(e.target.value); }} data-testid="input-new-balance" placeholder="0.00" min="0" step="0.01" className="pl-7 h-11 bg-slate-700 border-slate-600 text-white focus:border-amber-500" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={function() { return setEditingUser(null); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
              <Button onClick={function() { return handleUpdateBalance(editingUser.id, parseFloat(newBalance) || 0); }} data-testid="button-save-balance" className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold">
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
              <button onClick={function() { return setShowCreateGen(false); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Generator Name *</label>
                  <Input value={newGen.name} onChange={function(e) { return setNewGen({ ...newGen, name: e.target.value }); }} placeholder="e.g. PG5 Generator" data-testid="input-gen-name" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Subtitle</label>
                  <Input value={newGen.subtitle} onChange={function(e) { return setNewGen({ ...newGen, subtitle: e.target.value }); }} placeholder="e.g. Ultra Power Plan" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Rent Price ($) *</label>
                  <Input type="number" value={newGen.price || ""} onChange={function(e) { return setNewGen({ ...newGen, price: parseFloat(e.target.value) || 0 }); }} placeholder="100" data-testid="input-gen-price" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Daily Income ($) *</label>
                  <Input type="number" value={newGen.daily_income || ""} onChange={function(e) { return setNewGen({ ...newGen, daily_income: parseFloat(e.target.value) || 0 }); }} placeholder="10" data-testid="input-gen-income" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Expire Days *</label>
                  <Input type="number" value={newGen.expire_days || ""} onChange={function(e) { return setNewGen({ ...newGen, expire_days: parseInt(e.target.value) || 0 }); }} placeholder="30" data-testid="input-gen-expire" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                 <div>
                    <label className="text-slate-300 text-xs font-medium mb-1 block">Max Rentals *</label>
                    <Input type="number" value={newGen.max_rentals || ""} onChange={e => setNewGen({ ...newGen, max_rentals: parseInt(e.target.value) || 1 })} placeholder="1" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">ROI Display</label>
                  <Input value={newGen.roi} onChange={function(e) { return setNewGen({ ...newGen, roi: e.target.value }); }} placeholder="e.g. 8%" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Period</label>
                  <Input value={newGen.period} onChange={function(e) { return setNewGen({ ...newGen, period: e.target.value }); }} placeholder="Daily" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-slate-300 text-xs font-medium mb-1 block">Icon (emoji)</label>
                  <Input value={newGen.icon} onChange={function(e) { return setNewGen({ ...newGen, icon: e.target.value }); }} placeholder="⚡" className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500 text-center" />
                </div>
              </div>

              <div>
                <label className="text-slate-300 text-xs font-medium mb-2 block">Color Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(function(c) { return (
                    <button key={c.value} onClick={function() { return setNewGen({ ...newGen, color: c.value }); }}
                      className={`h-10 rounded-xl bg-gradient-to-r ${c.value} text-white text-xs font-bold border-2 transition-all ${newGen.color === c.value ? "border-white scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      {c.label}
                    </button>
                  ); })}
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-700/50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm font-semibold">Publish immediately</p>
                  <p className="text-slate-400 text-xs">Make visible in Market</p>
                </div>
                <button onClick={function() { return setNewGen({ ...newGen, published: !newGen.published }); }}
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
                    <p className="text-white/70 text-xs">${newGen.price}/rent · ${newGen.daily_income}/day · {newGen.expire_days}d</p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${newGen.published ? "bg-green-500 text-white" : "bg-black/30 text-white/70"}`}>{newGen.published ? "LIVE" : "DRAFT"}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <Button onClick={function() { return setShowCreateGen(false); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
              <Button
                onClick={function() { if (!newGen.name) { toast({ title: "Name is required", variant: "destructive" }); return; } handleCreateGenerator(); }}
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
              <button onClick={function() { return setEditingGen(null); }} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: "Name", key: "name", type: "text" },
                { label: "Subtitle", key: "subtitle", type: "text" },
                { label: "ROI Display", key: "roi", type: "text" },
                { label: "Period", key: "period", type: "text" },
                { label: "Rent Price ($)", key: "price", type: "number" },
                { label: "Expire Days", key: "expire_days", type: "number" },
                { label: "Daily Income ($)", key: "daily_income", type: "number" },
                { label: "Max Rentals", key: "max_rentals", type: "number" },
              ].map(function({ label, key, type }) { return (
                <div key={key}>
                  <label className="text-slate-400 text-xs font-medium mb-1 block">{label}</label>
                  <Input type={type} value={(editingGen as any)[key]} onChange={function(e) { return setEditingGen({ ...editingGen, [key]: type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }); }}
                    className="h-9 bg-slate-700 border-slate-600 text-white text-sm focus:border-amber-500" />
                </div>
              ); })}
              <div>
                <label className="text-slate-300 text-xs font-medium mb-2 block">Color Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {COLORS.map(function(c) { return (
                    <button key={c.value} onClick={function() { return setEditingGen({ ...editingGen, color: c.value }); }}
                      className={`h-8 rounded-xl bg-gradient-to-r ${c.value} text-white text-xs font-bold border-2 transition-all ${editingGen.color === c.value ? "border-white scale-105" : "border-transparent opacity-70"}`}>
                      {c.label}
                    </button>
                  ); })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={function() { return setEditingGen(null); }} variant="outline" className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700">Cancel</Button>
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

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading Dashboard...</p></div>}>
      <DashboardContent />
    </Suspense>
  )
}
