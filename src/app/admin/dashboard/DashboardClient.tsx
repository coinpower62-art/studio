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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Users,
  DollarSign,
  LogOut,
  Search,
  Edit3,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  BarChart3,
  Globe,
  Zap,
  ArrowUpFromLine,
  Settings,
  ChevronRight,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  RotateCcw,
  Upload,
  Save,
  Plus,
  Pencil,
  ImagePlus,
  Activity,
  Mail,
  Phone,
  Building2,
  Percent,
  Clock3,
  ExternalLink,
  CreditCard,
  Menu,
  Gift,
} from "lucide-react";
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
} from "./actions";

type Tab =
  | "overview"
  | "users"
  | "deposits"
  | "withdrawals"
  | "referrals"
  | "generators"
  | "activity"
  | "media"
  | "codes"
  | "settings"
  | "about";

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
  const [createUserForm, setCreateUserForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    country: "Ghana",
    phone: "",
    balance: "1.00",
  });

  const [showCreateGen, setShowCreateGen] = useState(false);
  const [editingGen, setEditingGen] = useState<Generator | null>(null);
  const [newGen, setNewGen] = useState<Omit<Generator, "id">>({ ...BLANK_GEN });

  const [generatedCode, setGeneratedCode] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [newCodeAmount, setNewCodeAmount] = useState("");
  const [newCodeNote, setNewCodeNote] = useState("");

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const openConfirm = (title: string, description: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, description, onConfirm });

  const { data: admin, isLoading: adminLoading } = useQuery({
    queryKey: ["/api/admin/me"],
    queryFn: async () => ({ name: "Admin" }), // Replace with actual fetch
  });

  const { data: dashboardData, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ["adminData"],
    queryFn: async () => {
      const res = await adminGetAllData();
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: !!admin,
  });

  const users = useMemo(() => dashboardData?.users || [], [dashboardData]);
  const generators = useMemo(() => dashboardData?.generators || [], [dashboardData]);
  const deposits = useMemo(() => dashboardData?.deposits || [], [dashboardData]);
  const withdrawals = useMemo(() => dashboardData?.withdrawals || [], [dashboardData]);
  const bonusCodes = useMemo(() => dashboardData?.codes || [], [dashboardData]);

  const updateBalanceMutation = useMutation({
    mutationFn: ({ id, balance }: { id: string; balance: number }) =>
      adminUpdateUserBalance(id, balance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
      toast({ title: "Balance updated" });
      setEditingUser(null);
      setNewBalance("");
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => adminDeleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
      toast({ title: "User deleted" });
    },
  });

  const approveDepositMutation = useMutation({
    mutationFn: (id: string) => adminHandleDeposit(id, "approve"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
      toast({ title: "Deposit approved!" });
    },
  });

  const rejectDepositMutation = useMutation({
    mutationFn: (id: string) => adminHandleDeposit(id, "reject"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
      toast({ title: "Deposit rejected." });
    },
  });

  const createGenMutation = useMutation({
    mutationFn: (data: Omit<Generator, "id">) => adminMutateGenerator("create", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
      toast({ title: "Generator created!" });
      setShowCreateGen(false);
      setNewGen({ ...BLANK_GEN });
    },
  });

  const createCodeMutation = useMutation({
    mutationFn: (data: { amount: number; note: string }) =>
      adminCreateGiftCode(data.amount, data.note),
    onSuccess: (res: any) => {
      setGeneratedCode(res.data);
      setNewCodeAmount("");
      setNewCodeNote("");
      queryClient.invalidateQueries({ queryKey: ["adminData"] });
    },
  });

  if (adminLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  const filteredUsersList = users.filter((u: any) =>
    [u.full_name, u.username, u.email, u.country].some((f) =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-900 text-white">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900 sticky top-0 z-20">
        <h2 className="text-xl font-bold text-white capitalize">{tab}</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-slate-300 border-slate-700"
          >
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
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
              </div>
            </div>
            {/* Additional Stats can be added here */}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="bg-transparent border-none outline-none text-white w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4">
              {filteredUsersList.map((u: any) => (
                <div key={u.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-bold">{u.full_name}</p>
                      <p className="text-slate-400 text-xs">@{u.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">${u.balance?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "deposits" && (
          <div className="space-y-4">
            <h1 className="text-xl font-black text-white">Deposit Requests</h1>
            {deposits.length === 0 ? (
              <p className="text-slate-400 text-center py-10">No deposit requests.</p>
            ) : (
              <div className="space-y-3">
                {deposits.map((d: any) => (
                  <DepositRow
                    key={d.id}
                    d={d}
                    user={users.find((u: any) => u.id === d.user_id)}
                    onApprove={() => handleApproveDeposit(d.id, d.user_id, d.amount)}
                    onReject={() => handleRejectDeposit(d.id, d.user_id, d.amount)}
                    onDelete={() => handleDeleteDeposit(d.id)}
                    approvePending={false}
                    rejectPending={false}
                    copyText={copyText}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Other Tabs like withdrawals, referrals, generators, etc. would follow a similar pattern */}
      </div>
    </div>
  );
}
