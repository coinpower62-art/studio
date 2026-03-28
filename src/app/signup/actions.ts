
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(values: any) {
  const supabase = createClient();
  const { email, password, fullName, username, country, phone, referralCode } = values;

  // Step 1: Attempt to sign up the user.
  // This will fail if the user's email already exists in `auth.users`, which is what we want.
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
        country: country,
        phone: phone,
        referred_by: referralCode || null,
      }
    }
  });

  // Handle auth errors immediately (e.g., user already exists).
  if (signupError) {
    if (signupError.message.includes("User already registered")) {
      return { error: 'This account already exists. Please try signing in or use a different email to create a new account.' };
    }
    return { error: signupError.message };
  }

  if (!signupData.user) {
    return { error: 'Signup failed unexpectedly. Please try again.' };
  }

  // Step 2: Create or update the user's profile in `public.profiles`.
  // We use `upsert` here. This is the key change. `upsert` will UPDATE the
  // profile if an old trigger created it, or INSERT a new one if it doesn't exist.
  // This prevents the "duplicate key" error permanently.
  try {
    // Generate a unique referral code for the new user.
    let generatedReferralCode: string;
    let isCodeUnique = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (!isCodeUnique && attempts < MAX_ATTEMPTS) {
      // Use Math.random() which is available in all JS environments, including Edge.
      const randomPart = Math.random().toString(36).substring(2, 12).toUpperCase();
      generatedReferralCode = 'CP-' + randomPart;
      
      const { data: existingCode } = await supabase.from('profiles').select('referral_code').eq('referral_code', generatedReferralCode).single();
      if (!existingCode) {
        isCodeUnique = true;
      }
      attempts++;
    }

    if (!isCodeUnique) {
      throw new Error('Could not generate a unique referral code. Please try again.');
    }

    // Use .upsert() to prevent primary key conflicts.
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
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

    if (profileError) {
      throw profileError;
    }

  } catch (error: any) {
    // This catch block will now only handle very rare errors, as the main conflicts are resolved.
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
      return { error: `Username "${username}" is already taken. Please choose a different one.` };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_email_key"')) {
      return { error: `Email "${email}" is already in use. Please sign in.` };
    }
    return { error: `Account created, but profile setup failed: ${error.message}. Please contact support.` };
  }

  // If we reach here, signup and profile creation were successful.
  if (signupData.session) {
    redirect('/dashboard');
  } 
  else {
    return { error: "Account created! Please check your email to confirm your account before signing in." };
  }

  return { error: null };
}
