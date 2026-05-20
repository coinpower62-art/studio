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
    
    const now = new Date().toISOString();

    // ACTIVE Plan Check (One at a time per tier)
    const { count: activeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId)
        .gt('expires_at', now);

    if (activeCount && activeCount >= 1) {
        return { error: 'You already have an active plan for this generator tier.' };
    }

    // Special PG1 Rule: Lifetime Limit of 1 (Free Trial)
    if (generatorId === 'pg1') {
        const { count: totalPg1Count } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg1');
        
        if (totalPg1Count && totalPg1Count >= 1) {
            return { error: 'The PG1 Free Trial can only be activated once per account.' };
        }
    }

    // Balance Check
    if (profile.balance < generatorToRent.price) {
        return { error: 'insufficient_funds' };
    }

    // Deduct Balance
    const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - generatorToRent.price })
        .eq('id', user.id);

    if (balanceUpdateError) {
        return { error: 'Could not update your balance.' };
    }
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + generatorToRent.expire_days * 24 * 60 * 60 * 1000);

    // Create Rental
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
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id); // Rollback
        return { error: 'Activation failed. Please try again.' };
    }
    
    // Referral Commission Logic
    if (generatorToRent.price > 0 && profile.parent_id) {
        const rates = [0.10, 0.05, 0.02]; 
        let currentParentId: string | null = profile.parent_id;

        for (let level = 0; level < 3; level++) {
            if (!currentParentId) break;

            const { data: ref } = await supabase
                .from('profiles')
                .select('id, parent_id')
                .eq('id', currentParentId)
                .single();
            
            if (!ref) break;

            const commission = generatorToRent.price * rates[level];
            await supabase.rpc('increment_balance', { user_id_in: ref.id, amount_in: commission });

            currentParentId = ref.parent_id;
        }
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    revalidatePath('/dashboard');
    return {};
}