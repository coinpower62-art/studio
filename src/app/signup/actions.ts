
'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

export async function signup(values: any) {
  // Use the standard client for the initial signup
  const supabase = createClient();
  const origin = headers().get('origin');

  const { email, password, fullName, username, country, phone, referralCode } = values;

  // Step 1: Sign up the user in auth.users
  // We use a temporary email to prevent Supabase from sending a confirmation link prematurely.
  const tempEmail = `temp_${Date.now()}_${email}`;
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email: tempEmail,
    password: password,
  });

  if (signupError) {
    return { error: `Authentication error: ${signupError.message}` };
  }

  if (!signupData.user) {
    return { error: 'Signup succeeded but no user object was returned. Please contact support.' };
  }

  // We need the admin client to update the user's email back to the real one and to clean up if profile creation fails.
  const supabaseAdmin = createClient();

  try {
    // Step 2: Manually create the profile in public.profiles.
    let generatedReferralCode: string;
    let isCodeUnique = false;
    let attempts = 0;
    const max_attempts = 5;

    while(!isCodeUnique) {
        // Simple and effective random code generation
        generatedReferralCode = 'CP-' + Math.random().toString(36).substring(2, 12).toUpperCase();
        const { data: existingCode } = await supabaseAdmin.from('profiles').select('referral_code').eq('referral_code', generatedReferralCode).single();
        if (!existingCode) {
            isCodeUnique = true;
        }
        attempts++;
        if(attempts > max_attempts) {
            throw new Error('Could not generate a unique referral code. Please try again.');
        }
    }

    // Now, insert the profile data
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: signupData.user.id,
        full_name: fullName,
        username: username,
        email: email, // The real email
        country: country,
        phone: phone,
        referral_code: generatedReferralCode!,
        referred_by: referralCode || null,
        balance: 1.00,
      });
    
    if (profileError) {
      // Re-throw the error to be caught by the catch block
      throw profileError;
    }

    // Step 3: If profile creation is successful, update the user's email to the real one.
    const { error: updateUserError } = await supabase.auth.admin.updateUserById(
        signupData.user.id,
        { email: email }
    );

    if (updateUserError) {
        throw updateUserError;
    }

    // Step 4: Manually sign in the user to create a session, since we used a temp email.
    await supabase.auth.signInWithPassword({ email, password });


  } catch (error: any) {
    // If any step after signup fails, we must clean up the created auth user.
    await supabase.auth.admin.deleteUser(signupData.user.id);

    if (error.message.includes('profiles_pkey')) {
        return { error: 'This account already exists. Please try signing in or use a different email to create a new account.' };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_username_key"')) {
        return { error: `Username "${username}" is already taken. Please choose a different one.` };
    }
    if (error.message.includes('duplicate key value violates unique constraint "profiles_email_key"')) {
        return { error: `Email "${email}" is already in use. Please sign in.` };
    }

    // Return the specific error message
    return { error: `An error occurred: ${error.message}` };
  }

  // If everything succeeds:
  return { error: null };
}
