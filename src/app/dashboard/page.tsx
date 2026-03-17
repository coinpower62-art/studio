
import { createClient } from '@/lib/supabase/server';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: {
    search?: string;
  };
}) {
  const supabase = createClient();
  const search = searchParams?.search || '';

  let query = supabase.from('items').select('*');
  if (search) {
    query = query.ilike('title', `%${search}%`);
  }
  const { data: items, error } = await query;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 sm:py-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Supabase Items
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            A list of items fetched directly from your Supabase table.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <form className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search by title..."
              defaultValue={search}
              className="pl-9 h-11"
            />
          </div>
          <Button type="submit" className="h-11">Search</Button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        {error && (
          <div className="p-8 text-center">
            <p className="font-semibold text-red-600">Error fetching items</p>
            <p className="text-sm text-muted-foreground mt-2 font-mono">{error.message}</p>
          </div>
        )}

        {!error && items && items.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="p-4">
                <span className="text-gray-800 font-medium">{item.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          !error && (
            <div className="p-8 text-center">
              <p className="font-semibold text-gray-500">No items found</p>
              {search && <p className="text-sm text-muted-foreground mt-1">Try a different search term.</p>}
            </div>
          )
        )}
      </div>
    </div>
  );
}
