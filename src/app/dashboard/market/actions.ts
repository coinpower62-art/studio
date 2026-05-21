'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Auth required.' };

    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found.' };

    const { data: gen } = await supabase.from('generators').select('*').eq('id', generatorId).single();
    if (!gen) return { error: 'Generator not found.' };
    
    // Check Lifetime Limit
    const { count: lifetimeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId);

    const max = generatorId === 'pg2' ? 2 : (gen.max_rentals ?? 1);
    if (lifetimeCount !== null && lifetimeCount >= max) {
        return { error: `Lifetime limit of ${max} reached for this plan.` };
    }

    // Check Active Limit
    const { count: activeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId)
        .gt('expires_at', new Date().toISOString());

    if (activeCount !== null && activeCount >= 1) {
        return { error: 'You already have an active plan of this type.' };
    }

    if (profile.balance < gen.price) return { error: 'Insufficient funds.' };

    await supabase.from('profiles').update({ balance: profile.balance - gen.price }).eq('id', user.id);
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    await supabase.from('rented_generators').insert({
        user_id: user.id,
        generator_id: gen.id,
        rented_at: rentedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_claimed_at: rentedAt.toISOString(),
    });
    
    revalidatePath('/dashboard/market');
    return {};
}