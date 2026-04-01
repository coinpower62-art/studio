
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Admin Login Check
  if (email.toLowerCase() === 'coinpoweritaly' && password === 'Hostmyapp2577') {
      cookies().set('admin_logged_in', 'true', { path: '/' });
      return redirect('/admin/dashboard');
  }
  
  // Regular User Login
  let supabase
  try {
    supabase = createClient()
  } catch (error) {
    const message = (error as Error).message || 'An unexpected error occurred during initialization.';
    return redirect(`/login?message=${encodeURIComponent(message)}`)
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
  redirect('/login')
}
