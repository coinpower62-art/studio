'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function collectEarnings(rentedGeneratorId: string): Promise<{ success: boolean; message: string; earned?: number; }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: 'Authentication required.' };
  }

  // 1. Fetch the rented generator and its base details
  const { data: rentedGen, error: rentedGenError } = await supabase
    .from('rented_generators')
    .select(`
      *,
      generators ( daily_income )
    `)
    .eq('id', rentedGeneratorId)
    .eq('user_id', user.id)
    .single();

  if (rentedGenError || !rentedGen) {
    console.error("Error fetching rented generator: ", rentedGenError);
    return { success: false, message: 'Rented generator not found.' };
  }
  
  // @ts-ignore
  const dailyIncome = rentedGen.generators?.daily_income;
  if (typeof dailyIncome !== 'number') {
      return { success: false, message: 'Could not determine daily income for this generator.' };
  }

  // 2. Check if it's expired or suspended
  const now = Date.now();
  const expiresAt = new Date(rentedGen.expires_at).getTime();

  if (rentedGen.suspended) {
    return { success: false, message: 'This generator is suspended.' };
  }

  // 3. Calculate periods to claim
  const lastClaimedAt = rentedGen.last_claimed_at ? new Date(rentedGen.last_claimed_at).getTime() : new Date(rentedGen.rented_at).getTime();
  const endOfCollection = Math.min(now, expiresAt);
  
  if (endOfCollection <= lastClaimedAt) {
      return { success: false, message: 'Not time to collect yet.' };
  }

  const periodsReady = Math.floor((endOfCollection - lastClaimedAt) / TWENTY_FOUR_HOURS_MS);

  if (periodsReady < 1) {
    return { success: false, message: 'Not enough time has passed to collect income.' };
  }

  // 4. Calculate total earnings and new last_claimed_at
  const earnedAmount = periodsReady * dailyIncome;
  const newLastClaimedTimestamp = new Date(lastClaimedAt + periodsReady * TWENTY_FOUR_HOURS_MS).toISOString();

  // 5. Fetch user profile to update balance
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { success: false, message: 'User profile not found.' };
  }

  const newBalance = profile.balance + earnedAmount;

  // 6. Perform updates
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', user.id);

  if (balanceError) {
    console.error("Balance update error: ", balanceError);
    return { success: false, message: 'Failed to update balance.' };
  }

  const { error: claimError } = await supabase
    .from('rented_generators')
    .update({ last_claimed_at: newLastClaimedTimestamp })
    .eq('id', rentedGeneratorId);

  if (claimError) {
    console.error("Claim time update error: ", claimError);
    // Attempt to roll back the balance update
    await supabase.from('profiles').update({ balance: profile.balance }).eq('id', user.id);
    return { success: false, message: 'Failed to update claim time. Balance change was reverted.' };
  }

  // 7. Revalidate path and return success
  revalidatePath('/dashboard/power');
  revalidatePath('/dashboard');
  return { success: true, message: `Collected $${earnedAmount.toFixed(2)}!`, earned: earnedAmount };
}
