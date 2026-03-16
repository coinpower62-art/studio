'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { generators as allGenerators } from '@/lib/data';
import { GeneratorCard } from '../power/components/generator-card';
import { useUserStore } from '@/hooks/use-user-store';

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

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
        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {availableGenerators.map((generator) => (
              <motion.div key={generator.id} variants={itemVariants}>
                <GeneratorCard 
                  generator={generator}
                />
              </motion.div>
            ))}
        </motion.div>
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
