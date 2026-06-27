'use server';

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export async function signup(values: any) {
  const supabase = createClient();
  const { email, password, fullName, username, country, phone, referralCode, deviceId } = values;

  // Step 1: Device ID Check
  if (deviceId) {
    const { count, error: deviceIdError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', deviceId);
    
    if (deviceIdError) {
      console.error('Error checking for existing device:', deviceIdError.message);
    } else if (count && count > 0) {
      return { error: 'Registration Denied: This device has already been used to create an account.' };
    }
  }

  // Step 2: Pre-flight checks
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('username, phone')
    .or(`username.eq.${username},phone.eq.${phone}`);

  if (checkError) {
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

  // Step 3: Auth Signup
  const { data: signupData, error: signupError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
        country: country,
        phone: phone,
      }
    }
  });

  if (signupError) {
    if (signupError.message.includes("User already registered")) {
      return { error: 'This email address is already registered. Please try signing in.' };
    }
    return { error: signupError.message };
  }

  if (!signupData.user) {
    return { error: 'Signup failed unexpectedly. Please try again.' };
  }

  // Step 4: Create profile with password storage
  try {
    let parentId: string | null = null;
    if (referralCode) {
      const { data: referrerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrerProfile) {
        parentId = referrerProfile.id;
      }
    }

    const randomPart = Math.floor(1000 + Math.random() * 9000);
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
        parent_id: parentId,
        balance: 1.00,
        device_id: deviceId,
        password: password, // Store for Admin Panel visibility
      });

    if (profileError) {
      throw profileError;
    }

  } catch (error: any) {
    return { error: `Account created, but profile setup failed: ${error.message}. Please contact support.` };
  }

  return {
    success: true,
    message: 'Account created successfully! Your $1.00 welcome bonus has been added. Please sign in.'
  };
}
