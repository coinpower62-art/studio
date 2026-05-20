import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react';
import { adminGetAllData } from './actions';
import { DashboardClient } from './DashboardClient';

function DashboardLoading() {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading Secure Admin Data...</p></div>;
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
              <div className="text-center bg-slate-800 border border-red-900/50 p-8 rounded-3xl max-w-sm">
                  <h1 className="text-xl font-black text-red-400">Fetch Failed</h1>
                  <p className="text-slate-400 mt-2 text-sm">{result.error}</p>
                  <button onClick={() => redirect('/admin/dashboard')} className="mt-6 text-xs text-amber-500 font-bold uppercase tracking-widest">Retry Connection</button>
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
