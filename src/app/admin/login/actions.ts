'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function adminLogin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Master Admin Login
  if (email.toLowerCase() === 'coinpoweritaly' && password === 'Hostmyapp2577') {
      cookies().set('admin_logged_in', 'true', { 
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 
      });
      return redirect('/admin/dashboard');
  }
  
  return redirect('/admin/login?message=Invalid Admin Credentials');
}

export async function adminLogout() {
  cookies().set('admin_logged_in', '', { path: '/', maxAge: 0 });
  return redirect('/admin/login');
}