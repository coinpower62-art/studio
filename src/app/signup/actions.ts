
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(values: any) {
  const supabase = createClient();
  const { email, password, fullName, username, country, phone, referralCode } = values;

  // Step 1: Attempt to sign up the user with their real email.
  // This is a much safer approach. If the user's email already exists in `auth.users`,
  // this function will fail immediately with a clear error message.
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // We pass the user's details in the metadata.
      // This is the standard way to handle additional data during signup.
      data: {
        full_name: fullName,
        username: username,
        country: country,
        phone: phone,
        referred_by: referralCode || null,
      }
    }
  });

  // Handle signup errors immediately.
  if (signupError) {
    if (signupError.message.includes("User already registered")) {
      return { error: 'This account already exists. Please try signing in or use a different email to create a new account.' };
    }
    // For any other auth error, return it directly.
    return { error: signupError.message };
  }

  if (!signupData.user) {
    // This is an unlikely edge case, but we handle it.
    return { error: 'Signup failed unexpectedly. Please try again.' };
  }

  // Step 2: Manually create the user's profile in the `public.profiles` table.
  try {
    // Generate a unique referral code for the new user.
    let generatedReferralCode: string;
    let isCodeUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!isCodeUnique) {
      if (attempts >= MAX_ATTEMPTS) {
        throw new Error('Could not generate a unique referral code. Please try again.');
      }
      generatedReferralCode = 'CP-' + Math.random().toString(36).substring(2, 12).toUpperCase();
      const { data: existingCode } = await supabase.from('profiles').select('referral_code').eq('referral_code', generatedReferralCode).single();
      if (!existingCode) {
        isCodeUnique = true;
      }
      attempts++;
    }

    // Insert the new profile record.
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: signupData.user.id,
        full_name: fullName,
        username: username,
        email: email,
        country: country,
        phone: phone,
        referral_code: generatedReferralCode!,
        referred_by: referralCode || null,
        balance: 1.00, // Give the user their $1 starting bonus.
      });

    // If there's an error creating the profile, throw it to the catch block.
    if (profileError) {
      throw profileError;
    }

  } catch (error: any) {
    // This catch block now primarily handles errors during profile creation,
    // like a duplicate username. The "account already exists" error is already
    // handled by the initial `signUp` call.
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
      return { error: `Username "${username}" is already taken. Please choose a different one.` };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_email_key"')) {
      return { error: `Email "${email}" is already in use. Please sign in.` };
    }
    
    // An orphan auth.user might be created if profile insertion fails. This is now much rarer.
    // We inform the user to contact support in this edge case.
    return { error: `Account created, but profile setup failed: ${error.message}. Please contact support.` };
  }

  // If email confirmation is disabled in Supabase, the user has a session now and can be redirected.
  // This is the expected flow for this app.
  if (signupData.session) {
    redirect('/dashboard');
  } 
  
  // If email confirmation is ENABLED, there is no session.
  // We return an error telling the user to check their email.
  else {
    return { error: "Account created! Please check your email to confirm your account before signing in." };
  }

  // This part is unreachable due to the redirect, but as a fallback:
  return { error: null };
}
