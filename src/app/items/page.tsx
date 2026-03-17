
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addItem, deleteItem } from './actions'

export default async function ItemsPage() {
  const supabase = createClient();
  // 1. Fetch data from Supabase
  const { data: items, error } = await supabase.from('items').select('*')

  if (error) {
    console.error('Error fetching items:', error)
    return <p className="p-8 text-red-500">Error loading items. Check the console for more details.</p>
  }

  // 3. Render the list of items
  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Items from Supabase</h1>
      
      <form action={addItem} className="mb-6 bg-white p-4 rounded-xl shadow-md border flex gap-2">
        <Input
          name="title"
          placeholder="Enter a new item title..."
          className="flex-grow"
          required
        />
        <Button type="submit">Add Item</Button>
      </form>
      
      <div className="bg-white rounded-xl shadow-md border">
        {items && items.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center p-4">
                <span className="text-gray-900 font-medium">{item.title || 'Unnamed Item'}</span>
                <form action={deleteItem}>
                  <input type="hidden" name="id" value={item.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    size="sm"
                    className='bg-red-500 hover:bg-red-600 text-white'
                  >
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-gray-500">No items found in your 'items' table.</p>
        )}
      </div>
    </div>
  )
}
