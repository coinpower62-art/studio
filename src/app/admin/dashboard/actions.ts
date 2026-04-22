
'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const ADMIN_DISABLED_ERROR = { error: 'Admin actions are disabled in this hosting environment.' };
const isServiceRoleKeyAvailable = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

// This server action uses the service_role key to bypass RLS.
// It is secure because the key is never exposed to the client,
// and we check for the admin cookie before performing any action.
// NOTE: You must set the SUPABASE_SERVICE_ROLE_KEY in your .env.local file.
// You can find this key in your Supabase project settings under API.
async function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    // This will fail if the service key is not in the environment.
    throw new Error('Missing Supabase URL or Service Role Key in environment variables. Please add them to your .env.local file.')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function adminGetAllData() {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized: You must be an admin to perform this action.' }
  }

  if (!isServiceRoleKeyAvailable) {
      return { error: ADMIN_DISABLED_ERROR.error };
  }

  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    
    const [
        { data: users, error: usersError },
        { data: generators, error: gensError },
        { data: deposits, error: depositsError },
        { data: withdrawals, error: withdrawalsError },
        { data: media, error: mediaError },
        { data: codes, error: codesError },
        { data: rentedGenerators, error: rentedGensError },
        { data: visits, error: visitsError },
    ] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, created_at, username, full_name, email, country, phone, balance, referral_code, referred_by, has_withdrawal_pin, withdrawal_locked').order('created_at', { ascending: false }),
        supabaseAdmin.from('generators').select('*').order('price', { ascending: true }),
        supabaseAdmin.from('deposit_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('media').select('*'),
        supabaseAdmin.from('gift_codes').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('rented_generators').select('user_id, generator_id, expires_at, rented_at'),
        supabaseAdmin.from('daily_visits').select('*').order('date', { ascending: false }).limit(7),
    ]);

    const errors = [usersError, gensError, depositsError, withdrawalsError, mediaError, codesError, rentedGensError, visitsError].filter(Boolean)
    if (errors.length > 0) {
      // @ts-ignore
      return { error: errors.map(e => e.message).join(', ') }
    }

    return { 
        data: {
            users,
            generators,
            deposits,
            withdrawals,
            media,
            codes,
            rentedGenerators,
            visits,
        }
    }
  } catch (e: any) {
    console.error('Admin Fetch All Data Exception:', e);
    return { error: e.message };
  }
}

export async function adminHandleDeposit(depositId: string, action: 'approve' | 'reject' | 'delete', userId?: string, amount?: number) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' }
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
    
    try {
        const supabaseAdmin = await getSupabaseAdminClient()
        if (action === 'approve') {
            if (!userId || typeof amount !== 'number') return { error: 'User ID and amount required for approval.' };
            const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).single()
            if (profileError || !profile) return { error: 'User profile not found.' }

            const { error: depositError } = await supabaseAdmin.from('deposit_requests').update({ status: 'approved' }).eq('id', depositId)
            if (depositError) return { error: depositError.message }

            const { error: balanceError } = await supabaseAdmin.from('profiles').update({ balance: profile.balance + amount }).eq('id', userId)
            if (balanceError) {
                await supabaseAdmin.from('deposit_requests').update({ status: 'pending' }).eq('id', depositId) // Rollback
                return { error: `Balance update failed: ${balanceError.message}` }
            }
        } else if (action === 'reject') {
            const { error } = await supabaseAdmin.from('deposit_requests').update({ status: 'rejected' }).eq('id', depositId)
            if (error) return { error: error.message }
        } else if (action === 'delete') {
            const { error } = await supabaseAdmin.from('deposit_requests').delete().eq('id', depositId);
            if (error) return { error: error.message };
        }
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function adminHandleWithdrawal(withdrawalId: string, action: 'process' | 'complete' | 'reject' | 'delete', userId?: string, amount?: number) {
    const cookieStore = cookies();
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' };
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        if (action === 'process') {
            const { error } = await supabaseAdmin.from('withdrawal_requests').update({ status: 'processing' }).eq('id', withdrawalId);
            if (error) return { error: error.message };
        } else if (action === 'complete') {
            const { error } = await supabaseAdmin.from('withdrawal_requests').update({ status: 'complete' }).eq('id', withdrawalId);
            if (error) return { error: error.message };
        } else if (action === 'reject') {
            if (!userId || amount === undefined) return { error: 'User ID and amount required for rejection.' };
            
            const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).single();
            if (profileError || !profile) return { error: 'User profile not found.' };

            const { error: withdrawalError } = await supabaseAdmin.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', withdrawalId);
            if (withdrawalError) return { error: withdrawalError.message };
            
            const { error: balanceError } = await supabaseAdmin.from('profiles').update({ balance: profile.balance + amount }).eq('id', userId);
            if (balanceError) {
                await supabaseAdmin.from('withdrawal_requests').update({ status: 'pending' }).eq('id', withdrawalId); // Rollback
                return { error: `Balance refund failed: ${balanceError.message}` };
            }
        } else if (action === 'delete') {
            const { error } = await supabaseAdmin.from('withdrawal_requests').delete().eq('id', withdrawalId);
            if (error) return { error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function adminUpdateUserBalance(userId: string, newBalance: number) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized' }
  }
  if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    const { error } = await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', userId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function adminResetUserPassword(userId: string, newPassword: string) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' }
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
    if (!newPassword || newPassword.length < 6) {
        return { error: 'Password must be at least 6 characters.' }
    }
    try {
        const supabaseAdmin = await getSupabaseAdminClient()
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword
        })
        if (error) {
            if (error.message.includes("Password not long enough")) {
                return { error: "Password is too short. It must be at least 6 characters." }
            }
            return { error: error.message }
        }
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function adminDeleteUser(userId: string) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized' }
  }
  if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    // This deletes the auth.users record. The profile record is deleted automatically
    // via the 'ON DELETE CASCADE' constraint on the profiles.id foreign key.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function adminCreateUser(userData: any) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized' }
  }
  if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    // This action creates an auth.user record, which then triggers the profile creation.
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm user
        user_metadata: {
            full_name: userData.full_name,
            username: userData.username,
            country: userData.country,
            phone: userData.phone,
            referral_code: userData.referral_code,
        }
    })
    
    if (error) return { error: error.message }
    
    const startingBalance = parseFloat(userData.balance) || 1.00;
    if (startingBalance !== 1.00) {
        await supabaseAdmin.from('profiles').update({ balance: startingBalance }).eq('id', data.user.id);
    }

    // We need to fetch the profile that was created by the trigger
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select().eq('id', data.user.id).single();
    if(profileError) return { error: profileError.message }

    return { data: profile }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function adminMutateGenerator(action: 'create' | 'update' | 'delete' | 'seed', payload: any) {
    const cookieStore = cookies();
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' };
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        if (action === 'create') {
            const { data, error } = await supabaseAdmin.from('generators').insert([payload]).select().single();
            if (error) return { error: error.message };
            return { data };
        }
        if (action === 'update') {
            const { id, ...updateData } = payload;
            const { data, error } = await supabaseAdmin.from('generators').update(updateData).eq('id', id).select().single();
            if (error) return { error: error.message };
            return { data };
        }
        if (action === 'delete') {
            const { error } = await supabaseAdmin.from('generators').delete().eq('id', payload.id);
            if (error) return { error: error.message };
        }
        if (action === 'seed') {
             const { error: deleteError } = await supabaseAdmin.from('generators').delete().neq('id', 'this-will-delete-all'); // A bit of a hack to delete all
             if (deleteError) return { error: deleteError.message };
             const { data, error: insertError } = await supabaseAdmin.from('generators').insert(payload).select();
             if (insertError) return { error: insertError.message };
             return { data };
        }
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}


