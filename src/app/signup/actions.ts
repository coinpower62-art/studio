
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

  // --- CRITICAL CHANGE ---
  // If there's an auth error, we now return the EXACT message from Supabase.
  if (error) {
    // This will expose the true root cause of the registration failure.
    return { error: `Supabase Auth Error: ${error.message}` };
  }

  // If auth succeeded, double-check that the profile was created by the trigger.
  if (data.user) {
    // We need a brief pause to allow the database trigger to complete.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      // This is the "Database error saving new user" situation.
      // Now we know for sure the database function `handle_new_user` is the problem.
      return { error: 'User authentication succeeded, but profile creation in the database failed. Please run the latest SQL script from the README.md in your Supabase SQL Editor.' };
    }
  }

  return { error: null };
}
