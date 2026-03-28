
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
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
    // This is the critical change: We now return the *exact* error message from Supabase.
    // This will tell us the true root cause of the registration failure.
    return { error: error.message };
  }

  return { error: null };
}
