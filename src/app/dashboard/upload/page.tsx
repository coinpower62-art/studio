'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Upload } from 'lucide-react';
import Image from 'next/image';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = () => {
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
      const storedImages = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
      storedImages.push({
        id: `uploaded-${Date.now()}`,
        url: dataUrl,
        description: file.name,
      });
      localStorage.setItem('uploadedImages', JSON.stringify(storedImages));

      toast({
        title: 'Image Uploaded',
        description: `${file.name} has been sent to the About page.`,
      });

      // Reset state
      setFile(null);
      setPreview(null);
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
            Select an image from your device to send to the About page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2">
            <FormLabel>Image File</FormLabel>
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} className="w-full sm:w-auto" />
          </div>
          {preview && (
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Image Preview:</p>
              <div className="relative aspect-video w-full max-w-sm rounded-md overflow-hidden border">
                <Image src={preview} alt="Image preview" fill className="object-cover" />
              </div>
            </div>
          )}
          <Button onClick={handleUpload} disabled={!file} className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Send to About Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
