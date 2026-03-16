'use client';

import { useMemo } from 'react';
import { generators as allGenerators } from '@/lib/data';
import { GeneratorCard } from '../power/components/generator-card';
import { useUserStore } from '@/hooks/use-user-store';

export default function MarketPage() {
  const { rentedGenerators } = useUserStore();

  const availableGenerators = useMemo(() => {
    const rentedGeneratorIds = new Set(rentedGenerators.map(g => g.generatorId));
    return allGenerators.filter(g => !rentedGeneratorIds.has(g.id));
  }, [rentedGenerators]);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Generator Market</h1>
        <p className="text-muted-foreground">
          Rent generators to increase your daily income.
        </p>
      </div>

      {availableGenerators.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {availableGenerators.map((generator) => (
              <GeneratorCard 
                key={generator.id}
                generator={generator}
              />
            ))}
        </div>
      ) : (
        <div className="text-center py-12 px-6 bg-card border rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold">Market is Empty</h3>
            <p className="text-muted-foreground mt-2">
                You have rented all available generators. Check your Power page to manage them.
            </p>
        </div>
      )}
    </div>
  );
}
