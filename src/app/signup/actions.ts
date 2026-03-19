
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName: nameValue, username, country, phone, language, referralCode } = values;

  // Sign up the user in Supabase Auth, passing all profile data in the metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: nameValue,
        username: username,
        country: country,
        phone: phone,
        language: language,
        // We'll handle referral logic later if needed
      },
    },
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    return { error: `Registration failed: ${error.message}` };
  }

  // The profile will be created on the first visit to the dashboard.
  // This action's only job is to create the auth user.
  return { error: null };
}
