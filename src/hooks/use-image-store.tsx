'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface UploadedImage {
  id: string;
  url: string;
  description: string;
}

interface UploadedGalleryImage extends UploadedImage {
  imageHint: string;
}

interface ImageStoreContextType {
  aboutImages: UploadedImage[];
  galleryImages: UploadedGalleryImage[];
  addAboutImage: (image: UploadedImage) => void;
  addGalleryImage: (image: UploadedGalleryImage) => void;
}

const ImageStoreContext = createContext<ImageStoreContextType | undefined>(undefined);

export function ImageStoreProvider({ children }: { children: ReactNode }) {
  const [aboutImages, setAboutImages] = useState<UploadedImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<UploadedGalleryImage[]>([]);

  const addAboutImage = (image: UploadedImage) => {
    setAboutImages((prev) => [image, ...prev]);
  };

  const addGalleryImage = (image: UploadedGalleryImage) => {
    setGalleryImages((prev) => [image, ...prev]);
  };

  return (
    <ImageStoreContext.Provider value={{ aboutImages, galleryImages, addAboutImage, addGalleryImage }}>
      {children}
    </ImageStoreContext.Provider>
  );
}

export function useImageStore() {
  const context = useContext(ImageStoreContext);
  if (context === undefined) {
    throw new Error('useImageStore must be used within an ImageStoreProvider');
  }
  return context;
}
