
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, referralCode } = values;

  // The new user's profile information will be passed in the `options.data` property
  // of the `signUp` method. This metadata will be used on the dashboard page to create
  // the user's profile, making the process resilient to database trigger failures.
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
        referral_code: referralCode,
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
