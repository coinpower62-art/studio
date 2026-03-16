'use client';

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { generators as allGenerators, type Generator } from '@/lib/data';
import { useDoc, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Timestamp } from 'firebase/firestore';


export interface RentedGenerator {
  id: string; // This is the doc id in firestore
  userId: string;
  generatorId: string;
  name: string;
  rentalTime: Timestamp;
  rentalEndTime: Timestamp;
  durationDays: number;
  dailyIncome: number;
  icon: string;
  color: string;
  price: number;
}

interface UserProfile {
    balance: number;
    referralCode: string;
    referralCount: number;
}

interface UserStoreContextType {
  balance: number;
  referralCode: string;
  referralCount: number;
  rentedGenerators: RentedGenerator[];
  rentGenerator: (generatorId: string) => 'success' | 'insufficient_funds';
  collectEarnings: (rentedInstance: RentedGenerator) => 'collected' | 'not_ready' | 'expired';
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
  const { data: rentedGeneratorsData } = useCollection<RentedGenerator>(rentedGeneratorsRef);

  const balance = userData?.balance ?? 0;
  const referralCode = userData?.referralCode ?? '';
  const referralCount = userData?.referralCount ?? 0;
  const rentedGenerators = rentedGeneratorsData || [];

  const rentGenerator = useCallback((generatorId: string): 'success' | 'insufficient_funds' => {
    const generator = allGenerators.find(g => g.id === generatorId);
    if (!generator || !userRef || !rentedGeneratorsRef || !user) return 'insufficient_funds';
    
    if (balance < generator.price) {
      return 'insufficient_funds';
    }

    updateDocumentNonBlocking(userRef, { balance: balance - generator.price });
    
    const now = new Date();
    const rentalTime = Timestamp.fromDate(now);
    const rentalEndTime = Timestamp.fromDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

    const newRentedGenerator: Omit<RentedGenerator, 'id'> = {
      userId: user.uid,
      generatorId: generator.id,
      name: generator.name,
      rentalTime: rentalTime,
      rentalEndTime: rentalEndTime,
      durationDays: generator.duration,
      dailyIncome: generator.dailyIncome,
      icon: generator.icon,
      color: generator.color,
      price: generator.price,
    };

    addDocumentNonBlocking(rentedGeneratorsRef, newRentedGenerator);
    return 'success';
  }, [balance, userRef, rentedGeneratorsRef, user]);


  const collectEarnings = useCallback((rentedInstance: RentedGenerator) => {
    if (!firestore || !user || !userRef) return 'not_ready';
    
    const now = new Date();
    const rentalEndTimeMs = rentedInstance.rentalEndTime.toDate().getTime();

    if (now.getTime() < rentalEndTimeMs) {
        return 'not_ready';
    }
    
    updateDocumentNonBlocking(userRef, { balance: balance + rentedInstance.dailyIncome });
    
    const rentalTimeMs = rentedInstance.rentalTime.toDate().getTime();
    const daysSinceRent = (now.getTime() - rentalTimeMs) / (1000 * 60 * 60 * 24);

    const generatorDocRef = doc(firestore, 'users', user.uid, 'rentedGenerators', rentedInstance.id);

    if (daysSinceRent >= rentedInstance.durationDays) {
        deleteDocumentNonBlocking(generatorDocRef);
        return 'expired';
    } else {
        const newRentalEndTime = new Date(rentalEndTimeMs + (24 * 60 * 60 * 1000));
        updateDocumentNonBlocking(generatorDocRef, {
            rentalEndTime: Timestamp.fromDate(newRentalEndTime)
        });
        return 'collected';
    }
  }, [firestore, user, userRef, balance]);

  const value = { balance, referralCode, referralCount, rentedGenerators, rentGenerator, collectEarnings };

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
