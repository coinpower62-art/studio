import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
  DollarSign,
  ArrowUpFromLine,
  Globe,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // For the dashboard widgets, we'll fetch some aggregate data.
  // In a real app, you might use RPC functions for performance.
  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select('status');

  const pendingWithdrawalsCount =
    withdrawals?.filter((w) => w.status === 'pending').length ?? 0;

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-gray-900">
          Welcome, {profile?.full_name || 'User'}
        </h1>
        <p className="text-slate-500 text-sm">Here is your investment overview.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Your Balance',
            value: `$${(profile?.balance ?? 0).toFixed(2)}`,
            icon: DollarSign,
            color: 'from-green-500 to-green-600',
          },
          {
            label: 'Total Users',
            value: String(userCount ?? 0),
            icon: Users,
            color: 'from-blue-500 to-blue-600',
          },
          {
            label: 'Pending Withdrawals',
            value: String(pendingWithdrawalsCount),
            icon: ArrowUpFromLine,
            color: 'from-amber-500 to-amber-600',
          },
          {
            label: 'Active Generators',
            value: '0',
            icon: Zap,
            color: 'from-purple-500 to-purple-600',
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm"
          >
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-gray-900">{value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">Your Profile</h3>
            <Link
              href="/dashboard/support"
              className="text-amber-600 text-xs flex items-center gap-1"
            >
              View Profile <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-amber-600 text-white text-base font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 text-sm font-medium truncate">
                {profile?.full_name}
              </p>
              <p className="text-slate-500 text-xs">@{profile?.username}</p>
            </div>
            <p className="text-green-500 text-lg font-bold">
              ${(profile?.balance ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">
              Recent Activity
            </h3>
            <Link
              href="/dashboard/activity"
              className="text-amber-600 text-xs flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">No recent activity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
