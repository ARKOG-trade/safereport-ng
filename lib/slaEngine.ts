/**
 * Generalized SLA Engine Architecture
 * 
 * Manages Service Level Agreements for reports with support for arbitrary SLA stages.
 * Organizations can define custom stages (e.g., response, investigation, resolution, appeal).
 * Tracks SLA compliance, breaches, and clearances per stage.
 * Configuration-driven to support different SLA policies per organization/unit.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { DomainEventPublisher, EventType, createDomainEvent } from '@/lib/domainEvents';

/**
 * SLA Stage Definition
 */
export interface SLAStage {
  id: string;
  name: string; // e.g., "response", "investigation", "resolution"
  description: string;
  durationMinutes: number;
  order: number; // Sequence in the SLA workflow
}

/**
 * SLA Policy Configuration with arbitrary stages
 */
export interface SLAPolicy {
  id: string;
  name: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  // Custom stages defined by the organization
  stages: SLAStage[];
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
 * SLA Stage Tracker for a Report
 */
export interface SLAStageTracker {
  reportId: string;
  stageId: string;
  stageName: string;
  policyId: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  // Timestamps
  startedAt: Timestamp;
  deadline: Timestamp;
  completedAt?: Timestamp;
  // Breach tracking
  breached: boolean;
  breachedAt?: Timestamp;
  // Clearance tracking
  cleared: boolean;
  // Current status
  status: 'pending' | 'breached' | 'cleared' | 'completed';
  updatedAt: Timestamp;
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Create a default SLA policy with standard stages
 */
export async function createDefaultSLAPolicy(
  organizationId: string,
  customStages?: SLAStage[]
): Promise<string> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Default stages if not provided
    const stages = customStages || [
      {
        id: 'response',
        name: 'Response',
        description: 'Time to assign the report',
        durationMinutes: 60,
        order: 1,
      },
      {
        id: 'investigation',
        name: 'Investigation',
        description: 'Time to investigate the report',
        durationMinutes: 1440, // 24 hours
        order: 2,
      },
      {
        id: 'resolution',
        name: 'Resolution',
        description: 'Time to resolve the report',
        durationMinutes: 2880, // 48 hours
        order: 3,
      },
    ];

    const policyRef = doc(collection(db, 'slaPolicies'));
    const now = Timestamp.now();

    const policy: Omit<SLAPolicy, 'id'> = {
      name: `Default SLA Policy - ${organizationId}`,
      organizationId,
      stages,
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
 * Initialize SLA tracking for a report with first stage
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
    if (!policy || policy.stages.length === 0) {
      console.warn('No SLA policy or stages found for unit:', unitId);
      return false;
    }

    // Start with the first stage
    const firstStage = policy.stages[0];
    const multiplier = policy.priorityMultipliers[priority] || 1.0;
    const now = Timestamp.now();
    const durationSeconds = Math.floor(firstStage.durationMinutes * 60 * multiplier);

    const deadline = new Timestamp(
      now.seconds + durationSeconds,
      now.nanoseconds
    );

    // Create SLA stage tracker
    const trackerRef = doc(db, 'slaStageTrackers', `${reportId}_${firstStage.id}`);
    const tracker: SLAStageTracker = {
      reportId,
      stageId: firstStage.id,
      stageName: firstStage.name,
      policyId: policy.id,
      organizationId,
      branchId,
      unitId,
      startedAt: now,
      deadline,
      breached: false,
      cleared: false,
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
 * Advance to the next SLA stage
 */
export async function advanceToNextStage(
  reportId: string,
  currentStageId: string,
  dispatcherUid: string
): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Get current stage tracker
    const currentTrackerRef = doc(db, 'slaStageTrackers', `${reportId}_${currentStageId}`);
    const currentTrackerDoc = await getDoc(currentTrackerRef);

    if (!currentTrackerDoc.exists()) {
      return false;
    }

    const currentTracker = currentTrackerDoc.data() as SLAStageTracker;
    const now = Timestamp.now();

    // Mark current stage as completed
    await updateDoc(currentTrackerRef, {
      completedAt: now,
      status: 'completed',
      updatedAt: now,
    });

    // Get SLA policy to find next stage
    if (!currentTracker.unitId) {
      return false;
    }
    const policy = await getSLAPolicy(currentTracker.unitId);
    if (!policy) {
      return false;
    }

    const currentStageIndex = policy.stages.findIndex(s => s.id === currentStageId);
    if (currentStageIndex === -1 || currentStageIndex >= policy.stages.length - 1) {
      return false; // No next stage
    }

    const nextStage = policy.stages[currentStageIndex + 1];
    const multiplier = policy.priorityMultipliers.medium || 1.0; // Default to medium
    const durationSeconds = Math.floor(nextStage.durationMinutes * 60 * multiplier);

    const deadline = new Timestamp(
      now.seconds + durationSeconds,
      now.nanoseconds
    );

    // Create tracker for next stage
    const nextTrackerRef = doc(db, 'slaStageTrackers', `${reportId}_${nextStage.id}`);
    const nextTracker: SLAStageTracker = {
      reportId,
      stageId: nextStage.id,
      stageName: nextStage.name,
      policyId: policy.id,
      organizationId: currentTracker.organizationId,
      branchId: currentTracker.branchId,
      unitId: currentTracker.unitId,
      startedAt: now,
      deadline,
      breached: false,
      cleared: false,
      status: 'pending',
      updatedAt: now,
    };

    await setDoc(nextTrackerRef, nextTracker);

    // Publish event
    const eventPublisher = DomainEventPublisher.getInstance();
    const event = createDomainEvent(
      EventType.REPORT_STATUS_CHANGED,
      dispatcherUid,
      reportId,
      currentTracker.organizationId,
      {
        fromStatus: currentTracker.stageName,
        toStatus: nextStage.name,
      },
      currentTracker.branchId,
      currentTracker.unitId
    );
    await eventPublisher.publish(event);

    return true;
  } catch (error) {
    console.error('Error advancing to next stage:', error);
    return false;
  }
}

/**
 * Check and update SLA stage status
 */
export async function checkSLAStageStatus(
  reportId: string,
  stageId: string,
  dispatcherUid: string
): Promise<'pending' | 'breached' | 'cleared'> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const trackerRef = doc(db, 'slaStageTrackers', `${reportId}_${stageId}`);
    const trackerDoc = await getDoc(trackerRef);

