'use client';

import { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { generators as allGenerators, type Generator } from '@/lib/data';
import { useDoc, useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp, getDocs, query, where, writeBatch, Timestamp } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export interface RedeemedCode {
  id: string;
  code: string;
  amount: number;
  createdAt: Timestamp;
}

export interface RentedGenerator {
  id: string; 
  userId: string;
  generatorId: string;
  name: string;
  rentedAt: Timestamp;
  expiresAt: Timestamp;
  expireDays: number;
  dailyIncome: number;
  icon: string;
  color: string;
  price: number;
  lastClaimed: Timestamp | null;
  suspended: boolean;
}

export interface UserProfile {
    balance: number;
    username: string;
    fullName: string;
    country: string;
    referralCode: string;
    referralCount: number;
    referredBy?: string;
    hasWithdrawalPin?: boolean;
}

interface UserStoreContextType {
  balance: number;
  username: string;
  fullName: string;
  country: string;
  referralCode: string;
  referralCount: number;
  hasWithdrawalPin?: boolean;
  rentedGenerators: RentedGenerator[];
  isRentedGeneratorsLoading: boolean;
  redeemedCodes: RedeemedCode[];
  addRedeemedCode: (code: Omit<RedeemedCode, 'id' | 'createdAt'> & { createdAt: Date }) => void;
  rentGenerator: (generatorId: string) => 'success' | 'insufficient_funds';
  collectEarnings: (rentedInstanceId: string) => { status: 'success', earned: number } | { status: 'error', message: string };
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
  const { data: rentedGeneratorsData, isLoading: isRentedGeneratorsLoading } = useCollection<RentedGenerator>(rentedGeneratorsRef);
  
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
  const hasWithdrawalPin = userData?.hasWithdrawalPin;
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
    const rentedAt = Timestamp.fromDate(now);
    const expiresAt = Timestamp.fromDate(new Date(now.getTime() + generator.expireDays * 24 * 60 * 60 * 1000));

    const newRentedGenerator: Omit<RentedGenerator, 'id'> = {
      userId: user.uid,
      generatorId: generator.id,
      name: generator.name,
      rentedAt: rentedAt,
      expiresAt: expiresAt,
      expireDays: generator.expireDays,
      dailyIncome: generator.dailyIncome,
      icon: generator.icon,
      color: generator.color,
      price: generator.price,
      lastClaimed: null,
      suspended: false,
    };

    addDocumentNonBlocking(rentedGeneratorsRef, newRentedGenerator);
    
    if (userData?.referredBy && generator.price > 0) {
      const processReferral = async () => {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where("referralCode", "==", userData.referredBy));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
              const referrerDoc = querySnapshot.docs[0];
              const referrerData = referrerDoc.data();
              const bonus = generator.price * 0.1;

              const batch = writeBatch(firestore);
              batch.update(referrerDoc.ref, { 
                  balance: (referrerData.balance || 0) + bonus,
                  referralCount: (referrerData.referralCount || 0) + 1
              });
              
              batch.update(userRef, { referredBy: null });

              await batch.commit();
          }
      };
      processReferral().catch(console.error);
    }
    
    return 'success';
  }, [balance, firestore, user, userRef, rentedGeneratorsRef, userData]);


  const collectEarnings = useCallback((rentedInstanceId: string) => {
    if (!firestore || !user || !userRef) return { status: 'error' as const, message: 'Auth not ready' };
    
    const rentedInstance = rentedGenerators.find(g => g.id === rentedInstanceId);
    if (!rentedInstance) return { status: 'error' as const, message: 'Generator not found' };

    const now = Date.now();
    const isExpired = rentedInstance.expiresAt.toMillis() <= now;
    if (isExpired) return { status: 'error' as const, message: 'Generator has expired' };
    
    if (rentedInstance.suspended) return { status: 'error' as const, message: 'Generator is suspended' };

    const lastRef = rentedInstance.lastClaimed ? rentedInstance.lastClaimed.toMillis() : rentedInstance.rentedAt.toMillis();
    const periodsReady = Math.floor((now - lastRef) / (24 * 60 * 60 * 1000));

    if (periodsReady <= 0) {
        return { status: 'error' as const, message: 'Not ready to collect' };
    }

    const earnedAmount = periodsReady * rentedInstance.dailyIncome;
    const newLastClaimed = new Date(lastRef + periodsReady * (24 * 60 * 60 * 1000));

    const generatorDocRef = doc(firestore, 'users', user.uid, 'rentedGenerators', rentedInstance.id);
    
    updateDocumentNonBlocking(userRef, { balance: balance + earnedAmount });
    updateDocumentNonBlocking(generatorDocRef, { lastClaimed: Timestamp.fromDate(newLastClaimed) });

    return { status: 'success' as const, earned: earnedAmount };
  }, [firestore, user, userRef, balance, rentedGenerators]);

  const value = { balance, username, fullName, country, referralCode, referralCount, hasWithdrawalPin, rentedGenerators, isRentedGeneratorsLoading, redeemedCodes, addRedeemedCode, rentGenerator, collectEarnings };

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
