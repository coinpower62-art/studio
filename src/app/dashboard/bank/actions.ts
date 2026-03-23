
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDepositRequest(formData: {
  amount: number
  txId: string
  method: string
  country: string
  cardDetails?: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to make a deposit.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Could not find user profile.' }
  }

  const enrichedTxId = formData.cardDetails
    ? `[${formData.method}|${formData.country}] ${formData.cardDetails}`
    : `[${formData.method}|${formData.country}] ${formData.txId}`

  const { error } = await supabase.from('deposit_requests').insert({
    user_id: user.id,
    username: profile.username,
    full_name: profile.full_name,
    amount: formData.amount,
    tx_id: enrichedTxId,
    status: 'pending',
  })

  if (error) {
    console.error('Supabase deposit error:', error)
    return { error: `Database error: ${error.message}` }
  }

  revalidatePath('/dashboard/bank')
  return { success: true }
}

export async function createWithdrawalRequest(formData: {
  amount: number
  method: string
  details: any
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to make a withdrawal.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance, username, full_name, country')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { error: 'Could not find user profile.' }
  }

  if (formData.amount > profile.balance) {
    return { error: 'Insufficient balance.' }
  }

  const fee = formData.amount * 0.15
  const netAmount = formData.amount - fee

  const { error: insertError } = await supabase.from('withdrawal_requests').insert({
    user_id: user.id,
    username: profile.username,
    full_name: profile.full_name,
    country: profile.country,
    method: formData.method,
    amount: formData.amount,
    net_amount: netAmount,
    fee: fee,
    details: JSON.stringify(formData.details),
    status: 'pending',
  })

  if (insertError) {
    console.error('Supabase withdrawal insert error:', insertError)
    return { error: 'Could not create withdrawal request.' }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ balance: profile.balance - formData.amount })
    .eq('id', user.id)

  if (updateError) {
    console.error('Supabase balance update error:', updateError)
    // Here we might want to roll back the withdrawal request, but for now just log it
    return { error: 'Could not update balance.' }
  }

  revalidatePath('/dashboard/bank')
  return { success: true, txId: 'W' + Math.floor(100000 + Math.random() * 900000) };
}

export async function setWithdrawalPin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ has_withdrawal_pin: true })
    .eq('id', user.id)

  if (error) {
    console.error('Supabase set PIN error:', error)
    return { error: 'Could not set PIN status.' }
  }

  revalidatePath('/dashboard/bank')
  return { success: true }
}
