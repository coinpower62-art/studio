'use client';

import { generators } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { GeneratorCard } from './components/generator-card';

export default function PowerPage() {
  const generatorImages = PlaceHolderImages.filter(img => img.id.startsWith("generator-"));
  
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Power Generator Shop</h1>
        <p className="text-muted-foreground">
          Rent generators to increase your daily income.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {generators.map((generator, index) => {
          const image = generatorImages.find(img => img.id === `generator-${index + 1}`);
          return (
            <GeneratorCard 
              key={generator.id}
              generator={generator}
              imageUrl={image?.imageUrl || ''}
              imageHint={image?.imageHint || ''}
            />
          );
        })}
      </div>
    </div>
  );
}
