'use client';

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { generators as allGenerators, type Generator } from '@/lib/data';
import { useDoc, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp, getDocs, query, where, writeBatch, Timestamp, addDoc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface RedeemedCode {
  id: string;
  code: string;
  amount: number;
  createdAt: Timestamp;
}

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

export interface UserProfile {
    balance: number;
    username: string;
    fullName: string;
    country: string;
    referralCode: string;
    referralCount: number;
    referredBy?: string;
}

interface UserStoreContextType {
  balance: number;
  username: string;
  fullName: string;
  country: string;
  referralCode: string;
  referralCount: number;
  rentedGenerators: RentedGenerator[];
  redeemedCodes: RedeemedCode[];
  addRedeemedCode: (code: Omit<RedeemedCode, 'id' | 'createdAt'> & { createdAt: Date }) => void;
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
  
  const redeemedCodesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'redeemedCodes');
  }, [firestore, user]);
  const { data: redeemedCodesData } = useCollection<RedeemedCode>(redeemedCodesRef);

  const balance = userData?.balance ?? 0;
  const username = userData?.username ?? '';
  const fullName = userData?.fullName ?? '';
  const country = userData?.country ?? '';
  const referralCode = userData?.referralCode ?? '';
  const referralCount = userData?.referralCount ?? 0;
  const rentedGenerators = rentedGeneratorsData || [];
  const redeemedCodes = redeemedCodesData || [];

  const addRedeemedCode = useCallback((code: Omit<RedeemedCode, 'id' | 'createdAt'> & { createdAt: Date }) => {
    if (!redeemedCodesRef) return;
    const newCode = {
        ...code,
        createdAt: Timestamp.fromDate(code.createdAt),
    };
    addDocumentNonBlocking(redeemedCodesRef, newCode);
  }, [redeemedCodesRef]);

  const rentGenerator = useCallback((generatorId: string): 'success' | 'insufficient_funds' => {
    if (!firestore || !user || !userRef || !rentedGeneratorsRef ) return 'insufficient_funds';
    const generator = allGenerators.find(g => g.id === generatorId);
    if (!generator) return 'insufficient_funds';
    
    if (balance < generator.price) {
      return 'insufficient_funds';
    }

    const updatedBalance = balance - generator.price;
    updateDocumentNonBlocking(userRef, { balance: updatedBalance });

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
    
    // Handle referral bonus
    if (userData?.referredBy && generator.price > 0) {
      const processReferral = async () => {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where("referralCode", "==", userData.referredBy));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              const referrerData = referrerDoc.data();
              const bonus = generator.price * 0.1; // 10% bonus

              const batch = writeBatch(firestore);
              batch.update(referrerDoc.ref, { 
                  balance: (referrerData.balance || 0) + bonus,
                  referralCount: (referrerData.referralCount || 0) + 1
              });
              
              // Mark referral as processed to prevent duplicate bonuses
              batch.update(userRef, { referredBy: null });

              await batch.commit();
          }
      };
      processReferral().catch(console.error);
    }
    
    return 'success';
  }, [balance, firestore, user, userRef, rentedGeneratorsRef, userData]);


  const collectEarnings = useCallback((rentedInstance: RentedGenerator) => {
    if (!firestore || !user || !userRef) return 'not_ready';
    
    const now = new Date();
    const rentalEndTimeMs = rentedInstance.rentalEndTime.toDate().getTime();

    if (now.getTime() < rentalEndTimeMs) {
        return 'not_ready';
    }
    
    updateDocumentNonBlocking(userRef, { balance: balance + rentedInstance.dailyIncome });
    
    const rentalTimeMs = rentedInstance.rentalTime.toDate().getTime();
    const totalDurationMs = rentedInstance.durationDays * 24 * 60 * 60 * 1000;

    const generatorDocRef = doc(firestore, 'users', user.uid, 'rentedGenerators', rentedInstance.id);

    if (now.getTime() >= rentalTimeMs + totalDurationMs) {
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

  const value = { balance, username, fullName, country, referralCode, referralCount, rentedGenerators, redeemedCodes, addRedeemedCode, rentGenerator, collectEarnings };

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
