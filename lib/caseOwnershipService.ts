/**
 * Case Ownership Transfer History Service
 * 
 * Tracks all ownership transfers for a report, including who owned it, when, and why.
 * Provides complete audit trail of case ownership changes.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

export interface OwnershipTransfer {
  id: string;
  reportId: string;
  previousOwnerId?: string; // UID of previous owner (null if first assignment)
  previousOwnerName?: string;
  newOwnerId: string; // UID of new owner
  newOwnerName: string;
  reason: string; // Why the transfer occurred
  timestamp: Timestamp;
  createdAt: Timestamp;
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Record a case ownership transfer
 */
export async function recordOwnershipTransfer(
  reportId: string,
  previousOwnerId: string | undefined,
  previousOwnerName: string | undefined,
  newOwnerId: string,
  newOwnerName: string,
  reason: string
): Promise<string | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const transferRef = doc(collection(db, 'ownershipTransfers'));
    const now = Timestamp.now();

    const transfer: Omit<OwnershipTransfer, 'id'> = {
      reportId,
      previousOwnerId,
      previousOwnerName,
      newOwnerId,
      newOwnerName,
      reason,
      timestamp: now,
      createdAt: now,
    };

    await setDoc(transferRef, transfer);
    return transferRef.id;
  } catch (error) {
    console.error('Error recording ownership transfer:', error);
    return null;
  }
}

/**
 * Get ownership transfer history for a report
 */
export async function getOwnershipTransferHistory(reportId: string): Promise<OwnershipTransfer[]> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }

    const transferQuery = query(
      collection(db, 'ownershipTransfers'),
      where('reportId', '==', reportId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(transferQuery);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as OwnershipTransfer));
  } catch (error) {
    console.error('Error getting ownership transfer history:', error);
    return [];
  }
}

/**
 * Get current owner of a report
 */
export async function getCurrentOwner(reportId: string): Promise<{ ownerId: string; ownerName: string } | null> {
  try {
    const history = await getOwnershipTransferHistory(reportId);

    if (history.length === 0) {
      return null;
    }

    const latestTransfer = history[history.length - 1];
    return {
      ownerId: latestTransfer.newOwnerId,
      ownerName: latestTransfer.newOwnerName,
    };
  } catch (error) {
    console.error('Error getting current owner:', error);
    return null;
  }
}

/**
 * Get ownership transfer statistics for a report
 */
export async function getOwnershipStatistics(reportId: string): Promise<{
  totalTransfers: number;
  uniqueOwners: Set<string>;
  firstOwner?: { ownerId: string; ownerName: string };
  currentOwner?: { ownerId: string; ownerName: string };
  averageOwnershipDuration?: number; // Minutes
}> {
  try {
    const history = await getOwnershipTransferHistory(reportId);

    if (history.length === 0) {
      return {
        totalTransfers: 0,
        uniqueOwners: new Set(),
      };
    }

    const uniqueOwners = new Set<string>();
    let totalDuration = 0;

    for (const transfer of history) {
      uniqueOwners.add(transfer.newOwnerId);
    }

    // Calculate average ownership duration
    for (let i = 0; i < history.length - 1; i++) {
      const currentTransfer = history[i];
      const nextTransfer = history[i + 1];
      const duration = Math.floor(
        (nextTransfer.timestamp.toDate().getTime() - currentTransfer.timestamp.toDate().getTime()) / (1000 * 60)
      );
      totalDuration += duration;
    }

    const averageOwnershipDuration = history.length > 1 ? Math.round(totalDuration / (history.length - 1)) : 0;

    return {
      totalTransfers: history.length,
      uniqueOwners,
      firstOwner: {
        ownerId: history[0].newOwnerId,
        ownerName: history[0].newOwnerName,
      },
      currentOwner: {
        ownerId: history[history.length - 1].newOwnerId,
        ownerName: history[history.length - 1].newOwnerName,
      },
      averageOwnershipDuration,
    };
  } catch (error) {
    console.error('Error getting ownership statistics:', error);
    return {
      totalTransfers: 0,
      uniqueOwners: new Set(),
    };
  }
}
