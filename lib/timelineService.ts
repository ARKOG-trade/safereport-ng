/**
 * Assignment Timeline Service with Cryptographic Integrity
 * 
 * Creates and manages immutable timeline entries for every report action.
 * Timeline entries are append-only and never editable or deletable.
 * Each timeline entry references the previous event and includes a cryptographic hash.
 * Hash chain ensures tamper detection: any modification breaks the chain.
 * Provides complete transparency and accountability for every case.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DomainEvent, DomainEventPublisher, EventType } from '@/lib/domainEvents';

export interface TimelineEntry {
  id: string; // Immutable unique ID (e.g., timeline_reportId_timestamp_hash)
  reportId: string;
  previousEventId?: string; // Reference to previous event in the chain
  eventHash: string; // SHA-256 hash of this event combined with previous hash
  previousEventHash?: string; // Hash of the previous event (for verification)
  timestamp: Timestamp;
  eventType: string;
  actor: string; // User UID
  actorName?: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  action: string; // Human-readable action description
  metadata: Record<string, unknown>;
  createdAt: Timestamp; // When this timeline entry was created
  // Immutability: No updateAt or deletedAt fields
  // Event chain integrity: previousEventId and eventHash create verifiable chain
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Simple SHA-256 hash implementation (browser-compatible)
 * Note: For production, consider using crypto-js or native crypto API
 */
async function computeEventHash(eventData: string, previousHash?: string): Promise<string> {
  try {
    // Use Web Crypto API if available (modern browsers)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(eventData + (previousHash || ''));
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Fallback: Simple hash (not cryptographically secure, for development only)
    // Note: In production, ensure Web Crypto API is available or use a library
    const str = eventData + (previousHash || '');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  } catch (error) {
    console.error('Error computing event hash:', error);
    // Return a placeholder hash on error
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

/**
 * Generate immutable unique ID for timeline entry
 */
function generateTimelineEntryId(reportId: string, timestamp: Timestamp): string {
  const hash = Math.random().toString(36).substring(2, 8);
  return `timeline_${reportId}_${timestamp.seconds}_${hash}`;
}

/**
 * Get the previous event in the timeline chain
 */
async function getPreviousEvent(reportId: string): Promise<TimelineEntry | undefined> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return undefined;
    }

    const timelineQuery = query(
      collection(db, 'reportTimelines'),
      where('reportId', '==', reportId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(timelineQuery);
    if (snapshot.docs.length > 0) {
      return {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      } as TimelineEntry;
    }

    return undefined;
  } catch (error) {
    console.error('Error getting previous event:', error);
    return undefined;
  }
}

/**
 * Create a timeline entry for a domain event
 */
export async function createTimelineEntry(event: DomainEvent): Promise<string | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Generate action description based on event type
    const action = generateActionDescription(event);

    // Get the previous event in the chain
    const previousEvent = await getPreviousEvent(event.reportId);

    // Generate immutable unique ID for this timeline entry
    const entryId = generateTimelineEntryId(event.reportId, event.timestamp);

    // Compute cryptographic hash for this event
    const eventDataForHash = JSON.stringify({
      reportId: event.reportId,
      eventType: event.eventType,
      actor: event.actor,
      timestamp: event.timestamp.seconds,
      action,
      metadata: event.metadata,
    });

    const eventHash = await computeEventHash(eventDataForHash, previousEvent?.eventHash);

    // Create timeline entry
    const timelineRef = doc(db, 'reportTimelines', entryId);
    const entry: TimelineEntry = {
      id: entryId,
      reportId: event.reportId,
      previousEventId: previousEvent?.id,
      eventHash,
      previousEventHash: previousEvent?.eventHash,
      timestamp: event.timestamp,
      eventType: event.eventType,
      actor: event.actor,
      organizationId: event.organizationId,
      branchId: event.branchId,
      unitId: event.unitId,
      action,
      metadata: event.metadata,
      createdAt: Timestamp.now(),
    };

    await setDoc(timelineRef, entry);
    return entryId;
  } catch (error) {
    console.error('Error creating timeline entry:', error);
    return null;
  }
}

