'use client';

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { generators, type Generator } from '@/lib/data';
import { useDoc, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface RentedGenerator {
  id: string; // This is the doc id in firestore
  userId: string;
  generatorId: string;
  name: string;
  rentalTime: any; // Firestore timestamp
  rentalEndTime: any; // Firestore timestamp
  durationDays: number;
  dailyIncome: number;
  icon: string;
  color: string;
  price: number;
}

interface UserProfile {
    balance: number;
    referralCount: number;
    // other user fields
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
  const { firestore, user } = useFirebase();

  const userRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData } = useDoc<UserProfile>(userRef);

  const rentedGeneratorsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'rentedGenerators');
  }, [firestore, user]);
  const { data: rentedGeneratorsData } = useCollection<Omit<RentedGenerator, 'id'>>(rentedGeneratorsRef);

  const balance = userData?.balance ?? 0;
  const referralCount = userData?.referralCount ?? 0;
  const rentedGenerators = rentedGeneratorsData || [];

  const rentGenerator = useCallback((generatorId: string): 'success' | 'insufficient_funds' => {
    const generator = generators.find(g => g.id === generatorId);
    if (!generator || !userRef || !rentedGeneratorsRef || !user) return 'insufficient_funds';
    
    if (balance < generator.price) {
      return 'insufficient_funds';
    }

    updateDocumentNonBlocking(userRef, { balance: balance - generator.price });
    
    const now = Date.now();
    const newRentedGenerator = {
      userId: user.uid,
      generatorId: generator.id,
      name: generator.name,
      rentalTime: serverTimestamp(),
      rentalEndTime: new Date(now + 24 * 60 * 60 * 1000),
      durationDays: generator.duration,
      dailyIncome: generator.dailyIncome,
      icon: generator.icon,
      color: generator.color,
      price: generator.price,
    };

    addDocumentNonBlocking(rentedGeneratorsRef, newRentedGenerator);
    return 'success';
  }, [balance, userRef, rentedGeneratorsRef, user]);


  const collectEarnings = useCallback((rentedGeneratorId: string) => {
    if (!firestore || !user || !userRef) return 'not_ready';
    
    let result: 'collected' | 'not_ready' | 'expired' = 'not_ready';
    
    const generatorToUpdate = rentedGenerators.find(g => g.id === rentedGeneratorId);
    if (!generatorToUpdate) return 'not_ready';

    const now = Date.now();
    const rentalEndTimeMs = generatorToUpdate.rentalEndTime.toDate().getTime();

    if (now < rentalEndTimeMs) {
        result = 'not_ready';
        return result;
    }
    
    updateDocumentNonBlocking(userRef, { balance: balance + generatorToUpdate.dailyIncome });
    
    const rentalTimeMs = generatorToUpdate.rentalTime.toDate().getTime();
    const daysSinceRent = (now - rentalTimeMs) / (1000 * 60 * 60 * 24);

    const generatorDocRef = doc(firestore, 'users', user.uid, 'rentedGenerators', rentedGeneratorId);

    if (daysSinceRent >= generatorToUpdate.durationDays) {
        result = 'expired';
        deleteDocumentNonBlocking(generatorDocRef);
    } else {
        result = 'collected';
        updateDocumentNonBlocking(generatorDocRef, {
            rentalEndTime: new Date(rentalEndTimeMs + (24 * 60 * 60 * 1000))
        });
    }
    
    return result;
  }, [firestore, user, userRef, rentedGenerators, balance]);


   // Auto-rent free generator on first load if it doesn't exist
   useEffect(() => {
    if (rentedGeneratorsData && rentedGeneratorsData.length === 0 && user && rentedGeneratorsRef) {
        const freeGenerator = generators.find(g => g.isFree);
        if (freeGenerator) {
            const isFreeGeneratorRented = rentedGeneratorsData.some(rg => rg.generatorId === freeGenerator.id);
            if (!isFreeGeneratorRented) {
                const now = Date.now();
                const newRentedGenerator = {
                    userId: user.uid,
                    generatorId: freeGenerator.id,
                    name: freeGenerator.name,
                    rentalTime: serverTimestamp(),
                    rentalEndTime: new Date(now + 24 * 60 * 60 * 1000),
                    durationDays: freeGenerator.duration,
                    dailyIncome: freeGenerator.dailyIncome,
                    icon: freeGenerator.icon,
                    color: freeGenerator.color,
                    price: freeGenerator.price,
                };
                addDocumentNonBlocking(rentedGeneratorsRef, newRentedGenerator);
            }
        }
    }
   }, [rentedGeneratorsData, rentedGeneratorsRef, user]);

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
