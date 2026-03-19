
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  console.log("Signup action started...");
  const supabase = createClient();
  
  const origin = headers().get('origin');

  const { email, password, fullName: nameValue, username, country, phone, language, referralCode } = values;
  console.log("Processing signup for:", { email, username, country });

  // Note: Referral code validation is temporarily disabled because it requires a service role key which is not configured.
  // This ensures the core signup functionality works.

  // 1. Sign up the user in Supabase Auth
  console.log("Attempting to sign up user in Supabase Auth...");
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        fullName: nameValue,
        username: username,
      },
    },
  });

  if (authError) {
    console.error("Supabase Auth signUp Error:", authError.message);
    if (authError.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    console.error("Supabase Auth signUp did not return a user object.");
    return { error: 'Could not sign up user. Please try again.' };
  }
  console.log("Supabase Auth signUp successful. User ID:", authData.user.id);
  
  // 2. Create a corresponding profile in the `profiles` table.
  // This uses the user's own session to create their profile, which is a standard secure pattern.
  console.log("Attempting to insert profile in 'profiles' table...");
  const profileData = {
    id: authData.user.id,
    email: email,
    full_name: nameValue,
    username: username,
    country: country,
    phone: phone,
    language: language,
    referral_code: `CP-${username.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    balance: 1.00, // Start with a $1 bonus
    has_withdrawal_pin: false,
    referral_count: 0,
    referred_by: null, // Temporarily null until referral system is re-enabled.
  };
  const { error: profileError } = await supabase.from('profiles').insert(profileData);


  if (profileError) {
    console.error('Error inserting profile:', profileError.message);
    console.error('Data sent to insert:', profileData);
    // If profile creation fails, the auth user will be orphaned.
    // Deleting them requires an admin client, which is what caused the original error.
    // This situation is not ideal, but it's better than signup being completely broken.
    // The RLS error will be more informative for future debugging.
    return { error: `Could not save user profile: ${profileError.message}. Your account was created but profile data could not be saved. Please contact support.` };
  }
  console.log("Profile insert successful for user ID:", authData.user.id);


  console.log("Signup action completed successfully.");
  return { error: null };
}
