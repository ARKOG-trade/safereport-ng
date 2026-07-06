/**
 * Invitation Service
 * 
 * Manages user invitations to organizations, branches, and units.
 * Handles invitation creation, acceptance, and rejection.
 */

import { getDb } from '@/lib/firebase';
import { Timestamp, Firestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';

export interface Invitation {
  id: string;
  email: string;
  role: string;
  organizationId?: string;
  branchId?: string;
  unitId?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  expiresAt: Timestamp;
  createdBy: string;
  acceptedAt?: Timestamp;
  acceptedBy?: string;
}

/**
 * Type guard to check if Firestore is properly initialized
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Create an invitation for a user to join a unit
 */
export async function createUnitInvitation(
  email: string,
  unitId: string,
  role: string,
  createdByUid: string
): Promise<string> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    // Verify the unit exists
    const unitRef = doc(db, 'units', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (!unitDoc.exists()) {
      throw new Error('Unit not found');
    }
    
    const unitData = unitDoc.data();
    if (!unitData) throw new Error('Unit data is empty');
    
    // Create invitation document
    const invitationRef = doc(collection(db, 'invitations'));
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 30 * 24 * 60 * 60, now.nanoseconds); // 30 days
    
    const invitation: Omit<Invitation, 'id'> = {
      email,
      role,
      unitId,
      organizationId: unitData.organizationId,
      branchId: unitData.branchId,
      status: 'pending',
      createdAt: now,
      expiresAt,
      createdBy: createdByUid,
    };
    
    await setDoc(invitationRef, invitation);
    
    return invitationRef.id;
  } catch (error) {
    console.error('Error creating unit invitation:', error);
    throw error;
  }
}

/**
 * Create an invitation for a user to join a branch
 */
export async function createBranchInvitation(
  email: string,
  branchId: string,
  role: string,
  createdByUid: string
): Promise<string> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    // Verify the branch exists
    const branchRef = doc(db, 'branches', branchId);
    const branchDoc = await getDoc(branchRef);
    
    if (!branchDoc.exists()) {
      throw new Error('Branch not found');
    }
    
    const branchData = branchDoc.data();
    if (!branchData) throw new Error('Branch data is empty');
    
    // Create invitation document
    const invitationRef = doc(collection(db, 'invitations'));
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 30 * 24 * 60 * 60, now.nanoseconds); // 30 days
    
    const invitation: Omit<Invitation, 'id'> = {
      email,
      role,
      branchId,
      organizationId: branchData.organizationId,
      status: 'pending',
      createdAt: now,
      expiresAt,
      createdBy: createdByUid,
    };
    
    await setDoc(invitationRef, invitation);
    
    return invitationRef.id;
  } catch (error) {
    console.error('Error creating branch invitation:', error);
    throw error;
  }
}

/**
 * Create an invitation for a user to join an organization
 */
export async function createOrganizationInvitation(
  email: string,
  organizationId: string,
  role: string,
  createdByUid: string
): Promise<string> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    // Verify the organization exists
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      throw new Error('Organization not found');
    }
    
    // Create invitation document
    const invitationRef = doc(collection(db, 'invitations'));
    const now = Timestamp.now();
    const expiresAt = new Timestamp(now.seconds + 30 * 24 * 60 * 60, now.nanoseconds); // 30 days
    
    const invitation: Omit<Invitation, 'id'> = {
      email,
      role,
      organizationId,
      status: 'pending',
      createdAt: now,
      expiresAt,
      createdBy: createdByUid,
    };
    
    await setDoc(invitationRef, invitation);
    
    return invitationRef.id;
  } catch (error) {
    console.error('Error creating organization invitation:', error);
    throw error;
  }
}

/**
 * Get pending invitations for a user by email
 */
export async function getPendingInvitations(email: string): Promise<Invitation[]> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    const now = Timestamp.now();
    
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('email', '==', email),
      where('status', '==', 'pending'),
      where('expiresAt', '>', now)
    );
    
    const snapshot = await getDocs(invitationsQuery);
    
    return snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    } as Invitation));
  } catch (error) {
    console.error('Error getting pending invitations:', error);
    return [];
  }
}

/**
 * Accept an invitation and add user to the unit/branch/organization
 */
export async function acceptInvitation(invitationId: string, userUid: string, userEmail: string): Promise<void> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    // Get the invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = invitationDoc.data() as Invitation;
    
    // Verify the invitation is still valid
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }
    
    if (invitation.expiresAt.toDate() < new Date()) {
      throw new Error('Invitation has expired');
    }
    
    if (invitation.email !== userEmail) {
      throw new Error('Invitation email does not match user email');
    }
    
    // Add user to the appropriate entity
    if (invitation.unitId) {
      // Add to unit
      const unitRef = doc(db, 'units', invitation.unitId);
      const unitDoc = await getDoc(unitRef);
      
      if (!unitDoc.exists()) {
        throw new Error('Unit not found');
      }
      
      const unitData = unitDoc.data();
      const members = unitData?.members || [];
      const roles = unitData?.roles || {};
      
      // Add user to members if not already there
      if (!members.includes(userUid)) {
        members.push(userUid);
      }
      
      // Add role for user
      if (!roles[userUid]) {
        roles[userUid] = [];
      }
      if (!roles[userUid].includes(invitation.role)) {
        roles[userUid].push(invitation.role);
      }
      
      await updateDoc(unitRef, {
        members,
        roles,
        updatedAt: Timestamp.now(),
      });
    } else if (invitation.branchId) {
      // Add to branch (as branch admin or similar)
      // This would be handled by the application logic
      // For now, we'll just mark the invitation as accepted
    } else if (invitation.organizationId) {
      // Add to organization (as org admin or similar)
      // This would be handled by the application logic
      // For now, we'll just mark the invitation as accepted
    }
    
    // Mark invitation as accepted
    await updateDoc(invitationRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
      acceptedBy: userUid,
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
}

/**
 * Reject an invitation
 */
export async function rejectInvitation(invitationId: string, userEmail: string): Promise<void> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    // Get the invitation
    const invitationRef = doc(db, 'invitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = invitationDoc.data() as Invitation;
    
    // Verify the invitation email matches
    if (invitation.email !== userEmail) {
      throw new Error('Invitation email does not match user email');
    }
    
    // Mark invitation as rejected
    await updateDoc(invitationRef, {
      status: 'rejected',
    });
  } catch (error) {
    console.error('Error rejecting invitation:', error);
    throw error;
  }
}

/**
 * Remove a user from a unit
 */
export async function removeUserFromUnit(userUid: string, unitId: string): Promise<void> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    const unitRef = doc(db, 'units', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (!unitDoc.exists()) {
      throw new Error('Unit not found');
    }
    
    const unitData = unitDoc.data();
    const members = (unitData?.members || []).filter((uid: string) => uid !== userUid);
    const roles = unitData?.roles || {};
    
    // Remove user from roles
    delete roles[userUid];
    
    await updateDoc(unitRef, {
      members,
      roles,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error removing user from unit:', error);
    throw error;
  }
}

/**
 * Update user role in a unit
 */
export async function updateUserRoleInUnit(
  userUid: string,
  unitId: string,
  newRoles: string[]
): Promise<void> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      throw new Error('Firestore not initialized');
    }
    
    const unitRef = doc(db, 'units', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (!unitDoc.exists()) {
      throw new Error('Unit not found');
    }
    
    const unitData = unitDoc.data();
    const roles = unitData?.roles || {};
    
    // Update user roles
    roles[userUid] = newRoles;
    
    await updateDoc(unitRef, {
      roles,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating user role in unit:', error);
    throw error;
  }
}
