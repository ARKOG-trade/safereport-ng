/**
 * SLA Engine Architecture
 * 
 * Manages Service Level Agreements for reports.
 * Tracks SLA compliance, breaches, and clearances.
 * Configuration-driven to support different SLA policies per organization/unit.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { DomainEventPublisher, EventType, createDomainEvent } from '@/lib/domainEvents';

/**
 * SLA Policy Configuration
 */
export interface SLAPolicy {
  id: string;
  name: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  // Response time: Time to assign the report
  responseTimeMinutes: number;
  // Resolution time: Time to resolve the report
  resolutionTimeMinutes: number;
  // Priority-based overrides
  priorityMultipliers: {
    low: number; // 1.5x
    medium: number; // 1.0x
    high: number; // 0.75x
    critical: number; // 0.5x
  };
  // Escalation rules
  escalationRules: {
    afterMinutes: number;
    escalateToUnitId: string;
  }[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * SLA Tracker for a Report
 */
export interface SLATracker {
  reportId: string;
  policyId: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  // Timestamps
  submittedAt: Timestamp;
  assignedAt?: Timestamp;
  resolvedAt?: Timestamp;
  // SLA targets
  responseDeadline: Timestamp;
  resolutionDeadline: Timestamp;
  // Breach tracking
  responseBreached: boolean;
  responseBreachedAt?: Timestamp;
  resolutionBreached: boolean;
  resolutionBreachedAt?: Timestamp;
  // Clearance tracking
  responseCleared: boolean;
  resolutionCleared: boolean;
  // Current status
  status: 'pending' | 'breached' | 'cleared' | 'resolved';
  updatedAt: Timestamp;
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Create a default SLA policy for an organization
 */
export async function createDefaultSLAPolicy(
  organizationId: string,
  responseTimeMinutes: number = 60,
  resolutionTimeMinutes: number = 1440 // 24 hours
): Promise<string> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const policyRef = doc(collection(db, 'slaPolicies'));
    const now = Timestamp.now();

    const policy: Omit<SLAPolicy, 'id'> = {
      name: `Default SLA Policy - ${organizationId}`,
      organizationId,
      responseTimeMinutes,
      resolutionTimeMinutes,
      priorityMultipliers: {
        low: 1.5,
        medium: 1.0,
        high: 0.75,
        critical: 0.5,
      },
      escalationRules: [],
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(policyRef, policy);
    return policyRef.id;
  } catch (error) {
    console.error('Error creating SLA policy:', error);
    throw error;
  }
}

/**
 * Get SLA policy for a unit
 */
export async function getSLAPolicy(unitId: string): Promise<SLAPolicy | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return null;
    }

    // First, try to get unit-specific policy
    const unitPolicyQuery = query(
      collection(db, 'slaPolicies'),
      where('unitId', '==', unitId),
      where('active', '==', true)
    );

    const unitPolicySnapshot = await getDocs(unitPolicyQuery);
    if (unitPolicySnapshot.docs.length > 0) {
      return {
        id: unitPolicySnapshot.docs[0].id,
        ...unitPolicySnapshot.docs[0].data(),
      } as SLAPolicy;
    }

    // If no unit-specific policy, get the default
    // This would require fetching the unit to get its branch and organization
    return null;
  } catch (error) {
    console.error('Error getting SLA policy:', error);
    return null;
  }
}

/**
 * Initialize SLA tracking for a report
 */
export async function initializeSLATracking(
  reportId: string,
  organizationId: string,
  branchId: string,
  unitId: string,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Get SLA policy
    const policy = await getSLAPolicy(unitId);
    if (!policy) {
      console.warn('No SLA policy found for unit:', unitId);
      return false;
    }

    // Calculate deadlines with priority multiplier
    const multiplier = policy.priorityMultipliers[priority] || 1.0;
    const now = Timestamp.now();
    const responseDeadlineSeconds = Math.floor(policy.responseTimeMinutes * 60 * multiplier);
    const resolutionDeadlineSeconds = Math.floor(policy.resolutionTimeMinutes * 60 * multiplier);

    const responseDeadline = new Timestamp(
      now.seconds + responseDeadlineSeconds,
      now.nanoseconds
    );
    const resolutionDeadline = new Timestamp(
      now.seconds + resolutionDeadlineSeconds,
      now.nanoseconds
    );

    // Create SLA tracker
    const trackerRef = doc(db, 'slaTrackers', reportId);
    const tracker: SLATracker = {
      reportId,
      policyId: policy.id,
      organizationId,
      branchId,
      unitId,
      submittedAt: now,
      responseDeadline,
      resolutionDeadline,
      responseBreached: false,
      resolutionBreached: false,
      responseCleared: false,
      resolutionCleared: false,
      status: 'pending',
      updatedAt: now,
    };

    await setDoc(trackerRef, tracker);
    return true;
  } catch (error) {
    console.error('Error initializing SLA tracking:', error);
    return false;
  }
}

/**
 * Update SLA tracker when report is assigned
 */
