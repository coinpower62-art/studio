'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileUp, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useImageStore } from '@/hooks/use-image-store';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addAboutImage, addGalleryImage } = useImageStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleUploadToAbout = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select an image file to upload.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      addAboutImage({
        id: `uploaded-${Date.now()}`,
        url: dataUrl,
        description: file.name,
      });

      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been sent to the About page.`,
      });

      resetState();
    };
    reader.readAsDataURL(file);
  };
  
  const handleUploadToGallery = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select an image file to upload.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      addGalleryImage({
        id: `uploaded-gallery-${Date.now()}`,
        url: dataUrl,
        description: file.name,
        imageHint: 'custom upload'
      });

      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been sent to the Gallery page.`,
      });
      
      resetState();
    };
    reader.readAsDataURL(file);
  };


  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Upload Room</h1>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Upload an Image</CardTitle>
          <CardDescription>
            Select an image from your device and send it to the About page or the Gallery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="picture">Image File</Label>
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload from PC
                </Button>
                <span className="text-sm text-muted-foreground">
                    {file ? file.name : 'No file selected.'}
                </span>
            </div>
            <Input 
                id="picture" 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                ref={fileInputRef}
                className="hidden" 
            />
          </div>
          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Image Preview:</p>
              <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                <Image src={preview} alt="Image preview" fill className="object-cover" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-4">
            <Button onClick={handleUploadToAbout} disabled={!file} className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              Send to About Page
            </Button>
            <Button onClick={handleUploadToGallery} disabled={!file} className="w-full sm:w-auto">
              <ImageIcon className="mr-2 h-4 w-4" />
              Send to Gallery
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
