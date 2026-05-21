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
  ExternalLink, Clock, AlertTriangle, CreditCard, Menu, Gift, DatabaseZap, KeyRound, User as UserIcon, Lock, Unlock, Video, Landmark, Network, Hash
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
          if (user.parent_id) {
            acc[user.parent_id] = (acc[user.parent_id] || 0) + 1;
          }
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

  const handleCreateGiftCode = async () => {
    const amount = parseFloat(newCodeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', variant: 'destructive' });
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
      await fetchData();
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
        const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, { upsert: true });
        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
        const publicUrl = urlData.publicUrl;
        if (!publicUrl) throw new Error('Could not get public URL.');

        let dbUpdateResult;
        if (type === 'generator') dbUpdateResult = await adminUpdateGeneratorImage(id, publicUrl);
        else dbUpdateResult = await adminUpsertMedia(id, publicUrl);
        if (dbUpdateResult.error) throw new Error(dbUpdateResult.error);
        toast({ title: `${type} updated!` });
        await fetchData();
      } catch (e: any) {
        toast({ title: 'Upload Failed', description: e.message, variant: 'destructive' });
      } finally {
        setUploading(null);
      }
  };

  const copyText = (text: string, label: string) => {
      navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied!` }));
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

  const filteredUsers = users.filter(u => [u.full_name, u.username, u.email, u.country].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const totalBalance = users.reduce((s, u) => s + (u.balance || 0), 0);
  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === "pending" || w.status === "processing").length;
  const pendingDepositsCount = deposits.filter(d => d.status === "pending").length;
  const totalReferrals = users.reduce((s, u) => s + (u.referral_count || 0), s);
  const idToUserMap = new Map(users.map(u => [u.id, u]));

  const heroImg = media.find(m => m.id === 'hero')?.url || PlaceHolderImages.find(i => i.id === 'activity-hero')?.imageUrl;
  const teamworkImg = media.find(m => m.id === 'teamwork')?.url || PlaceHolderImages.find(i => i.id === 'activity-teamwork')?.imageUrl;
  const logoImg = media.find(m => m.id === 'app-logo')?.url || PlaceHolderImages.find(i => i.id === 'signup-logo')?.imageUrl;
  const activeRentals = allRentedGenerators.filter(g => g && g.expires_at && new Date(g.expires_at).getTime() > Date.now()).length;

  const coreGeneratorIds = ['pg1', 'pg2', 'pg3', 'pg4'];
  const otherGenerators = generators.filter(g => !coreGeneratorIds.includes(g.id));

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <AlertDialog open={confirmDialog.open} onOpenChange={o => setConfirmDialog(s => ({ ...s, open: o }))}>
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
            <AlertDialogAction onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(s => ({ ...s, open: false })); }} className="flex-1 bg-red-700 hover:bg-red-600 text-white border-0">
              Yes, Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />}

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
          {tabs.map(({ id, label, icon: Icon, badge, color }) => (
            <button key={id} onClick={() => switchTab(id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
              <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}><Icon className="w-3.5 h-3.5 text-white" /></div>
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && badge > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${tab === id ? "bg-amber-500 text-white" : "bg-slate-600 text-slate-300"}`}>{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 pt-2 border-t border-slate-700 flex-shrink-0">
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-400 hover:bg-red-900/50 text-sm font-semibold transition-colors">
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="fixed top-0 left-0 right-0 z-30 bg-slate-800 border-b border-slate-700 px-4 h-12 flex items-center justify-between md:hidden">
        <button onClick={() => setSidebarOpen(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"><Menu className="w-5 h-5" /></button>
        <p className="text-slate-300 text-xs font-semibold capitalize">{tab}</p>
        <div />
      </div>

      <main className="flex flex-col md:ml-72 pt-12 md:pt-0">
        <div className="flex-1 p-4 sm:p-6">
          {tab === "overview" && (
            <div className="space-y-5">
              <h1 className="text-xl sm:text-2xl font-black text-white">Dashboard Overview</h1>
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
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h1 className="text-xl font-black text-white">User Accounts</h1>
                <Button onClick={() => setShowCreateUser(true)} size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold"><Plus className="w-4 h-4 mr-2" /> Create User</Button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 bg-slate-800 border-slate-700 text-white" />
              </div>
              <div className="space-y-3">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <Avatar><AvatarFallback className="bg-amber-500">{u.username?.[0].toUpperCase()}</AvatarFallback></Avatar>
                            <div>
                                <p className="font-bold">{u.full_name || u.username}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                            </div>
                        </div>
                        <p className="text-green-400 font-bold">${u.balance.toFixed(2)}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button onClick={() => { setEditingUser(u); setNewBalance(String(u.balance)); }} className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400 border border-blue-800">Edit Balance</button>
                        <button onClick={() => { setEditingPassword(u); setNewPassword(''); }} className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-white border border-slate-600">Reset Password</button>
                        <button onClick={() => openConfirm("Delete User", "Delete this user forever?", () => handleDeleteUser(u.id))} className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400 border border-red-800">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "deposits" && (
            <div className="space-y-4">
              <h1 className="text-xl font-black text-white">Deposit Requests</h1>
              {deposits.map(d => (
                <DepositRow key={d.id} d={d} user={users.find(u => u.id === d.user_id)} onApprove={() => handleApproveDeposit(d.id, d.user_id, d.amount)} onReject={() => handleRejectDeposit(d.id, d.user_id, d.amount)} onDelete={() => handleDeleteDeposit(d.id)} approvePending={false} rejectPending={false} copyText={copyText} />
              ))}
            </div>
          )}

          {tab === "withdrawals" && (
            <div className="space-y-4">
              <h1 className="text-xl font-black text-white">Withdrawal Requests</h1>
              {withdrawals.map(w => (
                 <div key={w.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4 space-y-3">
                    <div className="flex justify-between">
                        <div>
                            <p className="font-bold">{users.find(u => u.id === w.user_id)?.full_name}</p>
                            <p className="text-xs text-slate-400">{w.method} · {w.country}</p>
                        </div>
                        <p className="text-amber-400 font-bold">${w.amount.toFixed(2)}</p>
                    </div>
                    <AdminWithdrawalStepper status={w.status} />
                    <div className="mt-4 flex gap-2">
                        {w.status === 'pending' && <button onClick={() => handleProcessWithdrawal(w.id)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 text-blue-400">Process</button>}
                        {(w.status === 'pending' || w.status === 'processing') && <button onClick={() => handleCompleteWithdrawal(w.id)} className="text-xs px-3 py-1.5 rounded-lg bg-green-900/30 text-green-400">Complete</button>}
                        {(w.status === 'pending' || w.status === 'processing') && <button onClick={() => handleRejectWithdrawal(w.id, w.user_id, w.amount)} className="text-xs px-3 py-1.5 rounded-lg bg-red-900/30 text-red-400">Reject</button>}
                    </div>
                 </div>
              ))}
            </div>
          )}

          {/* ... Add other tabs (referrals, generators, media, codes, settings) ... */}
        </div>
      </main>

      {/* ── MODALS ── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-4">Edit Balance</h3>
            <Input type="number" value={newBalance} onChange={e => setNewBalance(e.target.value)} className="bg-slate-700 border-slate-600 mb-4" />
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">Cancel</Button>
                <Button onClick={() => handleUpdateBalance(editingUser.id, parseFloat(newBalance))} className="flex-1 bg-amber-500">Save</Button>
            </div>
          </div>
        </div>
      )}

      {editingPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-bold mb-4">Reset Password</h3>
            <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="bg-slate-700 border-slate-600 mb-4" />
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingPassword(null)} className="flex-1">Cancel</Button>
                <Button onClick={() => handleResetPassword(editingPassword.id, newPassword)} className="flex-1 bg-amber-500">Reset</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading...</p></div>}>
      <DashboardContent />
    </Suspense>
  )
}
