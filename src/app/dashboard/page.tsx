
export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Users,
  DollarSign,
  ArrowUpFromLine,
  ChevronRight,
  Zap,
  Play,
  Globe,
  LogOut,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { ReferralLink } from '@/components/ReferralLink';
import InstallButton from '@/components/InstallButton';
import { logout } from '@/app/login/actions';
import { Badge } from '@/components/ui/badge';

// The main page component
export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch all data concurrently for better performance
  const [
    profileResult,
    userCountResult,
    withdrawalsResult,
    rentedGeneratorsResult,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('withdrawal_requests').select('status'),
    supabase.from('rented_generators').select('id, expires_at').eq('user_id', user.id),
  ]);

  const { data: profile } = profileResult;
  
  // The layout will now handle the case where the profile is missing.
  // We can assume the profile exists here. If not, the layout would have shown an error.
  if (!profile) {
    // This should theoretically not be reached if the layout's self-healing works.
    // But as a fallback, we can redirect or show a minimal error.
    return redirect('/login?message=Could not load user profile.');
  }

  const userCount = userCountResult.count ?? 0;
  const FAKE_USER_BASE = 12040;
  const displayedUserCount = FAKE_USER_BASE + userCount;
  const pendingWithdrawalsCount = withdrawalsResult.data?.filter(w => w.status === 'pending').length ?? 0;
  
  const now = new Date().getTime();
  const activeGeneratorCount = rentedGeneratorsResult.data?.filter(g => g.expires_at && new Date(g.expires_at).getTime() > now).length ?? 0;

  const nameForInitials = profile?.full_name || user.email || "";
  const initials =
    nameForInitials
      .split(' ')
      .map(function(n) { return n[0] || ''; })
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??';

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 to-amber-700 p-4">
            <h3 className="font-bold text-white text-sm sm:text-base">Your Profile</h3>
            <p className="text-amber-100 text-xs">Personal investment overview</p>
        </div>
        <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4">
                <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-amber-300 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-green-400 to-amber-600 text-white font-bold text-lg sm:text-xl">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-base sm:text-lg truncate">{profile.full_name || profile.username}</p>
                        <p className="text-gray-500 text-xs sm:text-sm truncate">{user.email}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500">{profile.country}</span>
                            <Badge className="text-xs px-1.5 py-0 bg-green-100 text-green-700 border-0">Active</Badge>
                        </div>
                    </div>
                </div>
                 <form action={logout}>
                    <button type="submit" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors bg-gray-100 hover:bg-red-50 rounded-full p-2">
                        <LogOut className="w-4 h-4" />
                    </button>
                </form>
            </div>
            <div className="grid grid-cols-2 gap-2">
                {[
                    { label: "Balance", value: `$${profile.balance.toFixed(2)}`, color: "text-amber-600" },
                    { label: "Total Earned", value: "$0.00", color: "text-green-600" },
                    { label: "Active Plans", value: activeGeneratorCount.toString(), color: "text-blue-600" },
                    { label: "Member Since", value: new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), color: "text-purple-600" },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5 sm:p-3">
                        <p className="text-xs text-gray-500">{label}</p>
                        <p className={`font-bold ${color} text-lg mt-0.5`}>{value}</p>
                    </div>
                ))}
            </div>
        </div>
      </div>
      
      <ReferralLink referralCode={profile?.referral_code ?? null} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link href="/dashboard/video-tutorial" className="block group">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg group-hover:shadow-xl transition-all h-full flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                  </div>
                  Watch Tutorial
                </h3>
                <p className="text-xs text-blue-100 mt-2">Learn how to operate the app and start earning.</p>
              </div>
              <ChevronRight className="w-6 h-6 text-blue-200 transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </Link>
        <InstallButton />
      </div>
    </div>
  );
}
