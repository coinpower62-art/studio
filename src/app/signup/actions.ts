
'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

export async function signup(values: any) {
  console.log("Signup action started...");
  const supabase = createClient();
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const origin = headers().get('origin');

  const { email, password, fullName: nameValue, username, country, phone, language, referralCode } = values;
  console.log("Processing signup for:", { email, username, country });

  // 1. Check if referral code is valid
  let referredByUserId: string | null = null;
  if (referralCode) {
    console.log(`Checking referral code: ${referralCode}`);
    const { data: referringUser, error: referralError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (referralError || !referringUser) {
      console.error("Invalid referral code:", referralError?.message);
      return { error: `Invalid referral code. If you don't have one, leave it blank.` };
    }
    referredByUserId = referringUser.id;
    console.log(`Referral code is valid. Referred by user ID: ${referredByUserId}`);
  }

  // 2. Sign up the user in Supabase Auth
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
  
  // 3. Create or update a corresponding profile in the `profiles` table using upsert
  console.log("Attempting to upsert profile in 'profiles' table...");
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
    referred_by: referredByUserId,
  };
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profileData);


  if (profileError) {
    console.error('Error upserting profile:', profileError.message);
    console.error('Data sent to upsert:', profileData);
    // If profile creation fails, we should delete the auth user to avoid orphans.
    console.log(`Attempting to delete orphaned auth user: ${authData.user.id}`);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.log("Orphaned auth user deleted.");
    return { error: `Could not create user profile. This is a critical error. The user was not created.` };
  }
  console.log("Profile upsert successful for user ID:", authData.user.id);


  // 4. If the user was referred, increment the referrer's count
  if (referredByUserId) {
      console.log(`Attempting to increment referral count for user ID: ${referredByUserId}`);
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('referral_count')
        .eq('id', referredByUserId)
        .single()
      
      if (data) {
        const {error: updateError} = await supabaseAdmin
          .from('profiles')
          .update({ referral_count: (data.referral_count || 0) + 1 })
          .eq('id', referredByUserId)

        if(updateError) {
          console.error("Failed to increment referrer's count:", updateError.message);
        } else {
          console.log("Successfully incremented referrer's count.");
        }
      } else {
        console.error("Could not fetch referrer's profile to increment count:", error?.message);
      }
  }


  console.log("Signup action completed successfully.");
  // On success, return no error. Let the client handle the next steps.
  return { error: null };
}
