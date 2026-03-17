'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signup(values: any) {
  const supabase = createClient();

  const { email, password, fullName, username, country, phone, language, referralCode } = values;

  // 1. Sign up the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      },
    },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Could not sign up user.' };
  }

  // 2. Create a corresponding profile in the `profiles` table
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: email,
    full_name: fullName,
    username: username,
    country: country,
    phone: phone,
    language: language,
    referral_code: `CP-${username.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`, // Generate a referral code
    referred_by: referralCode || null,
    balance: 1.00, // Start with a $1 bonus
    has_withdrawal_pin: false,
    referral_count: 0
  });

  if (profileError) {
    // If profile creation fails, we should ideally delete the auth user
    // to keep things consistent. This is an advanced pattern.
    // For now, we'll just log the error.
    console.error('Error creating profile:', profileError.message);
    // You might want to return a specific error to the user here
    return { error: `Could not create user profile: ${profileError.message}` };
  }

  // After sign up, Supabase sends a confirmation email by default.
  redirect('/login?message=Check your email to confirm your account and sign in.');

  return { error: null };
}