    if (!trackerDoc.exists()) {
      return 'pending';
    }

    const tracker = trackerDoc.data() as SLAStageTracker;
    const now = Timestamp.now();

    // Check if deadline has been breached
    const breached = now.toDate() > tracker.deadline.toDate();

    if (breached && !tracker.breached) {
      // Stage has been breached
      await updateDoc(trackerRef, {
        breached: true,
        breachedAt: now,
        status: 'breached',
        updatedAt: now,
      });

      // Publish event
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.SLA_BREACHED,
        dispatcherUid,
        reportId,
        tracker.organizationId,
        {
          breachType: 'stage',
          stageName: tracker.stageName,
          deadline: tracker.deadline,
        },
        tracker.branchId,
        tracker.unitId
      );
      await eventPublisher.publish(event);

      return 'breached';
    }

    if (!breached && !tracker.cleared) {
      // Stage is cleared
      await updateDoc(trackerRef, {
        cleared: true,
        status: 'cleared',
        updatedAt: now,
      });

      // Publish event
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.SLA_CLEARED,
        dispatcherUid,
        reportId,
        tracker.organizationId,
        {
          clearedType: 'stage',
          stageName: tracker.stageName,
        },
        tracker.branchId,
        tracker.unitId
      );
      await eventPublisher.publish(event);

      return 'cleared';
    }

    return tracker.status as 'pending' | 'breached' | 'cleared';
  } catch (error) {
    console.error('Error checking SLA stage status:', error);
    return 'pending';
  }
}

/**
 * Get SLA compliance statistics for a unit
 */
export async function getUnitSLACompliance(unitId: string): Promise<{
  totalReports: number;
  stageCompliance: Record<string, { compliant: number; breached: number; percentage: number }>;
  averageStageDuration: Record<string, number>; // Minutes
}> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    const trackersQuery = query(
      collection(db, 'slaStageTrackers'),
      where('unitId', '==', unitId)
    );

    const snapshot = await getDocs(trackersQuery);
    const trackers = snapshot.docs.map(doc => doc.data() as SLAStageTracker);

    if (trackers.length === 0) {
      return {
        totalReports: 0,
        stageCompliance: {},
        averageStageDuration: {},
      };
    }

    const stageCompliance: Record<string, { compliant: number; breached: number; percentage: number }> = {};
    const stageDurations: Record<string, number[]> = {};
    const uniqueReports = new Set<string>();

    for (const tracker of trackers) {
      uniqueReports.add(tracker.reportId);

      if (!stageCompliance[tracker.stageName]) {
        stageCompliance[tracker.stageName] = { compliant: 0, breached: 0, percentage: 0 };
      }

      if (tracker.breached) {
        stageCompliance[tracker.stageName].breached++;
      } else {
        stageCompliance[tracker.stageName].compliant++;
      }

      if (tracker.completedAt) {
        const duration = Math.floor(
          (tracker.completedAt.toDate().getTime() - tracker.startedAt.toDate().getTime()) / (1000 * 60)
        );

        if (!stageDurations[tracker.stageName]) {
          stageDurations[tracker.stageName] = [];
        }
        stageDurations[tracker.stageName].push(duration);
      }
    }

    // Calculate percentages
    for (const stageName in stageCompliance) {
      const { compliant, breached } = stageCompliance[stageName];
      const total = compliant + breached;
      stageCompliance[stageName].percentage = total > 0 ? Math.round((compliant / total) * 100) : 0;
    }

    // Calculate average durations
    const averageStageDuration: Record<string, number> = {};
    for (const stageName in stageDurations) {
      const durations = stageDurations[stageName];
      averageStageDuration[stageName] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }

    return {
      totalReports: uniqueReports.size,
      stageCompliance,
      averageStageDuration,
    };
  } catch (error) {
    console.error('Error getting SLA compliance:', error);
    return {
      totalReports: 0,
      stageCompliance: {},
      averageStageDuration: {},
    };
  }
}
