
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

    // 1. Check Balance first
    if (profile.balance < gen.price) return { error: 'insufficient_funds' };

    const supabaseAdmin = createAdminClient();

    // 2. Deduct Balance
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ balance: profile.balance - gen.price })
        .eq('id', user.id);
        
    if (updateError) return { error: "Failed to update balance." };
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + gen.expire_days * 24 * 60 * 60 * 1000);

    // 3. Record Rental (This will trigger the SQL constraint we added)
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
        
        // Check if it's the specific PG2 limit error from the DB
        if (insertError.message.includes('you reached your pg2 limit please upgrade')) {
            return { error: 'you reached your pg2 limit please upgrade' };
        }
        return { error: insertError.message };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    return {};
}
