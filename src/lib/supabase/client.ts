import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Use a global variable to hold the client instance to prevent multiple instances
// during development with Hot Module Replacement (HMR).
const globalWithSupabase = globalThis as typeof globalThis & {
  supabase: SupabaseClient | undefined
}

export function createClient() {
  if (globalWithSupabase.supabase) {
    return globalWithSupabase.supabase
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  globalWithSupabase.supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  
  return globalWithSupabase.supabase;
}
