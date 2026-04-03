import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
      <div className="flex flex-col items-center gap-4">
        <AlertTriangle className="h-16 w-16 text-amber-500" />
        <div>
            <h1 className="text-6xl font-black text-amber-500">404</h1>
            <p className="mt-2 text-2xl font-bold text-gray-800">Page Not Found</p>
        </div>
      </div>
      <p className="mt-4 max-w-sm text-gray-500">
        Oops! The page you are looking for does not exist. It might have been moved or deleted.
      </p>
      <div className="mt-8">
        <Link href="/">
          <Button className="h-12 rounded-full bg-amber-500 px-8 text-base font-bold text-white shadow-lg hover:bg-amber-600">
            Go Back Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
