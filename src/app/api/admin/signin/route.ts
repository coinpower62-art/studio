
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  // --- This is a temporary, insecure login for demonstration purposes. ---
  // --- In a real application, you should use a secure authentication method ---
  // --- and store credentials in your database, not in the code. ---
  const ADMIN_USERNAME = "admin";
  const ADMIN_PASSWORD = "password";

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // In a real app, you would typically generate a JWT or session cookie here.
    // For this implementation, we are just confirming the credentials are valid.
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
}
