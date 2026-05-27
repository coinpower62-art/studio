'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function adminGetAllData() {
    const supabase = createClient();
    try {
        const [
            { data: users },
            { data: generators },
            { data: rentedGenerators },
            { data: deposits },
            { data: withdrawals },
            { data: media },
            { data: codes },
            { data: visits }
        ] = await Promise.all([
            supabase.from('profiles').select('*').order('created_at', { ascending: false }),
            supabase.from('generators').select('*').order('price', { ascending: true }),
            supabase.from('rented_generators').select('*'),
            supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }),
            supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
            supabase.from('media').select('*'),
            supabase.from('gift_codes').select('*').order('created_at', { ascending: false }),
            supabase.from('site_visits').select('*').order('date', { ascending: false })
        ]);

        return {
            data: {
                users: users || [],
                generators: generators || [],
                rentedGenerators: rentedGenerators || [],
                deposits: deposits || [],
                withdrawals: withdrawals || [],
                media: media || [],
                codes: codes || [],
                visits: visits || []
            }
        };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function adminUpdateUserBalance(userId: string, newBalance: number) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').update({ balance: newBalance }).eq('id', userId);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminDeleteUser(userId: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminCreateUser(profile: any) {
    const supabase = createAdminClient();
    // Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: profile.email,
        password: profile.password,
        email_confirm: true,
        user_metadata: {
            full_name: profile.full_name,
            username: profile.username,
            country: profile.country,
            phone: profile.phone,
        }
    });

    if (authError) return { error: authError.message };

    // Update Profile with additional fields
    if (authData.user) {
        const { error: pError } = await supabase.from('profiles').update({
            balance: profile.balance,
            referral_code: profile.referral_code,
            country: profile.country,
            phone: profile.phone,
            full_name: profile.full_name,
            username: profile.username
        }).eq('id', authData.user.id);
        
        if (pError) return { error: "Auth user created but profile update failed: " + pError.message };
    }

    revalidatePath('/admin/dashboard');
    return { data: authData.user, success: true };
}

export async function adminHandleDeposit(id: string, action: 'approve' | 'reject' | 'delete', userId?: string, amount?: number) {
  const supabase = createAdminClient();
  
  if (action === 'delete') {
      const { error } = await supabase.from('deposit_requests').delete().eq('id', id);
      if (error) return { error: error.message };
  } else {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const { error } = await supabase.from('deposit_requests').update({ status }).eq('id', id);
      if (error) return { error: error.message };

      if (action === 'approve' && userId && amount) {
          const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
          if (profile) {
              await supabase.from('profiles').update({ balance: (profile.balance || 0) + amount }).eq('id', userId);
          }
      }
  }
  
  revalidatePath('/admin/dashboard');
  return { success: true };
}

export async function adminHandleWithdrawal(id: string, action: 'process' | 'complete' | 'reject' | 'delete', userId?: string, amount?: number) {
    const supabase = createAdminClient();

    if (action === 'delete') {
        const { error } = await supabase.from('withdrawal_requests').delete().eq('id', id);
        if (error) return { error: error.message };
    } else if (action === 'reject') {
        const { error } = await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', id);
        if (error) return { error: error.message };
        
        if (userId && amount) {
            const { data: profile } = await supabase.from('profiles').select('balance').eq('id', userId).single();
            if (profile) {
                await supabase.from('profiles').update({ balance: (profile.balance || 0) + amount }).eq('id', userId);
            }
        }
    } else {
        const status = action === 'process' ? 'processing' : 'complete';
        const { error } = await supabase.from('withdrawal_requests').update({ status }).eq('id', id);
        if (error) return { error: error.message };
    }

    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminMutateGenerator(action: 'create' | 'update' | 'delete' | 'seed', data: any) {
    const supabase = createAdminClient();

    if (action === 'seed') {
        await supabase.from('generators').delete().neq('id', 'null');
        const { error } = await supabase.from('generators').insert(data);
        if (error) return { error: error.message };
    } else if (action === 'create') {
        const { error } = await supabase.from('generators').insert(data);
        if (error) return { error: error.message };
    } else if (action === 'update') {
        const { error } = await supabase.from('generators').update(data).eq('id', data.id);
        if (error) return { error: error.message };
    } else if (action === 'delete') {
        const { error } = await supabase.from('generators').delete().eq('id', data.id);
        if (error) return { error: error.message };
    }

    revalidatePath('/admin/dashboard');
    return { success: true, data: {} };
}

export async function adminUpdateGeneratorImage(id: string, url: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('generators').update({ image_url: url }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminDeleteGeneratorImage(id: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('generators').update({ image_url: null }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminUpsertMedia(id: string, url: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('media').upsert({ id, url });
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    revalidatePath('/dashboard/activity');
    return { success: true };
}

export async function adminDeleteMedia(id: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminCreateGiftCode(amount: number, note: string) {
    const supabase = createAdminClient();
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data, error } = await supabase.from('gift_codes').insert({
        code,
        amount,
        note,
        is_redeemed: false
    }).select().single();

    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { data };
}

export async function adminDeleteGiftCode(id: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('gift_codes').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}

export async function adminResetUserPassword(userId: string, newPass: string) {
    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPass });
    if (error) return { error: error.message };
    return { success: true };
}

export async function adminToggleWithdrawalLock(userId: string, isLocked: boolean) {
    const supabase = createAdminClient();
    const { error } = await supabase.from('profiles').update({ withdrawal_locked: isLocked }).eq('id', userId);
    if (error) return { error: error.message };
    revalidatePath('/admin/dashboard');
    return { success: true };
}