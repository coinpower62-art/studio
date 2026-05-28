'use client';

import { redirect } from 'next/navigation';

/**
 * Redirecting to the main admin page to ensure 
 * consistent data and limits (PG5 Lifetime Limit: 5).
 */
export default function DashboardRedirect() {
  redirect('/admin');
}