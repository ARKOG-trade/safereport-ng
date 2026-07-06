/**
 * Report Assignment Engine
 * 
 * Manages report assignments with atomic locking to prevent race conditions.
 * Supports dispatcher queue ownership and escalation logic.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { DomainEventPublisher, EventType, createDomainEvent, ReportAssignedEvent } from '@/lib/domainEvents';

export interface AssignmentLock {
  reportId: string;
  lockedBy: string; // Dispatcher UID
  lockedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface QueueOwnership {
  queueId: string;
  ownedBy: string; // Dispatcher UID
  ownedAt: Timestamp;
  expiresAt: Timestamp;
}

export interface AssignmentConfig {
  maxAssignmentAttempts: number;
  lockDurationSeconds: number;
  queueOwnershipDurationSeconds: number;
  escalationThresholdMinutes: number;
}

const DEFAULT_CONFIG: AssignmentConfig = {
  maxAssignmentAttempts: 3,
  lockDurationSeconds: 30,
  queueOwnershipDurationSeconds: 300, // 5 minutes
  escalationThresholdMinutes: 60,
};

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Acquire an atomic lock on a report
 */
export async function acquireAssignmentLock(
  reportId: string,
  dispatcherUid: string,
  config: AssignmentConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const lockRef = doc(db, 'assignmentLocks', reportId);
    const lockDoc = await getDoc(lockRef);

    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + config.lockDurationSeconds, now.nanoseconds);

    if (lockDoc.exists()) {
      const existingLock = lockDoc.data() as AssignmentLock;
      // Check if lock has expired
      if (existingLock.expiresAt.toDate() > now.toDate()) {
        // Lock is still active
        return false;
      }
    }

    // Acquire the lock
    const lock: AssignmentLock = {
      reportId,
      lockedBy: dispatcherUid,
      lockedAt: now,
      expiresAt,
    };

    await setDoc(lockRef, lock);
    return true;
  } catch (error) {
    console.error('Error acquiring assignment lock:', error);
    return false;
  }
}

/**
 * Release an assignment lock
 */
export async function releaseAssignmentLock(reportId: string, dispatcherUid: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const lockRef = doc(db, 'assignmentLocks', reportId);
    const lockDoc = await getDoc(lockRef);

    if (!lockDoc.exists()) {
      return true; // Lock doesn't exist, consider it released
    }

    const lock = lockDoc.data() as AssignmentLock;
    if (lock.lockedBy !== dispatcherUid) {
      return false; // Lock is held by someone else
    }

    // Delete the lock
    await updateDoc(lockRef, {
      expiresAt: Timestamp.now(), // Expire immediately
    });

    return true;
  } catch (error) {
    console.error('Error releasing assignment lock:', error);
    return false;
  }
}

/**
 * Assign a report to a unit
 */
export async function assignReport(
  reportId: string,
  unitId: string,
  dispatcherUid: string,
  organizationId: string,
  branchId: string,
  reason?: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  config: AssignmentConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Acquire lock
    const lockAcquired = await acquireAssignmentLock(reportId, dispatcherUid, config);
    if (!lockAcquired) {
      throw new Error('Could not acquire assignment lock');
    }

    try {
      // Get the report
      const reportRef = doc(db, 'reports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const reportData = reportDoc.data();
      const caseNumber = reportData.caseNumber || reportId;

      // Get the unit
      const unitRef = doc(db, 'units', unitId);
      const unitDoc = await getDoc(unitRef);

      if (!unitDoc.exists()) {
        throw new Error('Unit not found');
      }

      const unitData = unitDoc.data();

      // Update report with assignment
      const now = Timestamp.now();
      await updateDoc(reportRef, {
        status: 'assigned',
        organizationId,
        branchId,
        unitId,
        assignedAt: now,
        assignedBy: dispatcherUid,
        priority,
        updatedAt: now,
      });

      // Create domain event
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent<ReportAssignedEvent>(
        EventType.REPORT_ASSIGNED,
        dispatcherUid,
        reportId,
        organizationId,
        {
          caseNumber,
          assignedToUnitId: unitId,
          assignedToUnitName: unitData.name,
          reason,
          priority,
        },
        branchId,
        unitId
      );

      await eventPublisher.publish(event);

      return true;
    } finally {
      // Release lock
      await releaseAssignmentLock(reportId, dispatcherUid);
    }
  } catch (error) {
    console.error('Error assigning report:', error);
    return false;
  }
}

/**
 * Reassign a report to a different unit
 */
