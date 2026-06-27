'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Authentication required.' };

        const { data: profile } = await supabase.from('profiles').select('balance').eq('id', user.id).single();
        if (!profile) return { error: 'Profile not found.' };

        const { data: gen } = await supabase.from('generators').select('*').eq('id', generatorId).single();
        if (!gen) return { error: 'Generator not found.' };

        // Fetch ALL rentals for this generator. There is no longer a 30-day window.
        // Every rental ever made counts against the lifetime limit permanently.
        const { data: allRentals, error: rentedError } = await supabase
            .from('rented_generators')
            .select('*')
            .eq('user_id', user.id)
            .eq('generator_id', gen.id);
        
        if (rentedError) return { error: rentedError.message };

        const now = new Date().getTime();

        // 1. Count currently running generators
        const activeCount = allRentals?.filter(r => new Date(r.expires_at).getTime() > now).length || 0;

        // 2. Count total rentals ever made (Permanent Lifetime Tracking)
        const totalCount = allRentals?.length || 0;

        const activeLimit = gen.active_limit || 1;
        const lifetimeLimit = gen.lifetime_limit || 1;

        // 3. Enforce Permanent Lifetime Limit
        if (totalCount >= lifetimeLimit) {
            if (gen.id === 'pg2') return { error: 'You have reached your permanent PG2 limit. Please upgrade to a higher plan.' };
            return { error: `Lifetime limit reached for ${gen.name}. This generator is now permanently disconnected for this account.` };
        }

        // 4. Enforce Active Limit (Running at once)
        if (activeCount >= activeLimit) {
            return { error: `You already have ${activeCount} active ${gen.name}(s). Please wait for one to expire.` };
        }

        // 5. Check Balance
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
    } catch (e: any) {
        return { error: e.message || "An unexpected error occurred." };
    }
}
