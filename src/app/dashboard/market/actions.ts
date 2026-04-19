
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
        .select('balance, parent_id, username, email') // Changed from referred_by
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
    
    // PG1 is free and can only be rented once
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
    
    // START: Referral Commission Logic
    if (generatorToRent.price > 0 && profile.parent_id) {
        const { count, error: countError } = await supabase
            .from('rented_generators')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('generator_id', 'pg1');

        if (countError) {
            console.error('Referral commission check failed:', countError.message);
        } else if (count === 1) { // This is the first paid generator for this user
            const { data: referrerProfile, error: referrerError } = await supabase
                .from('profiles')
                .select('id, balance')
                .eq('id', profile.parent_id)
                .single();

            if (referrerProfile) {
                const commission = generatorToRent.price * 0.10;
                const { error: updateReferrerError } = await supabase
                    .from('profiles')
                    .update({ balance: referrerProfile.balance + commission })
                    .eq('id', referrerProfile.id);

                if (!updateReferrerError) {
                    // Log the commission payment for record-keeping. It's okay if this fails.
                    await supabase.from('gift_codes').insert({
                        code: `COMM-${user.id.slice(0, 4)}-${generatorToRent.id}`,
                        amount: commission,
                        note: `10% commission from ${profile.username || profile.email} renting ${generatorToRent.name}`,
                        is_redeemed: true,
                        redeemed_at: new Date().toISOString(),
                        redeemed_by_user_id: referrerProfile.id
                    });
                } else {
                    console.error('Failed to apply referral commission:', updateReferrerError.message);
                }
            } else {
                console.error('Referrer profile not found for parent_id:', profile.parent_id);
            }
        }
    }
    // END: Referral Commission Logic
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    revalidatePath('/dashboard');
    return {};
}
