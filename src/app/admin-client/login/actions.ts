'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function adminClientLogin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Client Admin Login (Deposits Only)
  if (email.toLowerCase() === 'coinpower' && password === 'Admin2577') {
      cookies().set('admin_client_logged_in', 'true', { 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 12 
      });
      return redirect('/admin-client/dashboard');
  }
  
  return redirect('/admin-client/login?message=Invalid Client Credentials');
}

export async function adminClientLogout() {
  cookies().set('admin_client_logged_in', '', { path: '/', maxAge: 0 });
  return redirect('/admin-client/login');
}