export async function reassignReport(
  reportId: string,
  toUnitId: string,
  dispatcherUid: string,
  reason: string,
  config: AssignmentConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Acquire lock
    const lockAcquired = await acquireAssignmentLock(reportId, dispatcherUid, config);
    if (!lockAcquired) {
      throw new Error('Could not acquire assignment lock');
    }

    try {
      // Get the report
      const reportRef = doc(db, 'reports', reportId);
      const reportDoc = await getDoc(reportRef);

      if (!reportDoc.exists()) {
        throw new Error('Report not found');
      }

      const reportData = reportDoc.data();
      const caseNumber = reportData.caseNumber || reportId;
      const fromUnitId = reportData.unitId;
      const organizationId = reportData.organizationId;
      const branchId = reportData.branchId;

      // Get the from unit
      const fromUnitRef = doc(db, 'units', fromUnitId);
      const fromUnitDoc = await getDoc(fromUnitRef);
      const fromUnitName = fromUnitDoc.exists() ? fromUnitDoc.data().name : 'Unknown';

      // Get the to unit
      const toUnitRef = doc(db, 'units', toUnitId);
      const toUnitDoc = await getDoc(toUnitRef);

      if (!toUnitDoc.exists()) {
        throw new Error('Target unit not found');
      }

      const toUnitName = toUnitDoc.data().name;

      // Update report with reassignment
      const now = Timestamp.now();
      await updateDoc(reportRef, {
        unitId: toUnitId,
        reassignedAt: now,
        reassignedBy: dispatcherUid,
        updatedAt: now,
      });

      // Create domain event
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.REPORT_REASSIGNED,
        dispatcherUid,
        reportId,
        organizationId,
        {
          caseNumber,
          fromUnitId,
          fromUnitName,
          toUnitId,
          toUnitName,
          reason,
        },
        branchId,
        toUnitId
      );

      await eventPublisher.publish(event);

      return true;
    } finally {
      // Release lock
      await releaseAssignmentLock(reportId, dispatcherUid);
    }
  } catch (error) {
    console.error('Error reassigning report:', error);
    return false;
  }
}

/**
 * Acquire queue ownership for a dispatcher
 */
export async function acquireQueueOwnership(
  queueId: string,
  dispatcherUid: string,
  config: AssignmentConfig = DEFAULT_CONFIG
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const ownershipRef = doc(db, 'queueOwnerships', queueId);
    const ownershipDoc = await getDoc(ownershipRef);

    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + config.queueOwnershipDurationSeconds, now.nanoseconds);

    if (ownershipDoc.exists()) {
      const existingOwnership = ownershipDoc.data() as QueueOwnership;
      // Check if ownership has expired
      if (existingOwnership.expiresAt.toDate() > now.toDate()) {
        // Ownership is still active
        return false;
      }
    }

    // Acquire ownership
    const ownership: QueueOwnership = {
      queueId,
      ownedBy: dispatcherUid,
      ownedAt: now,
      expiresAt,
    };

    await setDoc(ownershipRef, ownership);
    return true;
  } catch (error) {
    console.error('Error acquiring queue ownership:', error);
    return false;
  }
}

/**
 * Release queue ownership
 */
export async function releaseQueueOwnership(queueId: string, dispatcherUid: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const ownershipRef = doc(db, 'queueOwnerships', queueId);
    const ownershipDoc = await getDoc(ownershipRef);

    if (!ownershipDoc.exists()) {
      return true; // Ownership doesn't exist
    }

    const ownership = ownershipDoc.data() as QueueOwnership;
    if (ownership.ownedBy !== dispatcherUid) {
      return false; // Ownership is held by someone else
    }

    // Delete the ownership
    await updateDoc(ownershipRef, {
      expiresAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Error releasing queue ownership:', error);
    return false;
  }
}

/**
 * Get queue owner (if any)
 */
export async function getQueueOwner(queueId: string): Promise<string | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const ownershipRef = doc(db, 'queueOwnerships', queueId);
    const ownershipDoc = await getDoc(ownershipRef);

    if (!ownershipDoc.exists()) {
      return null;
    }

    const ownership = ownershipDoc.data() as QueueOwnership;
    const now = Timestamp.now();

    // Check if ownership has expired
    if (ownership.expiresAt.toDate() < now.toDate()) {
      return null;
    }

    return ownership.ownedBy;
  } catch (error) {
    console.error('Error getting queue owner:', error);
    return null;
  }
}

/**
 * AI Assignment Hook (Version 1: Returns null)
 */
export async function recommendAssignment(): Promise<string | null> {
  try {
    // Version 1: No AI recommendation
    // In future versions, this will integrate with ML models
    // to recommend the best unit for assignment based on:
    // - Report category
    // - Unit workload
    // - Unit specialization
    // - SLA targets
    // - Historical performance

    return null;
  } catch (error) {
    console.error('Error getting assignment recommendation:', error);
    return null;
  }
}
