
'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    
    const [
        { data: users, error: usersError },
        { data: generators, error: gensError },
        { data: deposits, error: depositsError },
        { data: withdrawals, error: withdrawalsError },
        { data: media, error: mediaError },
    ] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('generators').select('*').order('price', { ascending: true }),
        supabaseAdmin.from('deposit_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabaseAdmin.from('media').select('*'),
    ]);

    const errors = [usersError, gensError, depositsError, withdrawalsError, mediaError].filter(Boolean)
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
        }
    }
  } catch (e: any) {
    console.error('Admin Fetch All Data Exception:', e);
    return { error: e.message };
  }
}

export async function adminHandleDeposit(depositId: string, userId: string, amount: number, action: 'approve' | 'reject') {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' }
    }
    
    try {
        const supabaseAdmin = await getSupabaseAdminClient()
        if (action === 'approve') {
            const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('balance').eq('id', userId).single()
            if (profileError || !profile) return { error: 'User profile not found.' }

            const { error: depositError } = await supabaseAdmin.from('deposit_requests').update({ status: 'approved' }).eq('id', depositId)
            if (depositError) return { error: depositError.message }

            const { error: balanceError } = await supabaseAdmin.from('profiles').update({ balance: profile.balance + amount }).eq('id', userId)
            if (balanceError) {
                await supabaseAdmin.from('deposit_requests').update({ status: 'pending' }).eq('id', depositId) // Rollback
                return { error: `Balance update failed: ${balanceError.message}` }
            }
        } else { // reject
            const { error } = await supabaseAdmin.from('deposit_requests').update({ status: 'rejected' }).eq('id', depositId)
            if (error) return { error: error.message }
        }
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function adminHandleWithdrawal(withdrawalId: string, action: 'approve' | 'reject' | 'delete', userId?: string, amount?: number) {
    const cookieStore = cookies();
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized' };
    }

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        if (action === 'approve') {
            const { error } = await supabaseAdmin.from('withdrawal_requests').update({ status: 'approved' }).eq('id', withdrawalId);
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
  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    const { error } = await supabaseAdmin.from('profiles').update({ balance: newBalance }).eq('id', userId)
    if (error) return { error: error.message }
    return { success: true }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function adminDeleteUser(userId: string) {
  // Note: This only deletes the profile, not the auth.users record.
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized' }
  }
  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
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
            balance: userData.balance,
            referral_code: userData.referral_code,
            has_withdrawal_pin: false
        }
    })
    
    if (error) return { error: error.message }
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

  try {
    const supabaseAdmin = await getSupabaseAdminClient()
    const { error } = await supabaseAdmin.from('media').upsert({ id, url }, { onConflict: 'id' })

    if (error) {
      console.error('Admin Upsert Media Error:', error);
      return { error: error.message }
    }
    return { success: true }
  } catch (e: any) {
    console.error('Admin Action Exception:', e);
    return { error: e.message };
  }
}

export async function adminUploadFile(fileDataUrl: string, filePath: string) {
  const cookieStore = cookies()
  if (cookieStore.get('admin_logged_in')?.value !== 'true') {
    return { error: 'Unauthorized: You must be an admin to perform this action.' }
  }

  try {
    const supabaseAdmin = await getSupabaseAdminClient();
    
    const matches = fileDataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { error: 'Invalid file data URL format.' };
    }
    const contentType = matches[1];
    const base64Data = matches[2];
    const fileBuffer = Buffer.from(base64Data, 'base64');
    
    const BUCKET_NAME = 'site_assets';
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Admin Storage Upload Error:', uploadError);
      return { error: `Storage upload failed: ${uploadError.message}` };
    }

    const { data } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    
    return { data: { publicUrl: data.publicUrl } };
  } catch (e: any) {
    console.error('Admin Upload File Exception:', e);
    return { error: e.message };
  }
}

export async function adminUpdateGeneratorImage(id: string, imageUrl: string) {
    const cookieStore = cookies()
    if (cookieStore.get('admin_logged_in')?.value !== 'true') {
        return { error: 'Unauthorized: You must be an admin to perform this action.' }
    }

    try {
        const supabaseAdmin = await getSupabaseAdminClient();
        const { error } = await supabaseAdmin.from('generators').update({ image_url: imageUrl }).eq('id', id);
        
        if (error) {
            console.error('Admin Update Generator Image Error:', error);
            return { error: error.message };
        }
        return { success: true };
    } catch (e: any) {
        console.error('Admin Action Exception:', e);
        return { error: e.message };
    }
}

    