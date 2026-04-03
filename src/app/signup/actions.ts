'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(values: any) {
  const supabase = createClient();
  const { email, password, fullName, username, country, phone, referralCode } = values;

  // Step 1: Pre-flight checks for username and phone number to provide better error messages.
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('username, phone')
    .or(`username.eq.${username},phone.eq.${phone}`);

  if (checkError) {
      // If the check fails, we don't block signup, but we log the error.
      // The database's unique constraints will still catch duplicates.
      console.error('Error checking for existing profile:', checkError.message);
  }

  if (existingProfile && existingProfile.length > 0) {
      if (existingProfile.some(p => p.username && p.username.toLowerCase() === username.toLowerCase())) {
          return { error: `Username "${username}" is already taken. Please choose a different one.` };
      }
      if (existingProfile.some(p => p.phone === phone)) {
          return { error: `This phone number is already in use. Please use a different one.` };
      }
  }

  // Step 2: Attempt to sign up the user.
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
      return { error: 'This email address is already registered. Please try signing in.' };
    }
    return { error: signupError.message };
  }

  if (!signupData.user) {
    return { error: 'Signup failed unexpectedly. Please try again.' };
  }

  // Step 3: Create or update the user's profile in `public.profiles`.
  try {
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    const generatedReferralCode = `CP-${username.toUpperCase()}${randomPart}`;

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: signupData.user.id,
        full_name: fullName,
        username: username,
        email: email,
        country: country,
        phone: phone,
        referral_code: generatedReferralCode,
        referred_by: referralCode || null,
        balance: 1.00,
      });

    if (profileError) {
      throw profileError;
    }

  } catch (error: any) {
    // This catch block handles potential race conditions if the pre-flight check passes
    // but a duplicate is inserted before this upsert runs.
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
      return { error: `Username "${username}" is already taken. Please choose a different one.` };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_phone_key"')) {
      return { error: `This phone number is already in use. Please use a different one.` };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_email_key"')) {
      return { error: `Email "${email}" is already in use. Please sign in.` };
    }
    // Generic error for other profile issues
    return { error: `Account created, but profile setup failed: ${error.message}. Please contact support.` };
  }

  // Return a success message to the client.
  return {
    success: true,
    message: 'Account created successfully! Your $1.00 welcome bonus has been added. Please sign in.'
  };
}
