
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
