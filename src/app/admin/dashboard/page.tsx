import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { Suspense } from 'react';

export default function AdminDashboardPage() {
  const cookieStore = cookies();
  const isAdminLoggedIn = cookieStore.get('admin_logged_in')?.value === 'true';

  if (!isAdminLoggedIn) {
    redirect('/login');
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading Admin...</div>}>
        <DashboardClient />
    </Suspense>
  );
}