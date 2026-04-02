import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient | undefined;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve the client across HMR.
    const globalWithSupabase = globalThis as typeof globalThis & {
      supabase: SupabaseClient | undefined;
    };
    if (!globalWithSupabase.supabase) {
      globalWithSupabase.supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
    return globalWithSupabase.supabase;
  }

  if (!supabase) {
    supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabase;
}
