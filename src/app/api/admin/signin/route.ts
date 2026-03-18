import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  // Note: Using environment variables on the server-side like this is correct.
  // Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .eq('password', password) // IMPORTANT: Storing and checking plaintext passwords is not secure. Consider using a hashing library like bcrypt.
    .single();

  if (error || !admin) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  // In a real app, you would typically generate a JWT or session cookie here.
  // For this implementation, we are just confirming the credentials are valid.
  return NextResponse.json({ success: true });
}
