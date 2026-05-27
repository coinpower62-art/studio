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

    // SPECIFIC REQUIREMENT: Check if PG2 has been rented exactly 2 times already
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

    // General limit for other generators (if applicable)
    if (generatorId === 'pg1') {
        const { count: pg1Count } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg1');
        
        if (pg1Count !== null && pg1Count >= 1) {
            return { error: 'You have reached the limit for this free trial.' };
        }
    }

    // Check Balance first to avoid unnecessary DB triggers
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
        // Rollback balance if insert fails (e.g. triggered by SQL exception)
        await supabaseAdmin.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        
        // Return the specific message from the database
        return { error: insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}