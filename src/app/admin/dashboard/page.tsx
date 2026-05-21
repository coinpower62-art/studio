
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react';
import { adminGetAllData } from './actions';
import { DashboardClient } from './DashboardClient';
import { Shield } from 'lucide-react';

function DashboardLoading() {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm font-medium">Verifying Admin Credentials...</p></div>;
}

export default async function AdminDashboardPage() {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        redirect('/login');
    }

    const result = await adminGetAllData();
  
    if (result.error || !result.data) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
              <div className="text-center bg-slate-800 border border-red-900/50 p-8 rounded-3xl max-w-sm shadow-2xl">
                  <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-red-500" />
                  </div>
                  <h1 className="text-xl font-black text-white">Database Error</h1>
                  <p className="text-slate-400 mt-2 text-sm leading-relaxed">{result.error || "Could not connect to Supabase. Check your service role keys."}</p>
                  <button onClick={() => redirect('/admin/dashboard')} className="mt-6 w-full py-3 rounded-xl bg-slate-700 text-xs text-white font-bold uppercase tracking-widest hover:bg-slate-600 transition-colors">Retry Connection</button>
              </div>
          </div>
      );
    }
  
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardClient initialData={result.data} />
        </Suspense>
    )
}
