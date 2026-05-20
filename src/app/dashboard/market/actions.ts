'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'You must be logged in to rent a generator.' };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('balance, parent_id, username, email')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return { error: 'Could not find your user profile.' };
    }

    const { data: gen } = await supabase
        .from('generators')
        .select('*')
        .eq('id', generatorId)
        .eq('published', true)
        .single();

    if (!gen) {
        return { error: 'Generator not found or is not available for rent.' };
    }
    
    // --- LIFETIME RENTAL LIMITS ---
    const { count: lifetimeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId);

    // PG2: Max 2 Lifetime
    if (generatorId === 'pg2' && lifetimeCount !== null && lifetimeCount >= 2) {
        return { error: 'Limit reached: You can only rent PG2 generators twice in total.' };
    }

    // PG1: Max 1 Lifetime (Free Trial)
    if (generatorId === 'pg1' && lifetimeCount !== null && lifetimeCount >= 1) {
        return { error: 'Limit reached: You can only use the PG1 Free Trial once.' };
    }

    // Default limit check for other tiers (Active Limit 1)
    const now = new Date().toISOString();
    const { count: activeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId)
        .gt('expires_at', now);

    if (activeCount !== null && activeCount >= 1) {
        return { error: 'You already have an active plan for this generator tier.' };
    }

    if (profile.balance < gen.price) {
        return { error: 'insufficient_funds' };
    }

    const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - gen.price })
        .eq('id', user.id);

    if (balanceUpdateError) return { error: 'Balance update failed.' };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    const { error: rentalError } = await supabase
        .from('rented_generators')
        .insert({
            user_id: user.id,
            generator_id: gen.id,
            rented_at: rentedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_claimed_at: rentedAt.toISOString(),
        });
    
    if (rentalError) {
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id); // Rollback
        return { error: 'Rental process failed.' };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    revalidatePath('/dashboard');
    return {};
}
