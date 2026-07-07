/**
 * Operational Health Service
 * 
 * Tracks system health metrics including notification failures, SLA breaches,
 * queue congestion, and more.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export enum HealthEventType {
  NOTIFICATION_FAILURE = 'notification_failure',
  SLA_BREACH = 'sla_breach',
  QUEUE_CONGESTION = 'queue_congestion',
  AUTH_FAILURE = 'auth_failure',
  FIRESTORE_FAILURE = 'firestore_failure',
  WEBHOOK_FAILURE = 'webhook_failure',
  SYSTEM_ERROR = 'system_error'
}

export interface HealthEvent {
  id: string;
  type: HealthEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata: Record<string, unknown>;
  timestamp: Timestamp;
}

/**
 * Type guard for Firestore initialization
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

export class HealthService {
  /**
   * Record a health event
   */
  public static async recordEvent(event: Omit<HealthEvent, 'id' | 'timestamp'>): Promise<string | null> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return null;

      const healthRef = collection(db, 'healthEvents');
      const docRef = await addDoc(healthRef, {
        ...event,
        timestamp: Timestamp.now()
      });

      return docRef.id;
    } catch (error) {
      console.error('Error recording health event:', error);
      return null;
    }
  }

  /**
   * Get recent health events
   */
  public static async getRecentEvents(count: number = 50): Promise<HealthEvent[]> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return [];

      const healthQuery = query(
        collection(db, 'healthEvents'),
        orderBy('timestamp', 'desc'),
        limit(count)
      );

      const snapshot = await getDocs(healthQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthEvent));
    } catch (error) {
      console.error('Error getting health events:', error);
      return [];
    }
  }

  /**
   * Get health events by type
   */
  public static async getEventsByType(type: HealthEventType, count: number = 50): Promise<HealthEvent[]> {
    try {
      const db = getDb();
      if (!isFirestoreInitialized(db)) return [];

      const healthQuery = query(
        collection(db, 'healthEvents'),
        where('type', '==', type),
        orderBy('timestamp', 'desc'),
        limit(count)
      );

      const snapshot = await getDocs(healthQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthEvent));
    } catch (error) {
      console.error('Error getting health events by type:', error);
      return [];
    }
  }
}
