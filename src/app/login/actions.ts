
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  let supabase
  try {
    supabase = createClient()
  } catch (error) {
    const message = (error as Error).message || 'An unexpected error occurred during initialization.';
    return redirect(`/login?message=${encodeURIComponent(message)}`)
  }
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string

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
        message = "Account does not exist. Please Sign Up to continue.";
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