/**
 * Verify event chain integrity with cryptographic hashing
 */
export async function verifyEventChainIntegrity(reportId: string): Promise<{
  valid: boolean;
  totalEvents: number;
  brokenAt?: number;
  details: string;
}> {
  try {
    const timeline = await getReportTimeline(reportId);

    if (timeline.length <= 1) {
      return {
        valid: true,
        totalEvents: timeline.length,
        details: 'Chain is valid (0 or 1 events)',
      };
    }

    // Verify each event references the previous one and hashes are correct
    for (let i = 1; i < timeline.length; i++) {
      const currentEvent = timeline[i];
      const previousEvent = timeline[i - 1];

      // Check previousEventId reference
      if (currentEvent.previousEventId !== previousEvent.id) {
        return {
          valid: false,
          totalEvents: timeline.length,
          brokenAt: i,
          details: `Event chain broken at index ${i}: previousEventId mismatch`,
        };
      }

      // Check previousEventHash reference
      if (currentEvent.previousEventHash !== previousEvent.eventHash) {
        return {
          valid: false,
          totalEvents: timeline.length,
          brokenAt: i,
          details: `Event chain broken at index ${i}: previousEventHash mismatch (tamper detected)`,
        };
      }

      // Recompute hash to verify integrity
      const eventDataForHash = JSON.stringify({
        reportId: currentEvent.reportId,
        eventType: currentEvent.eventType,
        actor: currentEvent.actor,
        timestamp: currentEvent.timestamp.seconds,
        action: currentEvent.action,
        metadata: currentEvent.metadata,
      });

      const recomputedHash = await computeEventHash(eventDataForHash, previousEvent.eventHash);

      if (recomputedHash !== currentEvent.eventHash) {
        return {
          valid: false,
          totalEvents: timeline.length,
          brokenAt: i,
          details: `Event chain broken at index ${i}: hash mismatch (event modified)`,
        };
      }
    }

    return {
      valid: true,
      totalEvents: timeline.length,
      details: 'Chain is valid (all events verified)',
    };
  } catch (error) {
    console.error('Error verifying event chain:', error);
    return {
      valid: false,
      totalEvents: 0,
      details: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Generate human-readable action description from event
 */
function generateActionDescription(event: DomainEvent): string {
  const metadata = event.metadata as Record<string, unknown>;

  switch (event.eventType) {
    case EventType.REPORT_SUBMITTED:
      return `Report submitted: ${metadata.category}`;

    case EventType.REPORT_ASSIGNED:
      return `Assigned to ${metadata.assignedToUnitName}${metadata.priority ? ` (${metadata.priority} priority)` : ''}`;

    case EventType.REPORT_REASSIGNED:
      return `Reassigned from ${metadata.fromUnitName} to ${metadata.toUnitName}`;

    case EventType.REPORT_STATUS_CHANGED:
      return `Status changed from ${metadata.fromStatus} to ${metadata.toStatus}`;

    case EventType.REPORT_ESCALATED:
      return `Escalated from ${metadata.fromUnitId} to ${metadata.toUnitId} (Level ${metadata.escalationLevel})`;

    case EventType.OFFICER_ASSIGNED:
      return `Officer assigned: ${metadata.officerName}`;

    case EventType.OFFICER_ACCEPTED:
      return `Officer accepted case: ${metadata.officerName}`;

    case EventType.OFFICER_REJECTED:
      return `Officer rejected case: ${metadata.officerName}`;

    case EventType.EVIDENCE_UPLOADED:
      return `Evidence uploaded: ${metadata.fileName} (${metadata.fileSize} bytes)`;

    case EventType.COMMENT_ADDED:
      return `Comment added`;

    case EventType.REPORT_RESOLVED:
      return `Case resolved: ${metadata.resolution}`;

    case EventType.SLA_BREACHED:
      return `SLA breached`;

    case EventType.SLA_CLEARED:
      return `SLA cleared`;

    default:
      return `Event: ${event.eventType}`;
  }
}

/**
 * Get complete timeline for a report
 */
export async function getReportTimeline(reportId: string): Promise<TimelineEntry[]> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }

    const timelineQuery = query(
      collection(db, 'reportTimelines'),
      where('reportId', '==', reportId),
      orderBy('timestamp', 'asc')
    );

    const snapshot = await getDocs(timelineQuery);
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as TimelineEntry));
  } catch (error) {
    console.error('Error getting report timeline:', error);
    return [];
  }
}

