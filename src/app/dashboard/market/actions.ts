
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

    // 1. Check for specific PG2 limit (exactly 2 times)
    if (generatorId === 'pg2') {
        const { count, error: countError } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg2');

        if (countError) return { error: countError.message };

        if (count !== null && count >= 2) {
            return { error: 'you reached your pg2 limit please upgrade' };
        }
    }

    // 2. Check Balance
    if (profile.balance < gen.price) return { error: 'insufficient_funds' };

    const supabaseAdmin = createAdminClient();

    // 3. Deduct Balance
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ balance: profile.balance - gen.price })
        .eq('id', user.id);
        
    if (updateError) return { error: "Failed to update balance: " + updateError.message };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    // 4. Record Rental
    // Note: If the DB trigger is active, this will throw an error if limit is exceeded
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
        return { error: insertError.message.includes('pg2 limit') ? 'you reached your pg2 limit please upgrade' : insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}
