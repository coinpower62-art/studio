'use client';

import { useUserStore } from '@/hooks/use-user-store';
import { GeneratorCard } from './components/generator-card';
import { generators as allGenerators } from '@/lib/data';

export default function PowerPage() {
    const { rentedGenerators } = useUserStore();

    const getGeneratorDetails = (rentedInstance: any) => {
        return allGenerators.find(g => g.id === rentedInstance.generatorId);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-primary">Your Power Generators</h1>
                <p className="text-muted-foreground">
                    Here are your currently rented generators, earning you daily income.
                </p>
            </div>

            {rentedGenerators.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {rentedGenerators.map((rentedInstance) => {
                        const generatorDetails = getGeneratorDetails(rentedInstance);
                        return generatorDetails ? (
                            <GeneratorCard 
                                key={rentedInstance.id}
                                generator={generatorDetails}
                                rentedInstance={rentedInstance}
                            />
                        ) : null;
                    })}
                </div>
            ) : (
                <div className="text-center py-12 px-6 bg-card border rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold">No Generators Rented</h3>
                    <p className="text-muted-foreground mt-2">
                        You haven't rented any power generators yet. Visit the Market to get started.
                    </p>
                </div>
            )}
        </div>
    );
}
