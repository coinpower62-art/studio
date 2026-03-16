'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { generators } from '@/lib/data';

export interface RentedGenerator {
  id: string;
  generatorId: string;
  name: string;
  rentalTime: number;
  rentalEndTime: number;
  durationDays: number;
  dailyIncome: number;
}

interface UserStoreContextType {
  balance: number;
  referralCount: number;
  rentedGenerators: RentedGenerator[];
  rentGenerator: (generatorId: string) => 'success' | 'insufficient_funds';
  collectEarnings: (rentedGeneratorId: string) => 'collected' | 'not_ready' | 'expired';
}

const UserStoreContext = createContext<UserStoreContextType | undefined>(undefined);

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(100); // Start with some balance for testing
  const [referralCount, setReferralCount] = useState(2); // placeholder
  const [rentedGenerators, setRentedGenerators] = useState<RentedGenerator[]>([]);

  // Auto-rent free generator on first load
  useEffect(() => {
    const freeGenerator = generators.find(g => g.isFree);
    if (freeGenerator && !rentedGenerators.some(rg => rg.generatorId === freeGenerator.id)) {
        const now = Date.now();
        const newRentedGenerator: RentedGenerator = {
            id: `rented-${freeGenerator.id}-${now}`,
            generatorId: freeGenerator.id,
            name: freeGenerator.name,
            rentalTime: now,
            rentalEndTime: now + 24 * 60 * 60 * 1000,
            durationDays: freeGenerator.duration,
            dailyIncome: freeGenerator.dailyIncome,
        };
        setRentedGenerators(prev => [...prev, newRentedGenerator]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const rentGenerator = useCallback((generatorId: string): 'success' | 'insufficient_funds' => {
    const generator = generators.find(g => g.id === generatorId);
    if (!generator) return 'insufficient_funds';
    if (balance < generator.price) {
      return 'insufficient_funds';
    }

    setBalance(prev => prev - generator.price);
    const now = Date.now();
    const newRentedGenerator: RentedGenerator = {
      id: `rented-${generatorId}-${now}`,
      generatorId,
      name: generator.name,
      rentalTime: now,
      rentalEndTime: now + 24 * 60 * 60 * 1000,
      durationDays: generator.duration,
      dailyIncome: generator.dailyIncome,
    };
    setRentedGenerators(prev => [...prev, newRentedGenerator]);
    return 'success';
  }, [balance]);

  const collectEarnings = useCallback((rentedGeneratorId: string) => {
    let result: 'collected' | 'not_ready' | 'expired' = 'not_ready';
    setRentedGenerators(prev => {
        const generatorToUpdate = prev.find(g => g.id === rentedGeneratorId);
        if (!generatorToUpdate) return prev;

        const now = Date.now();
        if (now < generatorToUpdate.rentalEndTime) {
            result = 'not_ready';
            return prev;
        }
        
        setBalance(bal => bal + generatorToUpdate.dailyIncome);
        
        const daysSinceRent = (now - generatorToUpdate.rentalTime) / (1000 * 60 * 60 * 24);
        if (daysSinceRent >= generatorToUpdate.durationDays) {
            result = 'expired';
            return prev.filter(g => g.id !== rentedGeneratorId);
        } else {
            result = 'collected';
            return prev.map(g => 
                g.id === rentedGeneratorId 
                ? { ...g, rentalEndTime: g.rentalEndTime + (24 * 60 * 60 * 1000) } 
                : g
            );
        }
    });
    return result;
  }, []);

  const value = { balance, referralCount, rentedGenerators, rentGenerator, collectEarnings };

  return (
    <UserStoreContext.Provider value={value}>
      {children}
    </UserStoreContext.Provider>
  );
}

export function useUserStore() {
  const context = useContext(UserStoreContext);
  if (context === undefined) {
    throw new Error('useUserStore must be used within a UserStoreProvider');
  }
  return context;
}
