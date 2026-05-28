'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Authentication required.' };

    const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
    if (!profile) return { error: 'Profile not found.' };

    const { data: gen } = await supabase.from('generators').select('*').eq('id', generatorId).single();
    if (!gen) return { error: 'Generator not found.' };

    // Fetch all rentals for this generator to check limits
    const { data: rentals, error: rentedError } = await supabase
        .from('rented_generators')
        .select('*')
        .eq('user_id', user.id)
        .eq('generator_id', gen.id);
    
    if (rentedError) return { error: rentedError.message };

    const now = new Date().getTime();
    const activeCount = rentals?.filter(r => new Date(r.expires_at).getTime() > now).length || 0;
    const totalCount = rentals?.length || 0;

    const activeLimit = gen.active_limit || 1;
    const lifetimeLimit = gen.lifetime_limit || 1;

    // 1. Enforce Lifetime Limit (Permanent Disconnection)
    if (totalCount >= lifetimeLimit) {
        if (gen.id === 'pg2') return { error: 'you reached your pg2 limit please upgrade' };
        return { error: `Lifetime limit reached for ${gen.name}. This generator is now disconnected.` };
    }

    // 2. Enforce Active Limit (Running at once)
    if (activeCount >= activeLimit) {
        return { error: `You already have ${activeCount} active ${gen.name}(s). Please wait for one to expire or upgrade plans.` };
    }

    // 3. Check Balance
    if (profile.balance < gen.price) return { error: 'insufficient_funds' };

    const supabaseAdmin = createAdminClient();

    // Deduct Balance
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ balance: profile.balance - gen.price })
        .eq('id', user.id);
        
    if (updateError) return { error: "Failed to update balance." };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    // Record Rental
    const { error: insertError } = await supabaseAdmin.from('rented_generators').insert({
        user_id: user.id,
        generator_id: gen.id,
        rented_at: rentedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_claimed_at: rentedAt.toISOString(),
    });
    
    if (insertError) {
        // Rollback balance if insert fails
        await supabaseAdmin.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        return { error: insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}
