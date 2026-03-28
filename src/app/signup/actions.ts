
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

  // --- CRITICAL ERROR HANDLING (FINAL) ---
  if (error) {
    // This is the definitive error handler. It checks for the specific technical
    // error for a duplicate username and translates it into a user-friendly message.
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"') || error.message.includes('Username') && error.message.includes('already taken')) {
      return { error: `Username "${username}" is already taken. Please choose a different one.` };
    }
    
    // Fallback for other potential database errors, returning the specific technical message.
    return { error: `Database error: ${error.message}` };
  }

  // A brief delay to allow the database trigger to complete.
  await new Promise(resolve => setTimeout(resolve, 500));

  // Double-check that the profile was actually created.
  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      // This is a last-resort error if the trigger fails for an unknown reason.
      console.error("Profile creation check failed:", profileError);
      return { error: 'Authentication successful, but profile creation failed. This is a critical error. Please contact support.' };
    }
  }

  return { error: null };
}

    