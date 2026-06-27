
'use client';

import { useState } from 'react';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Send, 
  CheckCircle, 
  Clock, 
  User as UserIcon,
  Search,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { forwardToMain } from '../actions';
import { logout } from '@/app/login/actions';

interface Request {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
  };
}

interface ClientAdminDashboardProps {
  initialDeposits: Request[];
  initialWithdrawals: Request[];
}

export default function ClientAdminDashboard({ initialDeposits, initialWithdrawals }: ClientAdminDashboardProps) {
  const [deposits, setDeposits] = useState(initialDeposits);
  const [withdrawals, setWithdrawals] = useState(initialWithdrawals);
  const [search, setSearch] = useState('');
  const [forwardingId, setForwardingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleForward = async (req: Request, type: 'deposit' | 'withdrawal') => {
    setForwardingId(req.id);
    const result = await forwardToMain(req.id, type, req.amount, req.user_id);
    
    if (result.success) {
      toast({ title: 'Request Forwarded', description: 'The request has been sent to Main Admin for review.' });
      // Optimistic update
      const updateFn = (list: Request[]) => list.map(r => r.id === req.id ? { ...r, status: 'under_review' } : r);
      if (type === 'deposit') setDeposits(updateFn);
      else setWithdrawals(updateFn);
    } else {
      toast({ title: 'Forwarding Failed', description: result.error, variant: 'destructive' });
    }
    setForwardingId(null);
  };

  const filter = (list: Request[]) => list.filter(r => 
    r.user_id.toLowerCase().includes(search.toLowerCase()) || 
    r.profiles?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'under_review': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">For Review</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Approved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="text-white w-5 h-5" />
          </div>
          <h1 className="font-black text-slate-900 tracking-tight">ADMIN CLIENT PORTAL</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search user ID or username..." 
              className="pl-9 w-64 h-9 bg-slate-50 border-slate-200 text-xs"
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Pending</p>
            <p className="text-3xl font-black text-slate-900">
              {deposits.filter(d => d.status === 'pending').length + withdrawals.filter(w => w.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Under Review</p>
            <p className="text-3xl font-black text-blue-600">
              {deposits.filter(d => d.status === 'under_review').length + withdrawals.filter(w => w.status === 'under_review').length}
            </p>
          </div>
        </div>

        {/* Deposit Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Deposit Requests</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-black uppercase text-slate-500">
                  <th className="px-6 py-3">User Details</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filter(deposits).map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserIcon className="w-4 h-4" /></div>
                        <div>
                          <p className="font-bold text-slate-900">{d.profiles?.username || 'Unknown'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{d.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-green-600">${d.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(d.status)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {d.status === 'pending' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleForward(d, 'deposit')} 
                          disabled={forwardingId === d.id}
                          className="bg-blue-600 hover:bg-blue-700 h-8 rounded-lg text-xs"
                        >
                          <Send className="w-3 h-3 mr-1.5" />
                          Forward to Main
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">Action Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Withdrawal Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-slate-900">Withdrawal Requests</h2>
          </div>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-black uppercase text-slate-500">
                  <th className="px-6 py-3">User Details</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filter(withdrawals).map(w => (
                  <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><UserIcon className="w-4 h-4" /></div>
                        <div>
                          <p className="font-bold text-slate-900">{w.profiles?.username || 'Unknown'}</p>
                          <p className="text-[10px] font-mono text-slate-400">{w.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black text-amber-600">${w.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">{getStatusBadge(w.status)}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(w.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      {w.status === 'pending' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleForward(w, 'withdrawal')} 
                          disabled={forwardingId === w.id}
                          className="bg-blue-600 hover:bg-blue-700 h-8 rounded-lg text-xs"
                        >
                          <Send className="w-3 h-3 mr-1.5" />
                          Forward to Main
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic">Action Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
