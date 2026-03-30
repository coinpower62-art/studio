'use client';
export const runtime = 'edge';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Video, Loader, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function VideoTutorialPage() {
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVideo = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('media')
        .select('url')
        .eq('id', 'tutorial-video')
        .single();
      
      if (data?.url) {
        setVideoUrl(data.url);
      }
      setLoading(false);
    };
    fetchVideo();
  }, []);

  const handleRating = (rate: number) => {
    setRating(rate);
    toast({
      title: "Thank you for your feedback!",
      description: `You rated the tutorial ${rate} out of 5 stars.`,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-4 z-50">
      
      <div className="absolute top-6 left-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-full px-4 h-10">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 text-center">
        
        <div className="mb-8">
          <h1 className="text-3xl font-black text-amber-400">Video Tutorial</h1>
          <p className="text-slate-400 mt-1">How to deposit and start earning.</p>
        </div>

        <div className="aspect-[9/16] w-full bg-slate-800 border-2 border-slate-700 rounded-2xl flex flex-col items-center justify-center shadow-2xl overflow-hidden">
          {loading ? (
            <>
              <Loader className="w-12 h-12 text-slate-600 animate-spin" />
              <p className="text-slate-500 mt-4">Loading video...</p>
            </>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <>
              <Video className="w-16 h-16 text-slate-600 mb-4" />
              <h2 className="text-2xl font-bold text-slate-400">Video Coming Soon</h2>
              <p className="text-slate-500 mt-2">Our team is preparing a helpful tutorial for you.</p>
            </>
          )}
        </div>

        {/* Star Rating Section */}
        <div className="mt-8">
          <p className="text-slate-300 mb-3">Was this tutorial helpful?</p>
          <div className="flex justify-center gap-2">
            {[...Array(5)].map((_, index) => {
              const starValue = index + 1;
              return (
                <Star
                  key={starValue}
                  data-testid={`star-${starValue}`}
                  className={`w-8 h-8 cursor-pointer transition-all duration-200 ${
                    starValue <= (hoverRating || rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-600'
                  }`}
                  onClick={() => handleRating(starValue)}
                  onMouseEnter={() => setHoverRating(starValue)}
                  onMouseLeave={() => setHoverRating(0)}
                />
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
