
'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getClientAdminData() {
  const supabase = createAdminClient();
  
  const [
    { data: deposits },
    { data: withdrawals }
  ] = await Promise.all([
    supabase.from('deposit_requests').select('*, profiles(username, full_name)').order('created_at', { ascending: false }),
    supabase.from('withdrawal_requests').select('*, profiles(username, full_name)').order('created_at', { ascending: false })
  ]);

  return {
    deposits: deposits || [],
    withdrawals: withdrawals || [],
  };
}

export async function forwardToMain(requestId: string, type: 'deposit' | 'withdrawal', amount: number, userId: string) {
  const supabase = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  // 1. Insert into pending_main_admin
  const { error: forwardError } = await supabase.from('pending_main_admin').insert({
    request_id: requestId,
    request_type: type,
    user_id: userId,
    amount: amount,
    forwarded_by: user.id,
    status: 'pending'
  });

  if (forwardError) return { error: forwardError.message };

  // 2. Update status in original table
  const table = type === 'deposit' ? 'deposit_requests' : 'withdrawal_requests';
  const { error: updateError } = await supabase
    .from(table)
    .update({ status: 'under_review' })
    .eq('id', requestId);

  if (updateError) return { error: updateError.message };

  revalidatePath('/admin-client/dashboard');
  return { success: true };
}
