'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function claimReferralBonus() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in.' };
    }

    const { data, error } = await supabase.rpc('claim_referral_bonus', {
        user_id_in: user.id
    });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, amount: data };
}

    