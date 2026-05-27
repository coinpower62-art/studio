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

    // 1. Pre-check for PG2 lifetime limit (to show specific UI message if possible, 
    // although the DB trigger is the final authority)
    if (generatorId === 'pg2') {
        const { count } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg2');
        
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
        
    if (updateError) return { error: "Failed to update balance." };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    // 4. Record Rental
    // If the database trigger "check_pg2_limit" is active, this insert will fail if the limit is reached.
    const { error: insertError } = await supabaseAdmin.from('rented_generators').insert({
        user_id: user.id,
        generator_id: gen.id,
        rented_at: rentedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        last_claimed_at: rentedAt.toISOString(),
    });
    
    if (insertError) {
        // Rollback balance if insert fails (e.g., triggered by our SQL limit)
        await supabaseAdmin.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        
        // Return the specific message from the database exception (or our fallback)
        if (insertError.message.includes('pg2 limit')) {
            return { error: 'you reached your pg2 limit please upgrade' };
        }
        return { error: insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}