export async function adminUpsertMedia(id: string, url: string) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized: You must be an admin to perform this action.' }
  }
  if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;

  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    const { error } = await supabaseAdmin.from('media').upsert({ id, url }, { onConflict: 'id' })

    if (error) {
      console.error('Admin Upsert Media Error:', error);
      return { error: error.message }
    }
    revalidatePath('/', 'layout');
    return { success: true }
  } catch (e: any) {
    console.error('Admin Action Exception:', e);
    return { error: e.message };
  }
}

export async function adminUpdateGeneratorImage(id: string, imageUrl: string) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized: You must be an admin to perform this action.' }
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        const { error } = await supabaseAdmin.from('generators').update({ image_url: imageUrl }).eq('id', id);
        
        if (error) {
            console.error('Admin Update Generator Image Error:', error);
            return { error: error.message };
        }
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (e: any) {
        console.error('Admin Action Exception:', e);
        return { error: e.message };
    }
}

export async function adminCreateGiftCode(amount: number, note: string) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' }
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
    
    if (amount <= 0) {
        return { error: 'Amount must be positive.' };
    }

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        
        // Generate a unique code
        let code, existingCode;
        do {
            code = `CPG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            ({ data: existingCode } = await supabaseAdmin.from('gift_codes').select('code').eq('code', code).single());
        } while (existingCode);

        const { data, error } = await supabaseAdmin.from('gift_codes').insert({
            code,
            amount,
            note
        }).select().single();

        if (error) {
            return { error: error.message };
        }

        return { data };

    } catch (e: any) {
        return { error: e.message };
    }
}

export async function adminDeleteGiftCode(codeId: string) {
    const cookieStore = cookies();
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' };
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        const { error } = await supabaseAdmin.from('gift_codes').delete().eq('id', codeId);

        if (error) {
            return { error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        return { error: e.message };
    }
}

export async function adminToggleWithdrawalLock(userId: string, lock: boolean) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
      return { error: 'Unauthorized' }
    }
    if (!isServiceRoleKeyAvailable) return ADMIN_DISABLED_ERROR;
    try {
      const supabaseAdmin = await getSupabaseAdminClient()
      const { error } = await supabaseAdmin.from('profiles').update({ withdrawal_locked: lock }).eq('id', userId)
      if (error) return { error: error.message }
      revalidatePath('/admin/dashboard')
      return { success: true }
    } catch (e: any) {
      return { error: e.message }
    }
  }
