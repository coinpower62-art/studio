
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, language, referralCode } = values;

  // 1. Check if referral code is valid
  let referredByUserId: string | null = null;
  if (referralCode) {
    const { data: referringUser, error: referralError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (referralError || !referringUser) {
      return { error: `Invalid referral code. If you don't have one, leave it blank.` };
    }
    referredByUserId = referringUser.id;
  }

  // 2. Sign up the user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        fullName: fullName,
        username: username,
      },
    },
  });

  if (authError) {
    if (authError.message.includes('User already registered')) {
        return { error: 'A user with this email address already exists.' };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: 'Could not sign up user. Please try again.' };
  }
  
  // 3. Create a corresponding profile in the `profiles` table
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email: email,
    full_name: fullName,
    username: username,
    country: country,
    phone: phone,
    language: language,
    referral_code: `CP-${username.toUpperCase()}${Math.floor(1000 + Math.random() * 9000)}`,
    balance: 1.00, // Start with a $1 bonus
    has_withdrawal_pin: false,
    referral_count: 0,
    referred_by: referredByUserId,
  });

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
    // Ideally, delete the auth user to keep things consistent.
    const { data, error } = await supabase.auth.admin.deleteUser(authData.user.id)
    if(error) {
      console.error('Failed to delete auth user after profile creation failed', error)
    }
    return { error: `Could not create user profile. Please try again.` };
  }

  // 4. If the user was referred, increment the referrer's count
  if (referredByUserId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_count')
        .eq('id', referredByUserId)
        .single()
      
      if (data) {
        const {error: updateError} = await supabase
          .from('profiles')
          .update({ referral_count: (data.referral_count || 0) + 1 })
          .eq('id', referredByUserId)

        if(updateError) {
          console.error("Failed to increment referrer's count:", updateError.message);
        }
      }
  }


  // On success, return no error. Let the client handle the next steps.
  return { error: null };
}
