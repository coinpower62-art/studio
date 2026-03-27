
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  let supabase;
  try {
    supabase = createClient();
  } catch (e: any) {
    console.error("Supabase client creation failed:", e.message);
    return { error: `A server configuration error occurred. Please ensure environment variables are set. Details: ${e.message}` };
  }
  
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, referralCode } = values;

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
        referral_code: newUserReferralCode, 
        referred_by: referralCode || null, 
      },
    },
  });

  if (error) {
    console.error("Signup Error:", error.message);
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists. Please sign in.' };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        return { error: 'This username is already taken. Please choose another one.' };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_email_key"')) {
        return { error: 'This email address is already in use by another profile.' };
    }
    if (error.message.includes('Database error saving new user')) {
      return { error: 'A problem occurred while creating your profile. This could be due to a username or email that is already in use.' };
    }
    // Fallback for the "Invalid API key" or other generic errors
    return { error: 'Registration failed. This may be due to a server issue or an invalid username/email. Please try again.' };
  }

  return { error: null };
}
