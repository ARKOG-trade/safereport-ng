/**
 * Hierarchy Service
 * 
 * Manages operations for the organizational hierarchy:
 * Organization → Branch → Unit
 * 
 * This service handles CRUD operations while maintaining backward compatibility
 * with existing report submission and tracking functionality.
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getDb } from './firebase';

// --- Type Definitions ---

export interface Organization {
  id: string;
  name: string;
  adminUid: string;
  organizationType: string;
  country: string;
  state: string;
  city: string;
  active: boolean;
  deletedAt: Timestamp | null;
  deletedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Branch {
  id: string;
  organizationId: string;
  name: string;
  branchAdminUid: string;
  active: boolean;
  deletedAt: Timestamp | null;
  deletedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Unit {
  id: string;
  branchId: string;
  organizationId: string;
  name: string;
  members: string[];
  unitAdminUid: string;
  roles: Record<string, string[]>;
  active: boolean;
  deletedAt: Timestamp | null;
  deletedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Organization Operations ---

/**
 * Creates a new organization
 * @param orgData - Organization data
 * @param userId - UID of the user creating the organization (Super Admin)
 * @returns Organization ID
 */
export async function createOrganization(
  orgData: Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'deletedAt' | 'deletedBy'>,
  userId: string
): Promise<string> {
  const db = getDb();
  const orgId = doc(collection(db, 'organizations')).id;
  const now = Timestamp.now();

  const organization: Organization = {
    id: orgId,
    ...orgData,
    active: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'organizations', orgId), organization);

  // Log to audit trail
  await logAuditEntry({
    action: 'organization_created',
    userId,
    details: {
      organizationId: orgId,
      organizationName: orgData.name,
      organizationType: orgData.organizationType,
      country: orgData.country,
      state: orgData.state,
      city: orgData.city,
    },
  });

  return orgId;
}

/**
 * Retrieves an organization by ID
 * @param orgId - Organization ID
 * @returns Organization data or null
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'organizations', orgId));
  return docSnap.exists() ? (docSnap.data() as Organization) : null;
}

/**
 * Retrieves all active organizations
 * @returns Array of active organizations
 */
export async function getActiveOrganizations(): Promise<Organization[]> {
  const db = getDb();
  const q = query(
    collection(db, 'organizations'),
    where('active', '==', true)
  );
  const querySnap = await getDocs(q);
  return querySnap.docs.map(doc => doc.data() as Organization);
}

/**
 * Updates an organization
 * @param orgId - Organization ID
 * @param updates - Fields to update
 * @param userId - UID of the user performing the update
 */
export async function updateOrganization(
  orgId: string,
  updates: Partial<Omit<Organization, 'id' | 'createdAt' | 'active' | 'deletedAt' | 'deletedBy'>>,
  userId: string
): Promise<void> {
  const db = getDb();
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  await updateDoc(doc(db, 'organizations', orgId), updateData);

  // Log to audit trail
  await logAuditEntry({
    action: 'organization_updated',
    userId,
    details: {
      organizationId: orgId,
      changes: updates,
    },
  });
}

/**
 * Soft-deletes an organization
 * @param orgId - Organization ID
 * @param userId - UID of the user performing the deletion
 */
export async function softDeleteOrganization(orgId: string, userId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'organizations', orgId), {
    active: false,
    deletedAt: Timestamp.now(),
    deletedBy: userId,
    updatedAt: Timestamp.now(),
  });

  // Log to audit trail
  await logAuditEntry({
    action: 'organization_deactivated',
    userId,
    details: {
      organizationId: orgId,
    },
  });
}

// --- Branch Operations ---

/**
 * Creates a new branch
 * @param branchData - Branch data
 * @param userId - UID of the user creating the branch
 * @returns Branch ID
 */
export async function createBranch(
  branchData: Omit<Branch, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'deletedAt' | 'deletedBy'>,
  userId: string
): Promise<string> {
  const db = getDb();
  const branchId = doc(collection(db, 'branches')).id;
  const now = Timestamp.now();

  const branch: Branch = {
    id: branchId,
    ...branchData,
    active: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'branches', branchId), branch);

  // Log to audit trail
  await logAuditEntry({
    action: 'branch_created',
    userId,
    details: {
      branchId,
      branchName: branchData.name,
      organizationId: branchData.organizationId,
    },
  });

  return branchId;
}

/**
 * Retrieves a branch by ID
 * @param branchId - Branch ID
 * @returns Branch data or null
 */
export async function getBranch(branchId: string): Promise<Branch | null> {
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'branches', branchId));
  return docSnap.exists() ? (docSnap.data() as Branch) : null;
}

/**
 * Retrieves all active branches for an organization
 * @param orgId - Organization ID
 * @returns Array of active branches
 */
