
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, referralCode } = values;

  // Check if username is already taken before attempting to sign up
  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { 
    // PGRST116 means no rows were found, which is what we want.
    // Any other error is a real database problem.
    return { error: `Database error checking username: ${profileError.message}` };
  }

  if (existingProfile) {
    return { error: 'This username is already taken. Please choose another.' };
  }

  // Generate a unique referral code for the new user.
  const newUserReferralCode = `CP-${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36).slice(-5)}`.toUpperCase();

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
        referral_code: newUserReferralCode, // The new user's OWN code
        referred_by: referralCode || null, // The code of the user who referred them (can be empty/null)
        // balance: 1.00, // Balance is now set by the handle_new_user trigger
        // has_withdrawal_pin: false,
      },
    },
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    // This error is often caused by a failing database trigger or RLS policy.
    return { error: `Registration failed: ${error.message}` };
  }

  return { error: null };
}
