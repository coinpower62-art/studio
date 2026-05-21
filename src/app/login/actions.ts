
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const email = (formData.get('email') as string).toLowerCase()
  const password = formData.get('password') as string

  const cookieOptions = { 
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 
  };

  // 1. Check for Admin Panel Login
  if (email === 'coinpoweritaly' && password === 'Hostmyapp2577') {
      cookies().set('admin_logged_in', 'true', cookieOptions);
      return redirect('/admin/dashboard');
  }

  // 2. Check for Admin Client Login (Deposit Management Only)
  if (email === 'coinpower' && password === 'Admin2577') {
      cookies().set('admin_client_logged_in', 'true', cookieOptions);
      return redirect('/admin-client/dashboard');
  }
  
  // 3. Regular User Login via Supabase
  let supabase
  try {
    supabase = createClient()
  } catch (error) {
    return redirect(`/login?message=${encodeURIComponent('System initialization error.')}`)
  }
  
  if (!email || !password) {
    return redirect('/login?message=Email and password are required.')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let message = 'Could not authenticate user.';
    if (error.message.includes("Invalid login credentials")) {
        message = "Wrong username or password. Please try again or create a new account.";
    } else {
        message = error.message;
    }
    return redirect(`/login?message=${encodeURIComponent(message)}`);
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  cookies().set('admin_logged_in', '', { maxAge: 0 });
  cookies().set('admin_client_logged_in', '', { maxAge: 0 });
  redirect('/login')
}