export async function getActiveBranchesByOrganization(orgId: string): Promise<Branch[]> {
  const db = getDb();
  const q = query(
    collection(db, 'branches'),
    where('organizationId', '==', orgId),
    where('active', '==', true)
  );
  const querySnap = await getDocs(q);
  return querySnap.docs.map(doc => doc.data() as Branch);
}

/**
 * Updates a branch
 * @param branchId - Branch ID
 * @param updates - Fields to update
 * @param userId - UID of the user performing the update
 */
export async function updateBranch(
  branchId: string,
  updates: Partial<Omit<Branch, 'id' | 'createdAt' | 'active' | 'deletedAt' | 'deletedBy'>>,
  userId: string
): Promise<void> {
  const db = getDb();
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  await updateDoc(doc(db, 'branches', branchId), updateData);

  // Log to audit trail
  await logAuditEntry({
    action: 'branch_updated',
    userId,
    details: {
      branchId,
      changes: updates,
    },
  });
}

/**
 * Soft-deletes a branch
 * @param branchId - Branch ID
 * @param userId - UID of the user performing the deletion
 */
export async function softDeleteBranch(branchId: string, userId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'branches', branchId), {
    active: false,
    deletedAt: Timestamp.now(),
    deletedBy: userId,
    updatedAt: Timestamp.now(),
  });

  // Log to audit trail
  await logAuditEntry({
    action: 'branch_deactivated',
    userId,
    details: {
      branchId,
    },
  });
}

// --- Unit Operations ---

/**
 * Creates a new unit
 * @param unitData - Unit data
 * @param userId - UID of the user creating the unit
 * @returns Unit ID
 */
export async function createUnit(
  unitData: Omit<Unit, 'id' | 'createdAt' | 'updatedAt' | 'active' | 'deletedAt' | 'deletedBy'>,
  userId: string
): Promise<string> {
  const db = getDb();
  const unitId = doc(collection(db, 'units')).id;
  const now = Timestamp.now();

  const unit: Unit = {
    id: unitId,
    ...unitData,
    active: true,
    deletedAt: null,
    deletedBy: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'units', unitId), unit);

  // Log to audit trail
  await logAuditEntry({
    action: 'unit_created',
    userId,
    details: {
      unitId,
      unitName: unitData.name,
      branchId: unitData.branchId,
      organizationId: unitData.organizationId,
    },
  });

  return unitId;
}

/**
 * Retrieves a unit by ID
 * @param unitId - Unit ID
 * @returns Unit data or null
 */
export async function getUnit(unitId: string): Promise<Unit | null> {
  const db = getDb();
  const docSnap = await getDoc(doc(db, 'units', unitId));
  return docSnap.exists() ? (docSnap.data() as Unit) : null;
}

/**
 * Retrieves all active units for a branch
 * @param branchId - Branch ID
 * @returns Array of active units
 */
export async function getActiveUnitsByBranch(branchId: string): Promise<Unit[]> {
  const db = getDb();
  const q = query(
    collection(db, 'units'),
    where('branchId', '==', branchId),
    where('active', '==', true)
  );
  const querySnap = await getDocs(q);
  return querySnap.docs.map(doc => doc.data() as Unit);
}

/**
 * Updates a unit
 * @param unitId - Unit ID
 * @param updates - Fields to update
 * @param userId - UID of the user performing the update
 */
export async function updateUnit(
  unitId: string,
  updates: Partial<Omit<Unit, 'id' | 'createdAt' | 'active' | 'deletedAt' | 'deletedBy'>>,
  userId: string
): Promise<void> {
  const db = getDb();
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };

  await updateDoc(doc(db, 'units', unitId), updateData);

  // Log to audit trail
  await logAuditEntry({
    action: 'unit_updated',
    userId,
    details: {
      unitId,
      changes: updates,
    },
  });
}

/**
 * Soft-deletes a unit
 * @param unitId - Unit ID
 * @param userId - UID of the user performing the deletion
 */
export async function softDeleteUnit(unitId: string, userId: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, 'units', unitId), {
    active: false,
    deletedAt: Timestamp.now(),
    deletedBy: userId,
    updatedAt: Timestamp.now(),
  });

  // Log to audit trail
  await logAuditEntry({
    action: 'unit_deactivated',
    userId,
    details: {
      unitId,
    },
  });
}

// --- Audit Logging ---

interface AuditEntry {
  action: string;
  userId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
}

/**
 * Logs an audit entry
 * @param entry - Audit entry data
 */
async function logAuditEntry(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  try {
    const db = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auditId = (doc(collection(db, 'auditLog')) as any).id;
    await setDoc(doc(db, 'auditLog', auditId), {
      ...entry,
      timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging should not break main operations
  }
}
