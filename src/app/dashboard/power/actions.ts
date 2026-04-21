'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function collectEarnings(rentedGeneratorId: string): Promise<{ success: boolean; message: string; earned?: number; }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const { data: earnedAmount, error } = await supabase.rpc('collect_earnings', {
      rented_generator_id_in: rentedGeneratorId,
      user_id_in: user.id
    });

    if (error) {
      // The RPC function raises exceptions, which are caught here.
      return { success: false, message: error.message };
    }

    if (typeof earnedAmount === 'number' && earnedAmount > 0) {
      revalidatePath('/dashboard/power');
      revalidatePath('/dashboard');
      return { success: true, message: `Collected $${earnedAmount.toFixed(2)}!`, earned: earnedAmount };
    } else {
      return { success: false, message: 'Not yet time to collect or no earnings available.' };
    }
  } catch (e: any) {
    console.error("RPC call failed:", e);
    return { success: false, message: 'An unexpected error occurred during collection.' };
  }
}

export async function getReferralTeamData() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required.' };
  }

  try {
    const { data, error } = await supabase.rpc('get_referral_team_details', {
      p_user_id: user.id
    });

    if (error) {
      console.error("Error fetching referral team:", error);
      throw new Error(error.message);
    }

    return { data };

  } catch (e: any) {
    return { error: 'An unexpected error occurred while fetching your team.' };
  }
}
