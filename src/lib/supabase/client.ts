import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// This ensures that the client is a true singleton in development to prevent
// the "AbortError: Lock broken by another request" error during HMR.
const globalForSupabase = globalThis as unknown as {
  supabase: SupabaseClient | undefined
}

export function createClient() {
  // Use the global instance if it exists.
  if (globalForSupabase.supabase) {
    return globalForSupabase.supabase
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.')
  }

  // Create a new client and store it globally.
  globalForSupabase.supabase = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
  
  return globalForSupabase.supabase
}
