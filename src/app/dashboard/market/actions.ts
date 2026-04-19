
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'You must be logged in to rent a generator.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance, parent_id, username, email')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: 'Could not find your user profile.' };
    }

    const { data: generatorToRent, error: generatorError } = await supabase
        .from('generators')
        .select('*')
        .eq('id', generatorId)
        .eq('published', true)
        .single();

    if (generatorError || !generatorToRent) {
        return { error: 'Generator not found or is not available for rent.' };
    }
    
    if (generatorToRent.id === 'pg1') {
        const { count, error: countError } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg1');

        if (countError) {
             return { error: 'Could not verify your existing generators.' };
        }
        if (count && count > 0) {
            return { error: 'You can only rent the free PG1 Generator once.' };
        }
    }


    if (profile.balance < generatorToRent.price) {
        return { error: 'insufficient_funds' };
    }

    const newBalance = profile.balance - generatorToRent.price;
    const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

    if (balanceUpdateError) {
        return { error: 'Could not update your balance.' };
    }
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + generatorToRent.expire_days * 24 * 60 * 60 * 1000);

    const { error: rentalError } = await supabase
        .from('rented_generators')
        .insert({
            user_id: user.id,
            generator_id: generatorToRent.id,
            rented_at: rentedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_claimed_at: rentedAt.toISOString(),
        });
    
    if (rentalError) {
        // Rollback balance update
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        return { error: 'Could not rent the generator. Your balance has not been changed.' };
    }
    
    // START: 3-Level Referral Commission Logic
    if (generatorToRent.price > 0 && profile.parent_id) {
        const commissionRates = [0.10, 0.05, 0.02]; // L1, L2, L3
        let currentParentId: string | null = profile.parent_id;

        for (let level = 0; level < 3; level++) {
            if (!currentParentId) break;

            const { data: referrer, error: referrerError } = await supabase
                .from('profiles')
                .select('id, parent_id, username, email')
                .eq('id', currentParentId)
                .single();
            
            if (referrerError || !referrer) {
                console.error(`Commission Error: Could not find referrer at level ${level + 1}. Parent ID: ${currentParentId}`);
                break;
            }

            const commission = generatorToRent.price * commissionRates[level];
            
            // Use RPC to atomically update balance to prevent race conditions
            const { error: updateReferrerError } = await supabase.rpc('increment_balance', {
                user_id_in: referrer.id,
                amount_in: commission
            });

            if (updateReferrerError) {
                console.error(`Failed to apply L${level + 1} commission for user ${referrer.id}:`, updateReferrerError.message);
            } else {
                 // Log commission payment for record-keeping
                await supabase.from('gift_codes').insert({
                    code: `COMM-L${level+1}-${user.id.slice(0,4)}-${generatorToRent.id}`,
                    amount: commission,
                    note: `${commissionRates[level]*100}% L${level+1} comm from ${profile.username || profile.email} renting ${generatorToRent.name}`,
                    is_redeemed: true,
                    redeemed_at: new Date().toISOString(),
                    redeemed_by_user_id: referrer.id
                });
            }

            currentParentId = referrer.parent_id; // Move to the next level up
        }
    }
    // END: Referral Commission Logic
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    revalidatePath('/dashboard');
    return {};
}

