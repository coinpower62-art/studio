
'use server'

import { createClient } from '@/lib/supabase/server'

export async function signup(values: any) {
  const supabase = createClient()
  
  const { email, password, fullName, username } = values;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username,
      }
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  if (!authData.user) {
    return { error: 'Could not sign up user.' }
  }

  // After sign up, Supabase sends a confirmation email by default.
  // The user will be redirected to the login page with a message to check their email.
  return { error: null }
}