/**
 * Format timeline for display
 */
export function formatTimeline(entries: TimelineEntry[]): Array<{
  time: string;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  eventHash: string;
}> {
  return entries.map(entry => ({
    time: entry.timestamp.toDate().toLocaleString(),
    action: entry.action,
    actor: entry.actorName || entry.actor,
    details: entry.metadata,
    eventHash: entry.eventHash,
  }));
}

/**
 * Initialize timeline event listener
 * 
 * Subscribes to all domain events and automatically creates timeline entries.
 * This ensures every action is recorded without requiring explicit timeline calls.
 */
export function initializeTimelineEventListener(): void {
  const eventPublisher = DomainEventPublisher.getInstance();

  // Subscribe to all event types
  const eventTypes = [
    EventType.REPORT_SUBMITTED,
    EventType.REPORT_ASSIGNED,
    EventType.REPORT_REASSIGNED,
    EventType.REPORT_STATUS_CHANGED,
    EventType.REPORT_ESCALATED,
    EventType.OFFICER_ASSIGNED,
    EventType.OFFICER_ACCEPTED,
    EventType.OFFICER_REJECTED,
    EventType.EVIDENCE_UPLOADED,
    EventType.COMMENT_ADDED,
    EventType.REPORT_RESOLVED,
    EventType.SLA_BREACHED,
    EventType.SLA_CLEARED,
  ];

  for (const eventType of eventTypes) {
    eventPublisher.subscribe(eventType, async (event: DomainEvent) => {
      await createTimelineEntry(event);
    });
  }
}

/**
 * Get timeline statistics for a report
 */
export async function getTimelineStatistics(reportId: string): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  firstEvent?: Timestamp;
  lastEvent?: Timestamp;
  durationMinutes?: number;
  chainIntegrityValid: boolean;
  chainIntegrityDetails: string;
}> {
  try {
    const timeline = await getReportTimeline(reportId);
    const chainVerification = await verifyEventChainIntegrity(reportId);

    if (timeline.length === 0) {
      return {
        totalEvents: 0,
        eventsByType: {},
        chainIntegrityValid: true,
        chainIntegrityDetails: 'No events to verify',
      };
    }

    const eventsByType: Record<string, number> = {};
    for (const entry of timeline) {
      eventsByType[entry.eventType] = (eventsByType[entry.eventType] || 0) + 1;
    }

    const firstEvent = timeline[0].timestamp;
    const lastEvent = timeline[timeline.length - 1].timestamp;
    const durationMinutes = Math.floor(
      (lastEvent.toDate().getTime() - firstEvent.toDate().getTime()) / (1000 * 60)
    );

    return {
      totalEvents: timeline.length,
      eventsByType,
      firstEvent,
      lastEvent,
      durationMinutes,
      chainIntegrityValid: chainVerification.valid,
      chainIntegrityDetails: chainVerification.details,
    };
  } catch (error) {
    console.error('Error getting timeline statistics:', error);
    return {
      totalEvents: 0,
      eventsByType: {},
      chainIntegrityValid: false,
      chainIntegrityDetails: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
