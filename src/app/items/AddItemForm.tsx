import { addItem } from '@/app/items/actions'

export default function AddItemForm() {
  return (
    <form action={addItem} className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md border mb-6">
      <h2 className="text-xl font-bold text-gray-800">Add New Item</h2>
      
      <input 
        name="title" 
        placeholder="Enter item title..." 
        required 
        className="border p-2 rounded text-black"
      />

      <button 
        type="submit" 
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
      >
        Add to Supabase
      </button>
    </form>
  )
}
