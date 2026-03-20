'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generators as allGenerators } from '@/lib/data';

export async function rentGeneratorAction(generatorId: string): Promise<{ error?: string }> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'You must be logged in to rent a generator.' };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        return { error: 'Could not find your user profile.' };
    }

    const generatorToRent = allGenerators.find(g => g.id === generatorId);
    if (!generatorToRent) {
        return { error: 'Generator not found.' };
    }
    
    // PG1 is free and can only be rented once
    if (generatorToRent.id === 'pg1') {
        const { count, error: countError } = await supabase
            .from('rented_generators')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('generator_id', 'pg1');

        if (countError) {
             return { error: 'Could not verify your existing generators.' };
        }
        if (count && count > 0) {
            return { error: 'You can only have one PG1 Generator active at a time.' };
        }
    }


    if (profile.balance < generatorToRent.price) {
        return { error: 'insufficient_funds' };
    }

    const newBalance = profile.balance - generatorToRent.price;
    const { error: balanceUpdateError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id);

    if (balanceUpdateError) {
        return { error: 'Could not update your balance.' };
    }
    
    const rentedAt = new Date();
    const expiresAt = new Date(rentedAt.getTime() + generatorToRent.expire_days * 24 * 60 * 60 * 1000);

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
        // Rollback balance update
        await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
        return { error: 'Could not rent the generator. Your balance has not been changed.' };
    }
    
    revalidatePath('/dashboard/market');
    revalidatePath('/dashboard/power');
    revalidatePath('/dashboard');
    return {};
}
