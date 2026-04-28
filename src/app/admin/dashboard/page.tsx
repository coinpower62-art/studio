import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Suspense } from 'react';
import { adminGetAllData } from './actions';
import { DashboardClient } from './client';

function DashboardLoading() {
    return <div className="min-h-screen flex items-center justify-center bg-slate-900"><p className="text-slate-400 text-sm">Loading Dashboard...</p></div>;
}

export default async function AdminDashboardPage() {
    const cookieStore = cookies()
    // Server-side auth check
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        redirect('/login');
    }

    // Server-side data fetch
    const result = await adminGetAllData();
  
    // Handle error during fetch
    if (result.error || !result.data) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-900">
              <div className="text-center p-4">
                  <h1 className="text-xl font-bold text-red-400">Failed to load Admin Data</h1>
                  <p className="text-slate-400 mt-2">{result.error}</p>
              </div>
          </div>
      );
    }
  
    // Render the client component with the data
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardClient initialData={result.data} />
        </Suspense>
    )
}
