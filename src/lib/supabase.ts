import { createClient } from '@supabase/supabase-js'

// IMPORTANT: Replace with your actual Supabase project URL and anon key from your Supabase dashboard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
