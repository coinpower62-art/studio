'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: "Server configuration error: Supabase URL or Anon Key is missing. Please check your environment variables." };
  }

  let supabase;
  try {
    supabase = createClient();
  } catch (e: any) {
    console.error("Supabase client creation failed:", e.message);
    return { error: `A server configuration error occurred. Please ensure environment variables are set. Details: ${e.message}` };
  }
  
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, referralCode } = values;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
        username: username,
        country: country,
        phone: phone,
        referred_by: referralCode || null, 
      },
    },
  });

  if (error) {
    // Return the specific error from Supabase for debugging instead of a generic message.
    return { error: `Registration failed. Reason: ${error.message}` };
  }

  return { error: null };
}
