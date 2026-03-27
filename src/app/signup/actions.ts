
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
      },
    },
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    // This is a common error when the trigger that creates the profile fails due to a unique constraint.
    if (error.message.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('profiles_username_key')) {
            return { error: 'This username is already taken. Please choose another.' };
        }
        if (error.message.includes('profiles_email_key')) {
            return { error: 'This email address is already in use by another profile.' };
        }
        return { error: 'This username or email is already taken.' };
    }
    
    // Provide a more user-friendly message for generic database errors during signup
    if (error.message.includes('Database error saving new user')) {
      return { error: 'A problem occurred while creating your profile. This could be due to a username or email that is already taken.' };
    }
    
    return { error: error.message };
  }

  return { error: null };
}
