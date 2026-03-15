import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function GalleryPage() {
  const galleryImages = PlaceHolderImages.filter(img => img.id.startsWith("gallery-"));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Image Gallery</h1>
      <p className="text-muted-foreground">
        A collection of financial and business-related images.
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {galleryImages.map((image) => (
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
