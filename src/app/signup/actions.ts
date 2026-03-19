
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName: nameValue, username } = values;

  // Sign up the user in Supabase Auth, passing only essential data in the metadata.
  // This assumes a database trigger is responsible for creating the public.profiles record.
  // By simplifying the data, we reduce the chance of the trigger failing due to a schema mismatch.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: nameValue,
        username: username,
      },
    },
  });

  if (error) {
    if (error.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    // The generic "Database error saving new user" often points to a failing trigger.
    return { error: `Registration failed: ${error.message}` };
  }

  // If signUp is successful, we assume the trigger has created the profile.
  return { error: null };
}
