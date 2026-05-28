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
  Info, Building2, Phone, Mail, MapPin, Percent, Clock,
  ExternalLink, ArrowUpRight, AlertTriangle, CreditCard, Menu, Gift, DatabaseZap, KeyRound, User as UserIcon, Lock, Unlock, Video, Landmark, Network, Hash
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
  active_limit: number;
  lifetime_limit: number;
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
  active_limit: 1,
  lifetime_limit: 5,
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
  { id: 'pg1', name: "PG1 Generator", subtitle: "Free Trial Power", icon: "⚡", color: "from-amber-400 to-orange-500", price: 0, expire_days: 2, daily_income: 0.5, published: true, roi: "10%", period: "Daily", min_invest: "$0", max_invest: "$0", investors: "12050", active_limit: 1, lifetime_limit: 1 },
  { id: 'pg2', name: "PG2 Generator", subtitle: "Standard Power", icon: "🔋", color: "from-green-400 to-emerald-600", price: 25, expire_days: 30, daily_income: 2.5, published: true, roi: "12%", period: "Daily", min_invest: "$25", max_invest: "$1000", investors: "8520", active_limit: 2, lifetime_limit: 2 },
  { id: 'pg3', name: "PG3 Generator", subtitle: "Mega Power", icon: "💡", color: "from-blue-400 to-indigo-600", price: 100, expire_days: 20, daily_income: 10, published: true, roi: "15%", period: "Daily", min_invest: "$100", max_invest: "$5000", investors: "4310", active_limit: 1, lifetime_limit: 5 },
  { id: 'pg4', name: "PG4 Generator", subtitle: "Ultra Power", icon: "🚀", color: "from-purple-500 to-pink-600", price: 500, expire_days: 30, daily_income: 55, published: true, roi: "20%", period: "Daily", min_invest: "$500", max_invest: "$20000", investors: "1250", active_limit: 1, lifetime_limit: 4 },
  { id: 'pg5', name: "PG5 Generator", subtitle: "Elite Power", icon: "💎", color: "from-teal-400 to-cyan-600", price: 1000, expire_days: 30, daily_income: 120, published: true, roi: "25%", period: "Daily", min_invest: "$1000", max_invest: "$50000", investors: "540", active_limit: 1, lifetime_limit: 5 },
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
            <button data-testid={`button-approve-deposit-${d.id}`} onClick={onApprove}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-900/30 text-green-400 border border-green-700 hover:bg-green-900/50 text-xs font-semibold disabled:opacity-50">
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </button>
            <button data-testid={`button-reject-deposit-${d.id}`} onClick={onReject}
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
                    <Suspense key={stage.id}>
                        {index > 0 && (
                             <div className={`flex-1 h-0.5 rounded-full ${index <= currentStageIndex ? 'bg-green-500' : 'bg-slate-700'}`} />
                        )}
                        <div className="flex items-center gap-1.5">
                            {isCompleted ? (
                                <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : isActive ? (
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
                                </div>
                            ) : (
                                <div className="w-4 h-4 flex items-center justify-center">
                                     <div className="w-2 h-2 rounded-full bg-slate-600" />
                                </div>
                            )}
                            <span className={`text-xs font-semibold ${
                                isCompleted ? "text-slate-500" : isActive ? "text-blue-400" : "text-slate-600"
                            }`}>
                                {stage.label}
                            </span>
                        </div>
                    </Suspense>
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
        }, {} as Record<string, { id: string; name: string; expires_at: string; rented_at: string; }[]>);
        
        const referralCounts = rawUsers.reduce((acc, user) => {
          if (user.parent_id) acc[user.parent_id] = (acc[user.parent_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const usersWithData = rawUsers.map(user => ({
          ...user,
          referral_count: referralCounts[user.id] || 0,
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
        toast({ title: 'User profile deleted.' });
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
      toast({ title: "User created successfully!" });
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
      toast({ title: "Deposit approved!" });
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

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
        
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;

        if (!publicUrl) throw new Error('Could not get public URL.');

        let dbUpdateResult;
        if (type === 'generator') {
            dbUpdateResult = await adminUpdateGeneratorImage(id, publicUrl);
        } else {
            dbUpdateResult = await adminUpsertMedia(id, publicUrl);
        }

        if (dbUpdateResult.error) throw new Error(dbUpdateResult.error);
        
        await fetchData();
        toast({ title: `${type} updated!` });
      } catch (e: any) {
        toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
      } finally {
        setUploading(null);
      }
  };

  const handleDeleteMedia = async (type: 'generator' | 'activity' | 'video' | 'license', id: string) => {
    let result;
    if (type === 'generator') result = await adminDeleteGeneratorImage(id);
    else result = await adminDeleteMedia(id);

    if (result?.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else {
        toast({ title: 'Asset Deleted' });
        await fetchData();
    }
  };

  const handleSeedGenerators = async () => {
    const result = await adminMutateGenerator('seed', DEFAULT_GENERATORS);
    if (result.error || !result.data) {
      toast({ title: "Error seeding generators", description: result.error, variant: 'destructive' });
    } else {
      toast({ title: "Success", description: "Default generators seeded." });
      await fetchData();
    }
  };

  const handleCreateGiftCode = async () => {
    const amount = parseFloat(newCodeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
      return;
    }
    const result = await adminCreateGiftCode(amount, newCodeNote);
    if (result.error || !result.data) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Gift code created!' });
      setGeneratedCode(result.data);
      setNewCodeAmount("");
      setNewCodeNote("");
      await fetchData();
    }
  };

  const handleDeleteGiftCode = async (codeId: string) => {
    const result = await adminDeleteGiftCode(codeId);
    if (result.error) toast({ title: 'Error', description: result.error, variant: 'destructive' });
    else {
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

  const filteredUsers = users.filter(u => [u.full_name, u.username, u.email, u.country].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === "pending" || w.status === "processing").length;
  const pendingDepositsCount = deposits.filter(d => d.status === "pending").length;
  const copyText = (text: string, label: string) => navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
  const totalReferrals = users.reduce((s, u) => s + (u.referral_count || 0), 0);
  const idToUserMap = new Map(users.map(u => [u.id, u]));

  const heroImg = media.find(m => m.id === 'hero')?.url || PlaceHolderImages.find(i => i.id === 'activity-hero')?.imageUrl;
  const teamworkImg = media.find(m => m.id === 'teamwork')?.url || PlaceHolderImages.find(i => i.id === 'activity-teamwork')?.imageUrl;
  const logoImg = media.find(m => m.id === 'app-logo')?.url || PlaceHolderImages.find(i => i.id === 'signup-logo')?.imageUrl;
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

  const coreGeneratorIds = ['pg1', 'pg2', 'pg3', 'pg4', 'pg5'];
  const otherGenerators = generators.filter(g => !coreGeneratorIds.includes(g.id));

  return (
    <div className="min-h-screen bg-slate-900 text-white">

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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
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

        <div className="px-3 pb-4 pt-2 border-t border-slate-700 flex-shrink-0">
          <button onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between md:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <p className="text-slate-300 text-xs font-semibold capitalize">
          {tabs.find(t => t.id === tab)?.label || ""}
        </p>
        <div className="flex items-center gap-2">
          {(pendingDepositsCount > 0 || pendingWithdrawalsCount > 0) && (
            <div className="flex items-center gap-1 bg-amber-50/20 border border-amber-50/40 rounded-lg px-2 py-1">
              <span className="text-amber-400 text-[10px] font-bold">{pendingDepositsCount + pendingWithdrawalsCount} pending</span>
            </div>
          )}
        </div>
      </div>

      <main className="flex flex-col md:ml-72 pt-12 md:pt-0">
        <div className="flex-1 p-4 sm:p-6">

          {tab === "overview" && (
            <div className="space-y-5">
              <div><h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1><p className="text-slate-400 text-sm">Welcome Administrator</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: users.length.toLocaleString(), icon: Users, color: "from-blue-500 to-blue-600" },
                  { label: "Total Balance", value: `$${totalBalance.toFixed(2)}`, icon: DollarSign, color: "from-green-500 to-green-600" },
                  { label: "Pending Withdrawals", value: String(pendingWithdrawalsCount), icon: ArrowUpFromLine, color: "from-amber-500 to-amber-600" },
                  { label: "Active Rentals", value: activeRentals.toLocaleString(), icon: Zap, color: "from-teal-500 to-cyan-600" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}><Icon className="w-4 h-4 text-white" /></div>
                    <p className="text-xl font-black text-white">{value}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <h2 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><Eye className="w-4 h-4 text-slate-400" /> Traffic Stats</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(() => {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                        const todayVisits = visits.find(v => v.date === today)?.view_count || 0;
                        const yesterdayVisits = visits.find(v => v.date === yesterday)?.view_count || 0;
                        const last7DaysVisits = visits.reduce((sum, v) => sum + v.view_count, 0);
                        return ([
                            { label: "Today", value: todayVisits.toLocaleString() },
                            { label: "Yesterday", value: yesterdayVisits.toLocaleString() },
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
                    <button onClick={() => switchTab("withdrawals")} className="text-amber-400 text-xs flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="space-y-3">
                    {withdrawals.filter(w => w.status === "pending").slice(0, 8).map(w => {
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

          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">User Accounts</h1><p className="text-slate-400 text-sm">{users.length.toLocaleString()} registered users</p></div>
                <div className="flex gap-2 w-full sm:auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-9 bg-slate-700 border-slate-600 text-white" />
                  </div>
                  <Button onClick={() => fetchData()} variant="outline" size="sm" className="h-9 border-slate-600 text-slate-300"><RefreshCw className="w-3.5 h-3.5" /></Button>
                  <Button onClick={() => setShowCreateUser(true)} size="sm" className="h-9 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold"><Plus className="w-3.5 h-3.5 mr-1.5" /> Create</Button>
                </div>
              </div>

              {showCreateUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-md shadow-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
                      <h2 className="text-white font-black text-lg">Create User Account</h2>
                      <button onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input value={createUserForm.full_name} onChange={e => setCreateUserForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Full Name" className="h-9 bg-slate-700 border-slate-600 text-white" />
                        <Input value={createUserForm.username} onChange={e => setCreateUserForm(f => ({ ...f, username: e.target.value }))} placeholder="Username" className="h-9 bg-slate-700 border-slate-600 text-white" />
                      </div>
                      <Input type="email" value={createUserForm.email} onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="h-9 bg-slate-700 border-slate-600 text-white" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input type={showCreateUserPassword ? "text" : "password"} value={createUserForm.password} onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" className="h-9 bg-slate-700 border-slate-600 text-white" />
                        <Input type="number" value={createUserForm.balance} onChange={e => setCreateUserForm(f => ({ ...f, balance: e.target.value }))} placeholder="Balance" className="h-9 bg-slate-700 border-slate-600 text-white" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button onClick={() => setShowCreateUser(false)} variant="outline" className="flex-1 border-slate-600 text-slate-300">Cancel</Button>
                        <Button onClick={handleCreateUser} className="flex-1 bg-amber-600 text-white font-bold">Create Account</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {usersLoading ? <p className="text-slate-400 text-sm">Loading...</p> : filteredUsers.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center text-slate-400">No users found.</div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map(u => {
                    const initials = (u.full_name || u.username || "??").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="w-10 h-10"><AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold">{initials}</AvatarFallback></Avatar>
                            <div className="min-w-0">
                               <div className="flex items-center gap-2">
                                  <p className="text-white font-bold text-sm truncate">{u.full_name || u.username}</p>
                                  {u.withdrawal_locked && <Badge className="text-xs bg-red-900/40 text-red-400 border-red-700 px-1.5 py-0">Locked</Badge>}
                                </div>
                                <p className="text-slate-400 text-xs truncate">{u.email}</p>
                            </div>
                          </div>
                          <p className="text-green-400 font-black text-base flex-shrink-0">${(u.balance || 0).toFixed(2)}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2"><p className="text-slate-400 text-[10px] uppercase">Phone</p><p className="text-slate-200 text-xs">{u.phone || '—'}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2"><p className="text-slate-400 text-[10px] uppercase">Country</p><p className="text-slate-200 text-xs">{u.country || '—'}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2"><p className="text-slate-400 text-[10px] uppercase">Referral Code</p><p className="text-amber-400 text-xs font-mono font-bold">{u.referral_code || '—'}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-3 py-2"><p className="text-slate-400 text-[10px] uppercase">PIN Set</p><p className={`text-xs font-bold ${u.has_withdrawal_pin ? "text-green-400" : "text-red-400"}`}>{u.has_withdrawal_pin ? "Yes" : "No"}</p></div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => { setEditingUser(u); setNewBalance(String(u.balance || 0)); }} className="px-3 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 text-xs font-semibold">Edit Balance</button>
                          <button onClick={() => handleToggleWithdrawalLock(u.id, !!u.withdrawal_locked)} className={`px-3 py-1.5 rounded-xl border text-xs font-semibold ${u.withdrawal_locked ? "bg-green-900/30 text-green-400 border-green-800" : "bg-orange-900/40 text-orange-400 border-orange-700"}`}>{u.withdrawal_locked ? 'Unlock' : 'Lock'} Withdrawals</button>
                          <button onClick={() => { setEditingPassword(u); setNewPassword(''); }} className="px-3 py-1.5 rounded-xl bg-slate-700 text-slate-300 border border-slate-600 text-xs font-semibold">Reset Password</button>
                          <button onClick={() => openConfirm("Delete User", `Permanently delete "${u.full_name || u.username}"?`, () => handleDeleteUser(u.id))} className="px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-800 text-xs font-semibold">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "generators" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div><h1 className="text-xl font-black text-white">Generators Factory</h1><p className="text-slate-400 text-sm">{generators.length} total generators</p></div>
                <div className="flex gap-2">
                  <Button onClick={() => openConfirm("Seed Defaults?", "Replace all generators with PG1-PG5 default limits?", handleSeedGenerators)} variant="outline" size="sm" className="h-9 border-orange-700/50 bg-orange-950 text-orange-300">Seed Defaults</Button>
                  <Button onClick={() => { setNewGen({ ...BLANK_GEN }); setShowCreateGen(true); }} className="h-9 bg-amber-600 text-white font-bold"><Plus className="w-4 h-4 mr-1.5" /> New Generator</Button>
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
                            <p className="font-black text-white text-sm">{g.name} {g.published ? <Badge className="bg-green-500 text-white ml-2">Live</Badge> : <Badge className="bg-black/30 text-white/70 ml-2">Draft</Badge>}</p>
                            <p className="text-white/70 text-xs">{g.subtitle}</p>
                          </div>
                        </div>
                        <p className="text-white text-xl font-black">{g.roi}</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                            <div className="bg-slate-700/50 rounded-xl px-2 py-2 text-center"><p className="text-slate-400 text-[9px]">Price</p><p className="text-white text-[11px] font-bold">${g.price}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-2 py-2 text-center"><p className="text-slate-400 text-[9px]">Daily</p><p className="text-white text-[11px] font-bold">${g.daily_income}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-2 py-2 text-center"><p className="text-slate-400 text-[9px]">Active</p><p className="text-white text-[11px] font-bold">{g.active_limit}</p></div>
                            <div className="bg-slate-700/50 rounded-xl px-2 py-2 text-center"><p className="text-slate-400 text-[9px]">Lifetime</p><p className="text-white text-[11px] font-bold">{g.lifetime_limit}</p></div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingGen({ ...g })} className="flex-1 py-1.5 rounded-xl bg-blue-900/30 text-blue-400 border border-blue-800 text-xs font-semibold">Edit</button>
                          <button onClick={() => handlePublishToggle(g)} className={`px-4 py-1.5 rounded-xl border text-xs font-bold ${g.published ? "bg-green-900/30 text-green-400 border-green-600" : "bg-slate-700 text-slate-400 border-slate-600"}`}>{g.published ? "ON" : "OFF"}</button>
                          <button onClick={() => openConfirm("Delete?", `Delete ${g.name}?`, () => handleDeleteGenerator(g.id))} className="px-3 py-1.5 rounded-xl bg-red-900/30 text-red-400 border border-red-800 text-xs font-semibold"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "deposits" && (
            <div className="space-y-4">
              <h1 className="text-xl font-black text-white">Deposit Requests</h1>
              {depositsLoading ? <p className="text-slate-400 text-sm">Loading...</p> : deposits.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center text-slate-400">No deposits.</div>
              ) : (
                <div className="space-y-3">
                  {deposits.map(d => (
                    <DepositRow key={d.id} d={d} user={users.find(u => u.id === d.user_id)} onApprove={() => handleApproveDeposit(d.id, d.user_id, d.amount)} onReject={() => handleRejectDeposit(d.id, d.user_id, d.amount)} onDelete={() => handleDeleteDeposit(d.id)} approvePending={false} rejectPending={false} copyText={copyText} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "withdrawals" && (
            <div className="space-y-4">
              <h1 className="text-xl font-black text-white">Withdrawal Requests</h1>
              {withdrawalsLoading ? <p className="text-slate-400 text-sm">Loading...</p> : withdrawals.length === 0 ? (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-10 text-center text-slate-400">No withdrawals.</div>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map(w => {
                    const user = users.find(u => u.id === w.user_id);
                    return (
                    <div key={w.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-white font-bold text-sm">{user?.full_name || 'User'}</p>
                                <p className="text-slate-400 text-xs">@{user?.username} · {w.method} · {w.country}</p>
                            </div>
                            <p className="text-amber-400 font-black text-lg">${w.amount.toFixed(2)}</p>
                        </div>
                        <AdminWithdrawalStepper status={w.status} />
                        <div className="flex gap-2 justify-end pt-2 border-t border-slate-700">
                            {w.status === 'pending' && <Button size="sm" onClick={() => handleProcessWithdrawal(w.id)} className="bg-blue-600">Process</Button>}
                            {w.status === 'processing' && <Button size="sm" onClick={() => handleCompleteWithdrawal(w.id)} className="bg-green-600">Complete</Button>}
                            {(w.status === 'pending' || w.status === 'processing') && <Button size="sm" variant="destructive" onClick={() => handleRejectWithdrawal(w.id, w.user_id, w.amount)}>Reject</Button>}
                            <Button size="sm" variant="ghost" onClick={() => openConfirm("Delete?", "Delete record?", () => handleDeleteWithdrawal(w.id))} className="text-red-400"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          )}

          {tab === "codes" && (
            <div className="space-y-4">
               <h1 className="text-xl font-black text-white">Gift Codes</h1>
               <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex gap-3">
                    <Input type="number" value={newCodeAmount} onChange={e => setNewCodeAmount(e.target.value)} placeholder="Amount ($)" className="bg-slate-700 border-slate-600" />
                    <Input value={newCodeNote} onChange={e => setNewCodeNote(e.target.value)} placeholder="Note" className="bg-slate-700 border-slate-600" />
                    <Button onClick={handleCreateGiftCode} className="bg-amber-600">Generate</Button>
                  </div>
               </div>
               {generatedCode && (
                  <div className="p-4 bg-green-900/30 rounded-xl border border-green-700 flex justify-between items-center">
                    <p className="text-amber-400 font-mono font-bold text-xl">{generatedCode.code}</p>
                    <Button size="sm" onClick={() => copyText(generatedCode.code, 'Code')} className="bg-slate-700">Copy</Button>
                  </div>
               )}
               <div className="space-y-2">
                    {bonusCodes.map(code => (
                      <div key={code.id} className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex justify-between items-center">
                        <div>
                            <p className={`font-mono font-bold ${code.is_redeemed ? 'text-slate-600 line-through' : 'text-amber-400'}`}>{code.code} (${code.amount})</p>
                            <p className="text-slate-500 text-[10px]">{code.note}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteGiftCode(code.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></Button>
                      </div>
                    ))}
               </div>
            </div>
          )}

        </div>
      </main>

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-bold mb-4">Edit Balance for {editingUser.username}</h3>
            <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="h-11 bg-slate-700 border-slate-600 text-white mb-4" />
            <div className="flex gap-2">
              <Button onClick={() => setEditingUser(null)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={() => handleUpdateBalance(editingUser.id, parseFloat(newBalance) || 0)} className="flex-1 bg-amber-600">Save</Button>
            </div>
          </div>
        </div>
      )}

      {editingGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-4">Edit Generator: {editingGen.name}</h3>
            <div className="space-y-3">
              <Input value={editingGen.name} onChange={e => setEditingGen({ ...editingGen, name: e.target.value })} placeholder="Name" className="bg-slate-700 border-slate-600 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={editingGen.price} onChange={e => setEditingGen({ ...editingGen, price: parseFloat(e.target.value) || 0 })} placeholder="Price" className="bg-slate-700 border-slate-600 text-white" />
                <Input type="number" value={editingGen.daily_income} onChange={e => setEditingGen({ ...editingGen, daily_income: parseFloat(e.target.value) || 0 })} placeholder="Daily Income" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={editingGen.active_limit} onChange={e => setEditingGen({ ...editingGen, active_limit: parseInt(e.target.value) || 1 })} placeholder="Active Limit" className="bg-slate-700 border-slate-600 text-white" />
                <Input type="number" value={editingGen.lifetime_limit} onChange={e => setEditingGen({ ...editingGen, lifetime_limit: parseInt(e.target.value) || 1 })} placeholder="Lifetime Limit" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <Input type="number" value={editingGen.expire_days} onChange={e => setEditingGen({ ...editingGen, expire_days: parseInt(e.target.value) || 30 })} placeholder="Expire Days" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={() => setEditingGen(null)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleUpdateGenerator} className="flex-1 bg-amber-600">Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {showCreateGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-bold mb-4">Create New Generator</h3>
            <div className="space-y-3">
              <Input value={newGen.name} onChange={e => setNewGen({ ...newGen, name: e.target.value })} placeholder="Name" className="bg-slate-700 border-slate-600 text-white" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={newGen.price} onChange={e => setNewGen({ ...newGen, price: parseFloat(e.target.value) || 0 })} placeholder="Price" className="bg-slate-700 border-slate-600 text-white" />
                <Input type="number" value={newGen.daily_income} onChange={e => setNewGen({ ...newGen, daily_income: parseFloat(e.target.value) || 0 })} placeholder="Daily Income" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" value={newGen.active_limit} onChange={e => setNewGen({ ...newGen, active_limit: parseInt(e.target.value) || 1 })} placeholder="Active Limit" className="bg-slate-700 border-slate-600 text-white" />
                <Input type="number" value={newGen.lifetime_limit} onChange={e => setNewGen({ ...newGen, lifetime_limit: parseInt(e.target.value) || 1 })} placeholder="Lifetime Limit" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <Input type="number" value={newGen.expire_days} onChange={e => setNewGen({ ...newGen, expire_days: parseInt(e.target.value) || 30 })} placeholder="Expire Days" className="bg-slate-700 border-slate-600 text-white" />
            </div>
            <div className="flex gap-2 mt-5">
              <Button onClick={() => setShowCreateGen(false)} variant="outline" className="flex-1">Cancel</Button>
              <Button onClick={handleCreateGenerator} className="flex-1 bg-amber-600">Create</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading...</p></div>}>
      <DashboardContent />
    </Suspense>
  )
}
