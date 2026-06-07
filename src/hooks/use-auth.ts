
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'user' | 'Admin_Client' | 'Main_Admin';

export function useAuth(requiredRole?: UserRole) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (requiredRole) router.push('/admin-client/login');
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const userRole = (profile?.role as UserRole) || 'user';
      
      setUser(user);
      setRole(userRole);

      if (requiredRole && userRole !== requiredRole && userRole !== 'Main_Admin') {
        router.push('/dashboard');
      }

      setLoading(false);
    }

    checkUser();
  }, [router, supabase, requiredRole]);

  return { user, role, loading };
}
