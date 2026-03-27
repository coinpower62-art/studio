
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
    // Check for a duplicate username error specifically from our trigger
    if (error.message.includes("is already taken")) {
        return { error: error.message };
    }
    // Check for the generic unique violation from the database on the username column
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        return { error: `Username "${username}" is already taken. Please choose another one.` };
    }
    // For all other errors, show the raw message for debugging.
    return { error: `Registration failed. Reason: ${error.message}` };
  }

  return { error: null };
}
