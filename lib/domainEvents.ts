/**
 * Domain Event Architecture
 * 
 * Lightweight event system for decoupling Timeline, Notifications, Audit Logs, and Analytics.
 * Events are published when domain actions occur, allowing subsystems to react independently.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  eventId: string;
  eventType: string;
  timestamp: Timestamp;
  actor: string; // User UID who triggered the event
  reportId: string;
  organizationId: string;
  branchId?: string;
  unitId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Event types for domain events
 */
export enum EventType {
  REPORT_SUBMITTED = 'report_submitted',
  REPORT_ASSIGNED = 'report_assigned',
  REPORT_REASSIGNED = 'report_reassigned',
  REPORT_STATUS_CHANGED = 'report_status_changed',
  REPORT_ESCALATED = 'report_escalated',
  REPORT_RESOLVED = 'report_resolved',
  REPORT_ARCHIVED = 'report_archived',
  OFFICER_ASSIGNED = 'officer_assigned',
  OFFICER_ACCEPTED = 'officer_accepted',
  OFFICER_REJECTED = 'officer_rejected',
  EVIDENCE_UPLOADED = 'evidence_uploaded',
  COMMENT_ADDED = 'comment_added',
  SLA_BREACHED = 'sla_breached',
  SLA_CLEARED = 'sla_cleared',
}

/**
 * Report Submitted Event
 */
export interface ReportSubmittedEvent extends DomainEvent {
  eventType: EventType.REPORT_SUBMITTED;
  metadata: {
    caseNumber: string;
    category: string;
    description: string;
    location: string;
  };
}

/**
 * Report Assigned Event
 */
export interface ReportAssignedEvent extends DomainEvent {
  eventType: EventType.REPORT_ASSIGNED;
  metadata: {
    caseNumber: string;
    assignedToUnitId: string;
    assignedToUnitName: string;
    reason?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Report Reassigned Event
 */
export interface ReportReassignedEvent extends DomainEvent {
  eventType: EventType.REPORT_REASSIGNED;
  metadata: {
    caseNumber: string;
    fromUnitId: string;
    fromUnitName: string;
    toUnitId: string;
    toUnitName: string;
    reason: string;
  };
}

/**
 * Report Status Changed Event
 */
export interface ReportStatusChangedEvent extends DomainEvent {
  eventType: EventType.REPORT_STATUS_CHANGED;
  metadata: {
    caseNumber: string;
    fromStatus: string;
    toStatus: string;
    notes?: string;
  };
}

/**
 * Report Escalated Event
 */
export interface ReportEscalatedEvent extends DomainEvent {
  eventType: EventType.REPORT_ESCALATED;
  metadata: {
    caseNumber: string;
    fromUnitId: string;
    toUnitId: string;
    reason: string;
    escalationLevel: number;
  };
}

/**
 * Officer Assigned Event
 */
export interface OfficerAssignedEvent extends DomainEvent {
  eventType: EventType.OFFICER_ASSIGNED;
  metadata: {
    caseNumber: string;
    officerUid: string;
    officerName: string;
    unitId: string;
  };
}

/**
 * Officer Accepted Event
 */
export interface OfficerAcceptedEvent extends DomainEvent {
  eventType: EventType.OFFICER_ACCEPTED;
  metadata: {
    caseNumber: string;
    officerUid: string;
    officerName: string;
    unitId: string;
  };
}

/**
 * Evidence Uploaded Event
 */
export interface EvidenceUploadedEvent extends DomainEvent {
  eventType: EventType.EVIDENCE_UPLOADED;
  metadata: {
    caseNumber: string;
    evidenceId: string;
    evidenceType: string;
    fileName: string;
    fileSize: number;
  };
}

/**
 * Report Resolved Event
 */
export interface ReportResolvedEvent extends DomainEvent {
  eventType: EventType.REPORT_RESOLVED;
  metadata: {
    caseNumber: string;
    resolution: string;
    notes?: string;
  };
}

/**
 * Union type of all domain events
 */
export type AllDomainEvents =
  | ReportSubmittedEvent
  | ReportAssignedEvent
  | ReportReassignedEvent
  | ReportStatusChangedEvent
  | ReportEscalatedEvent
  | OfficerAssignedEvent
  | OfficerAcceptedEvent
  | EvidenceUploadedEvent
  | ReportResolvedEvent
  | DomainEvent;

/**
 * Event handler type
 */
export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => Promise<void>;

/**
 * Domain Event Publisher
 * 
 * Publishes events to all registered subscribers.
 * Subsystems can subscribe to specific event types.
 */
export class DomainEventPublisher {
  private static instance: DomainEventPublisher;
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: DomainEvent[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DomainEventPublisher {
    if (!DomainEventPublisher.instance) {
      DomainEventPublisher.instance = new DomainEventPublisher();
    }
    return DomainEventPublisher.instance;
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe<T extends DomainEvent>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler);
  }

  /**
   * Unsubscribe from a specific event type
   */
  unsubscribe(eventType: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      const index = eventHandlers.indexOf(handler);
      if (index > -1) {
        eventHandlers.splice(index, 1);
      }
    }
  }

  /**
   * Publish an event to all subscribers
   */
  async publish<T extends DomainEvent>(event: T): Promise<void> {
    // Store in history
    this.eventHistory.push(event);

    // Get handlers for this event type
    const handlers = this.handlers.get(event.eventType) || [];

    // Execute all handlers
    const promises = handlers.map(handler =>
      handler(event).catch(error => {
        console.error(`Error handling event ${event.eventType}:`, error);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Get event history (for debugging/auditing)
   */
  getEventHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Create a new domain event
 */
export function createDomainEvent<T extends DomainEvent>(
  eventType: string,
  actor: string,
  reportId: string,
  organizationId: string,
  metadata: Record<string, unknown>,
  branchId?: string,
  unitId?: string
): T {
  return {
    eventId: `${eventType}_${reportId}_${Date.now()}`,
    eventType,
    timestamp: Timestamp.now(),
    actor,
    reportId,
    organizationId,
    branchId,
    unitId,
    metadata,
  } as T;
}
