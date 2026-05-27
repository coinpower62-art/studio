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
    
    // 1. Check Lifetime Limit (Total ever rented)
    const { count: lifetimeCount } = await supabase
        .from('rented_generators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('generator_id', generatorId);

    // Rules: PG1 (1 max), PG2 (2 max), Others (from DB)
    let max = gen.max_rentals ?? 1;
    if (generatorId === 'pg1') max = 1;
    if (generatorId === 'pg2') {
        max = 2;
        if (lifetimeCount !== null && lifetimeCount >= max) {
            return { error: 'You have reached your rent limit' };
        }
    }
    
    if (lifetimeCount !== null && lifetimeCount >= max) {
        return { error: `Lifetime account limit reached for this plan (${max} rentals total).` };
    }

    // 2. Check Balance
    if (profile.balance < gen.price) return { error: 'insufficient_funds' };

    // 3. Deduct Balance
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ balance: profile.balance - gen.price })
        .eq('id', user.id);
        
    if (updateError) return { error: "Failed to update balance: " + updateError.message };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    // 4. Record Rental
    const { error: insertError } = await supabase.from('rented_generators').insert({
        user_id: user.id,
        generator_id: gen.id,
        rented_at: rentedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_claimed_at: rentedAt.toISOString(),
    });
    
    if (insertError) {
        // Optional: Refund balance if insert fails
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        return { error: "Failed to record rental: " + insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}