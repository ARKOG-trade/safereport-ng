/**
 * Communication & Audit Platform
 * 
 * Centralized system for notifications, audit logging, and case communication.
 * All channels subscribe to Domain Events for decoupled communication.
 * Includes Evidence Chain of Custody and Internal Notes support.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { DomainEvent, DomainEventPublisher, EventType, createDomainEvent } from '@/lib/domainEvents';

/**
 * Notification Types
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

export interface Notification {
  id: string;
  reportId: string;
  recipientUid: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  sentAt?: Timestamp;
  deliveredAt?: Timestamp;
  readAt?: Timestamp;
  retryCount: number;
  lastError?: string;
}

/**
 * Audit Log Types
 */
export interface AuditEntry {
  id: string;
  action: string;
  actorUid: string;
  actorName?: string;
  actorRole?: string[];
  organizationId: string;
  branchId?: string;
  unitId?: string;
  targetId?: string; // ID of the entity acted upon (e.g., reportId, userId)
  targetType: 'report' | 'user' | 'organization' | 'branch' | 'unit' | 'system';
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
}

/**
 * Case Communication Types
 */
export interface CaseMessage {
  id: string;
  reportId: string;
  senderUid: string;
  senderName: string;
  senderRole: string[];
  message: string;
  type: 'operational' | 'confidential';
  visibility: string[]; // List of roles that can see this message
  attachments?: {
    id: string;
    name: string;
    url: string;
  }[];
  timestamp: Timestamp;
}

/**
 * Evidence Chain of Custody Types
 */
export interface Evidence {
  id: string;
  reportId: string;
  uploaderUid: string;
  uploaderName: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  fileHash: string; // SHA-256
  storagePath: string;
  version: number;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Notification Center
 */
export class NotificationCenter {
  private static instance: NotificationCenter;
  private retryQueue: Notification[] = [];

  private constructor() {}

  public static getInstance(): NotificationCenter {
    if (!NotificationCenter.instance) {
      NotificationCenter.instance = new NotificationCenter();
    }
    return NotificationCenter.instance;
  }

  /**
   * Initialize the Notification Center by subscribing to Domain Events
   */
  public initialize(): void {
    const eventPublisher = DomainEventPublisher.getInstance();

    // Subscribe to all event types
    const eventTypes = Object.values(EventType);

    for (const eventType of eventTypes) {
      eventPublisher.subscribe(eventType, async (event: DomainEvent) => {
        await this.handleDomainEvent(event);
      });
    }

    // Start retry queue processor
    this.startRetryProcessor();
  }

  private async handleDomainEvent(event: DomainEvent): Promise<void> {
    try {
      // Determine recipients and messages based on event type
      const notifications = await this.createNotificationsForEvent(event);
      
      for (const notification of notifications) {
        await this.queueNotification(notification);
      }
    } catch (error) {
      console.error('Error handling domain event in NotificationCenter:', error);
    }
  }

  private async createNotificationsForEvent(event: DomainEvent): Promise<Omit<Notification, 'id'>[]> {
    const notifications: Omit<Notification, 'id'>[] = [];
    const metadata = event.metadata as Record<string, unknown>;

    // Logic to determine recipients based on event type
    // Example: For REPORT_ASSIGNED, notify the unit members
    if (event.eventType === EventType.REPORT_ASSIGNED) {
      // Add in-app notification for unit members
      notifications.push({
        reportId: event.reportId,
        recipientUid: metadata.assignedToUnitId as string, // Simplified for example
        type: 'report_assigned',
        title: 'New Report Assigned',
        message: `A new report has been assigned to your unit. Priority: ${metadata.priority}`,
        channel: NotificationChannel.IN_APP,
        status: 'pending',
        metadata: { ...metadata },
        createdAt: Timestamp.now(),
        retryCount: 0
      });
    }

    // Add more event handling logic here...

    return notifications;
  }

  private async queueNotification(notification: Omit<Notification, 'id'>): Promise<void> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return;

      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, notification);
      
      // Attempt immediate delivery for high-priority channels
      // In a real app, this would be handled by a background worker
    } catch (error) {
      console.error('Error queuing notification:', error);
    }
  }

  private startRetryProcessor(): void {
    setInterval(async () => {
      // Process retry queue with exponential backoff
    }, 60000); // Check every minute
  }
}

/**
 * Audit Log Service
 */
export class AuditLogService {
  /**
   * Log an administrative action
   */
  public static async log(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return null;

      const auditRef = collection(db, 'auditLogs');
      const docRef = await addDoc(auditRef, {
        ...entry,
        timestamp: Timestamp.now()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error logging audit entry:', error);
      return null;
    }
  }

  /**
   * Get audit logs for a specific target
   */
  public static async getLogs(targetId: string, targetType: string): Promise<AuditEntry[]> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return [];

      const auditQuery = query(
        collection(db, 'auditLogs'),
        where('targetId', '==', targetId),
        where('targetType', '==', targetType),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(auditQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditEntry));
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }
}

/**
 * Case Communication Service
 */
export class CaseCommunicationService {
  /**
   * Send a message within a case
   */
  public static async sendMessage(message: Omit<CaseMessage, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return null;

      const messageRef = collection(db, 'caseMessages');
      const docRef = await addDoc(messageRef, {
        ...message,
        timestamp: Timestamp.now()
      });

      // Publish event for notifications
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.COMMENT_ADDED,
        message.senderUid,
        message.reportId,
        '', // organizationId should be provided
        { messageId: docRef.id, type: message.type }
      );
      
      await eventPublisher.publish(event);

      return docRef.id;
    } catch (error) {
      console.error('Error sending case message:', error);
      return null;
    }
  }
}

/**
 * Evidence Chain of Custody Service
 */
export class EvidenceService {
  /**
   * Record new evidence with versioning and hash
   */
  public static async recordEvidence(evidence: Omit<Evidence, 'id' | 'timestamp' | 'version'>): Promise<string | null> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return null;

      // Get current version for this filename in this report
      const q = query(
        collection(db, 'evidence'),
        where('reportId', '==', evidence.reportId),
        where('originalFilename', '==', evidence.originalFilename),
        orderBy('version', 'desc')
      );
      const snapshot = await getDocs(q);
      const nextVersion = snapshot.empty ? 1 : (snapshot.docs[0].data() as Evidence).version + 1;

      const evidenceRef = collection(db, 'evidence');
      const docRef = await addDoc(evidenceRef, {
        ...evidence,
        version: nextVersion,
        timestamp: Timestamp.now()
      });

      // Publish event
      const eventPublisher = DomainEventPublisher.getInstance();
      const event = createDomainEvent(
        EventType.EVIDENCE_UPLOADED,
        evidence.uploaderUid,
        evidence.reportId,
        '', // organizationId should be provided
        { evidenceId: docRef.id, filename: evidence.originalFilename }
      );
      
      await eventPublisher.publish(event);

      return docRef.id;
    } catch (error) {
      console.error('Error recording evidence:', error);
      return null;
    }
  }
}
