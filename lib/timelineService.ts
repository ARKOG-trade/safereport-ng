/**
 * Assignment Timeline Service
 * 
 * Creates and manages immutable timeline entries for every report action.
 * Timeline entries are append-only and never editable or deletable.
 * Provides complete transparency and accountability for every case.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, doc, setDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { DomainEvent, DomainEventPublisher, EventType } from '@/lib/domainEvents';

export interface TimelineEntry {
  id: string;
  reportId: string;
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
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Create a timeline entry for a domain event
 */
export async function createTimelineEntry(event: DomainEvent): Promise<boolean> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }

    // Generate action description based on event type
    const action = generateActionDescription(event);

    // Create timeline entry
    const timelineRef = doc(collection(db, 'reportTimelines'));
    const entry: Omit<TimelineEntry, 'id'> = {
      reportId: event.reportId,
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
    return true;
  } catch (error) {
    console.error('Error creating timeline entry:', error);
    return false;
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
}> {
  return entries.map(entry => ({
    time: entry.timestamp.toDate().toLocaleString(),
    action: entry.action,
    actor: entry.actorName || entry.actor,
    details: entry.metadata,
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
}> {
  try {
    const timeline = await getReportTimeline(reportId);

    if (timeline.length === 0) {
      return {
        totalEvents: 0,
        eventsByType: {},
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
    };
  } catch (error) {
    console.error('Error getting timeline statistics:', error);
    return {
      totalEvents: 0,
      eventsByType: {},
    };
  }
}
