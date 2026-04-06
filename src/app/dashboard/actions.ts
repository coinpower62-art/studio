'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function claimReferralBonus() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, balance, referral_code')
        .eq('id', user.id)
        .single();
    
    if (!profile || !profile.referral_code) {
        return { error: 'User profile or referral code not found.' };
    }

    const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', profile.referral_code);

    if (count === null || count < 5) {
        return { error: 'You need at least 5 referrals to claim the bonus.' };
    }

    // Use gift code table to ensure one-time claim
    const bonusCode = `REF-BONUS-5-${user.id}`;

    const { data: existingBonus, error: checkError } = await supabase
        .from('gift_codes')
        .select('id')
        .eq('code', bonusCode)
        .maybeSingle();

    if (checkError) {
        return { error: 'Database error checking for existing bonus.' };
    }
        
    if (existingBonus) {
        return { error: 'You have already claimed this bonus.' };
    }
    
    // Grant bonus
    const bonusAmount = 3;
    const newBalance = profile.balance + bonusAmount;

    // Use a transaction if possible, but separate calls will have to do.
    // 1. Update balance
    const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);
    
    if (balanceError) {
        return { error: 'Failed to update balance.' };
    }

    // 2. Log the claim in gift_codes to prevent re-claiming
    const { error: logError } = await supabase.from('gift_codes').insert({
        code: bonusCode,
        amount: bonusAmount,
        note: '5-referral bonus',
        is_redeemed: true,
        redeemed_at: new Date().toISOString(),
        redeemed_by_user_id: user.id,
    });

    if (logError) {
        // Rollback balance update
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        return { error: 'Failed to log bonus claim. Balance was not changed.' };
    }

    revalidatePath('/dashboard');
    return { success: true, amount: bonusAmount };
}