export async function updateSLAOnAssignment(reportId: string, dispatcherUid: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const trackerRef = doc(db, 'slaTrackers', reportId);
    const trackerDoc = await getDoc(trackerRef);

    if (!trackerDoc.exists()) {
      return false;
    }

    const tracker = trackerDoc.data() as SLATracker;
    const now = Timestamp.now();

    // Check if response deadline has been breached
    const responseBreached = now.toDate() > tracker.responseDeadline.toDate();

    await updateDoc(trackerRef, {
      assignedAt: now,
      responseBreached,
      responseBreachedAt: responseBreached ? now : tracker.responseBreachedAt,
      status: responseBreached ? 'breached' : tracker.status,
      updatedAt: now,
    });

    // Publish event if breached
    if (responseBreached && !tracker.responseBreached) {
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.SLA_BREACHED,
        dispatcherUid,
        reportId,
        tracker.organizationId,
        {
          breachType: 'response',
          deadline: tracker.responseDeadline,
        },
        tracker.branchId,
        tracker.unitId
      );
      await eventPublisher.publish(event);
    }

    return true;
  } catch (error) {
    console.error('Error updating SLA on assignment:', error);
    return false;
  }
}

/**
 * Update SLA tracker when report is resolved
 */
export async function updateSLAOnResolution(reportId: string, dispatcherUid: string): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const trackerRef = doc(db, 'slaTrackers', reportId);
    const trackerDoc = await getDoc(trackerRef);

    if (!trackerDoc.exists()) {
      return false;
    }

    const tracker = trackerDoc.data() as SLATracker;
    const now = Timestamp.now();

    // Check if resolution deadline has been breached
    const resolutionBreached = now.toDate() > tracker.resolutionDeadline.toDate();

    await updateDoc(trackerRef, {
      resolvedAt: now,
      resolutionBreached,
      resolutionBreachedAt: resolutionBreached ? now : tracker.resolutionBreachedAt,
      resolutionCleared: !resolutionBreached,
      status: resolutionBreached ? 'breached' : 'resolved',
      updatedAt: now,
    });

    // Publish event
    if (resolutionBreached && !tracker.resolutionBreached) {
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.SLA_BREACHED,
        dispatcherUid,
        reportId,
        tracker.organizationId,
        {
          breachType: 'resolution',
          deadline: tracker.resolutionDeadline,
        },
        tracker.branchId,
        tracker.unitId
      );
      await eventPublisher.publish(event);
    } else if (!resolutionBreached && tracker.resolutionCleared) {
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.SLA_CLEARED,
        dispatcherUid,
        reportId,
        tracker.organizationId,
        {
          clearedType: 'resolution',
        },
        tracker.branchId,
        tracker.unitId
      );
      await eventPublisher.publish(event);
    }

    return true;
  } catch (error) {
    console.error('Error updating SLA on resolution:', error);
    return false;
  }
}

/**
 * Get SLA compliance statistics for a unit
 */
export async function getUnitSLACompliance(unitId: string): Promise<{
  totalReports: number;
  responseCompliance: number; // Percentage
  resolutionCompliance: number; // Percentage
  averageResponseTime: number; // Minutes
  averageResolutionTime: number; // Minutes
}> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const trackersQuery = query(
      collection(db, 'slaTrackers'),
      where('unitId', '==', unitId)
    );

    const snapshot = await getDocs(trackersQuery);
    const trackers = snapshot.docs.map(doc => doc.data() as SLATracker);

    if (trackers.length === 0) {
      return {
        totalReports: 0,
        responseCompliance: 0,
        resolutionCompliance: 0,
        averageResponseTime: 0,
        averageResolutionTime: 0,
      };
    }

    let responseCompliant = 0;
    let resolutionCompliant = 0;
    let totalResponseTime = 0;
    let totalResolutionTime = 0;
    let assignedCount = 0;
    let resolvedCount = 0;

    for (const tracker of trackers) {
      if (!tracker.responseBreached) {
        responseCompliant++;
      }

      if (!tracker.resolutionBreached) {
        resolutionCompliant++;
      }

      if (tracker.assignedAt) {
        const responseTime = Math.floor(
          (tracker.assignedAt.toDate().getTime() - tracker.submittedAt.toDate().getTime()) / (1000 * 60)
        );
        totalResponseTime += responseTime;
        assignedCount++;
      }

      if (tracker.resolvedAt) {
        const resolutionTime = Math.floor(
          (tracker.resolvedAt.toDate().getTime() - tracker.submittedAt.toDate().getTime()) / (1000 * 60)
        );
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    return {
      totalReports: trackers.length,
      responseCompliance: Math.round((responseCompliant / trackers.length) * 100),
      resolutionCompliance: Math.round((resolutionCompliant / trackers.length) * 100),
      averageResponseTime: assignedCount > 0 ? Math.round(totalResponseTime / assignedCount) : 0,
      averageResolutionTime: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0,
    };
  } catch (error) {
    console.error('Error getting SLA compliance:', error);
    return {
      totalReports: 0,
      responseCompliance: 0,
      resolutionCompliance: 0,
      averageResponseTime: 0,
      averageResolutionTime: 0,
    };
  }
}
