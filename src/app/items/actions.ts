
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addItem(formData: FormData) {
  const supabase = createClient()
  
  const title = formData.get('title') as string;

  if (!title) {
    return { error: 'Item title cannot be empty' };
  }

  const { error } = await supabase
    .from('items')
    .insert([{ title }]) 

  if (error) {
    console.error('Error adding item:', error.message)
    return { error: error.message }
  }

  revalidatePath('/items')
}

export async function deleteItem(formData: FormData) {
  const supabase = createClient();
  const id = formData.get('id') as string
  
  if (!id) return;

  const { error } = await supabase
    .from('items')
    .delete()
    .match({ id: parseInt(id) })

  if (error) {
    console.error('Error deleting item:', error)
  } else {
    revalidatePath('/items')
  }
}
