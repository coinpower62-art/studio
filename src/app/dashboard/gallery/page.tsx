'use client';

import { useEffect, useState } from 'react';
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages, type ImagePlaceholder } from "@/lib/placeholder-images";

interface UploadedGalleryImage {
  id: string;
  url: string;
  description: string;
  imageHint: string;
}

// Unified type for all gallery images
type GalleryImage = {
  id: string;
  imageUrl: string;
  description: string;
  imageHint: string;
}

export default function GalleryPage() {
  const [allImages, setAllImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    // Initial images from placeholders
    const placeholderGalleryImages: GalleryImage[] = PlaceHolderImages
      .filter(img => img.id.startsWith("gallery-"));

    const loadImages = () => {
      // Images from localStorage
      const storedImagesData = localStorage.getItem('uploadedGalleryImages');
      const storedImages: UploadedGalleryImage[] = storedImagesData ? JSON.parse(storedImagesData) : [];
      const uploadedImages: GalleryImage[] = storedImages.map(img => ({
          id: img.id,
          imageUrl: img.url, // map url to imageUrl
          description: img.description,
          imageHint: img.imageHint,
      }));

      // Combine and set, reversing uploaded to show newest first
      setAllImages([...placeholderGalleryImages, ...uploadedImages.reverse()]);
    }
    
    loadImages();

    // Listen for changes from other tabs
    window.addEventListener('storage', loadImages);

    return () => {
        window.removeEventListener('storage', loadImages);
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
      <p className="text-muted-foreground">
        A collection of financial and business-related images, including your uploads.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {allImages.map((image) => (
          <Card key={image.id} className="overflow-hidden shadow-md">
            <CardContent className="p-0">
              <div className="relative aspect-video">
                <Image
                  src={image.imageUrl}
                  alt={image.description}
                  fill
                  className="object-cover"
                  data-ai-hint={image.imageHint}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
