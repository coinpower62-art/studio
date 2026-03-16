'use client';

import { generators } from '@/lib/data';
import { GeneratorCard } from './components/generator-card';

export default function PowerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Power Generator Shop</h1>
        <p className="text-muted-foreground">
          Rent generators to increase your daily income.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {generators.filter(g => g.published).map((generator) => (
            <GeneratorCard 
              key={generator.id}
              generator={generator}
            />
          ))}
      </div>
    </div>
  );
}
