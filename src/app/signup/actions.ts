
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
  // If there's an auth error (like from our database function), return the EXACT message.
  if (error) {
    // This will expose the true root cause, e.g., "Username 'test' is already taken."
    return { error: error.message };
  }

  // Double-check that the profile was created by the trigger.
  if (data.user) {
    // We need a brief pause to allow the database trigger to complete.
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      // This is now a more specific fallback error.
      return { error: 'User authenticated, but profile creation failed. Please ensure the latest SQL script from README.md has been run in your Supabase project.' };
    }
  }

  return { error: null };
}
