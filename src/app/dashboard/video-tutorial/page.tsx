
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VideoTutorialPage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-4 z-50">
      
      <div className="absolute top-6 left-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full px-4 h-10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="w-full max-w-4xl animate-in fade-in zoom-in-95 text-center">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-amber-400">Video Tutorial</h1>
          <p className="text-slate-400 mt-1">How to deposit and start earning.</p>
        </div>

        <div className="aspect-video w-full bg-slate-800 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center shadow-2xl">
          <Video className="w-16 h-16 text-slate-600 mb-4" />
          <h2 className="text-2xl font-bold text-slate-400">Video Coming Soon</h2>
          <p className="text-slate-500 mt-2">Our team is preparing a helpful tutorial for you.</p>
        </div>
      </div>
    </div>
  );
}
