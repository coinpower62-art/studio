'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { useImageStore } from '@/hooks/use-image-store';
import type { UploadedImage } from '@/hooks/use-image-store';
import { Folder } from 'lucide-react';

export default function MyUploadsPage() {
  const { aboutImages, galleryImages } = useImageStore();
  const [allImages, setAllImages] = useState<UploadedImage[]>([]);

  useEffect(() => {
    const combinedImages = [...aboutImages, ...galleryImages];
    const uniqueImages = Array.from(new Map(combinedImages.map(item => [item.id, item])).values());
    setAllImages(uniqueImages);
  }, [aboutImages, galleryImages]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">My Uploads</h1>
      <p className="text-muted-foreground">
        This folder contains all the images you have uploaded during this session. These are not saved permanently.
      </p>
      
      {allImages.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allImages.map((image) => (
            <Card key={image.id} className="overflow-hidden shadow-md">
              <CardContent className="p-0">
                <div className="relative aspect-video">
                  <Image
                    src={image.url}
                    alt={image.description}
                    fill
                    className="object-cover"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-md flex items-center justify-center p-12">
            <div className="text-center text-muted-foreground">
                <Folder className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">No uploads yet</h3>
                <p className="mt-2 text-sm">
                    Images you upload from the 'Upload Room' will appear here.
                </p>
            </div>
        </Card>
      )}
    </div>
  );
}
