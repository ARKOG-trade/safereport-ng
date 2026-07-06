/**
 * RBAC Service
 * 
 * Manages role-based access control for the institutional hierarchy.
 * Provides functions for checking user roles, permissions, and hierarchical access.
 */

import { getDb } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where, Firestore } from 'firebase/firestore';

/**
 * Role definitions and their associated permissions
 */
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORG_ADMIN = 'org_admin',
  BRANCH_ADMIN = 'branch_admin',
  UNIT_ADMIN = 'unit_admin',
  DISPATCHER = 'dispatcher',
  OFFICER = 'officer',
}

/**
 * Permission types
 */
export enum Permission {
  // Organization permissions
  CREATE_ORG = 'create_org',
  READ_ORG = 'read_org',
  UPDATE_ORG = 'update_org',
  DELETE_ORG = 'delete_org',
  
  // Branch permissions
  CREATE_BRANCH = 'create_branch',
  READ_BRANCH = 'read_branch',
  UPDATE_BRANCH = 'update_branch',
  DELETE_BRANCH = 'delete_branch',
  
  // Unit permissions
  CREATE_UNIT = 'create_unit',
  READ_UNIT = 'read_unit',
  UPDATE_UNIT = 'update_unit',
  DELETE_UNIT = 'delete_unit',
  MANAGE_UNIT_MEMBERS = 'manage_unit_members',
  
  // Report permissions
  ASSIGN_REPORT = 'assign_report',
  REASSIGN_REPORT = 'reassign_report',
  UPDATE_REPORT_STATUS = 'update_report_status',
  VIEW_REPORT = 'view_report',
  
  // Audit permissions
  VIEW_AUDIT_LOG = 'view_audit_log',
}

/**
 * Role to permissions mapping
 */
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    // Super Admin has all permissions
    Permission.CREATE_ORG, Permission.READ_ORG, Permission.UPDATE_ORG, Permission.DELETE_ORG,
    Permission.CREATE_BRANCH, Permission.READ_BRANCH, Permission.UPDATE_BRANCH, Permission.DELETE_BRANCH,
    Permission.CREATE_UNIT, Permission.READ_UNIT, Permission.UPDATE_UNIT, Permission.DELETE_UNIT,
    Permission.MANAGE_UNIT_MEMBERS,
    Permission.ASSIGN_REPORT, Permission.REASSIGN_REPORT, Permission.UPDATE_REPORT_STATUS, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.ORG_ADMIN]: [
    Permission.READ_ORG, Permission.UPDATE_ORG,
    Permission.CREATE_BRANCH, Permission.READ_BRANCH, Permission.UPDATE_BRANCH,
    Permission.CREATE_UNIT, Permission.READ_UNIT, Permission.UPDATE_UNIT,
    Permission.MANAGE_UNIT_MEMBERS,
    Permission.ASSIGN_REPORT, Permission.REASSIGN_REPORT, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.BRANCH_ADMIN]: [
    Permission.READ_BRANCH, Permission.UPDATE_BRANCH,
    Permission.CREATE_UNIT, Permission.READ_UNIT, Permission.UPDATE_UNIT,
    Permission.MANAGE_UNIT_MEMBERS,
    Permission.ASSIGN_REPORT, Permission.REASSIGN_REPORT, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.UNIT_ADMIN]: [
    Permission.READ_UNIT, Permission.UPDATE_UNIT,
    Permission.MANAGE_UNIT_MEMBERS,
    Permission.ASSIGN_REPORT, Permission.REASSIGN_REPORT, Permission.UPDATE_REPORT_STATUS, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.DISPATCHER]: [
    Permission.READ_UNIT,
    Permission.ASSIGN_REPORT, Permission.REASSIGN_REPORT, Permission.UPDATE_REPORT_STATUS, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
  [UserRole.OFFICER]: [
    Permission.READ_UNIT,
    Permission.UPDATE_REPORT_STATUS, Permission.VIEW_REPORT,
    Permission.VIEW_AUDIT_LOG,
  ],
};

/**
 * Type guard to check if Firestore is properly initialized
 */
function isFirestoreInitialized(db: Firestore | Record<string, unknown>): db is Firestore {
  return db && typeof db === 'object' && 'type' in db;
}

/**
 * Get user's role in a specific unit
 */
export async function getUserRoleInUnit(userId: string, unitId: string): Promise<UserRole | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return null;
    }
    
    const unitRef = doc(db, 'units', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (!unitDoc.exists()) {
      return null;
    }
    
    const unitData = unitDoc.data();
    if (!unitData) return null;
    
    // Check if user is unit admin
    if (unitData.unitAdminUid === userId) {
      return UserRole.UNIT_ADMIN;
    }
    
    // Check if user has a role in the unit
    if (unitData.roles && unitData.roles[userId]) {
      const roles = unitData.roles[userId];
      if (Array.isArray(roles) && roles.length > 0) {
        // Return the first role (in a real system, you might want to handle multiple roles)
        const role = roles[0];
        if (role === 'dispatcher') return UserRole.DISPATCHER;
        if (role === 'officer') return UserRole.OFFICER;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role in unit:', error);
    return null;
  }
}

/**
 * Get user's role in a specific organization
 */
export async function getUserRoleInOrganization(userId: string, organizationId: string): Promise<UserRole | null> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return null;
    }
    
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      return null;
    }
    
    const orgData = orgDoc.data();
    if (!orgData) return null;
    
    // Check if user is org admin
    if (orgData.adminUid === userId) {
      return UserRole.ORG_ADMIN;
    }
    
    // Check if user has a role in any branch or unit of this organization
    const branchesQuery = query(
      collection(db, 'branches'),
      where('organizationId', '==', organizationId)
    );
    const branchesSnapshot = await getDocs(branchesQuery);
    
    for (const branchDocSnap of branchesSnapshot.docs) {
      const branchData = branchDocSnap.data();
      if (branchData.branchAdminUid === userId) {
        return UserRole.BRANCH_ADMIN;
      }
      
      // Check units in this branch
      const unitsQuery = query(
        collection(db, 'units'),
        where('branchId', '==', branchDocSnap.id)
      );
      const unitsSnapshot = await getDocs(unitsQuery);
      
      for (const unitDocSnap of unitsSnapshot.docs) {
        const unitRole = await getUserRoleInUnit(userId, unitDocSnap.id);
        if (unitRole) {
          return unitRole;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role in organization:', error);
    return null;
  }
}

/**
 * Check if user has a specific permission in a unit
 */
export async function hasPermissionInUnit(
  userId: string,
  unitId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userRole = await getUserRoleInUnit(userId, unitId);
    if (!userRole) return false;
    
    const permissions = rolePermissions[userRole];
    return permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission in unit:', error);
    return false;
  }
}

/**
 * Check if user has a specific permission in an organization
 */
export async function hasPermissionInOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userRole = await getUserRoleInOrganization(userId, organizationId);
    if (!userRole) return false;
    
    const permissions = rolePermissions[userRole];
    return permissions.includes(permission);
  } catch (error) {
    console.error('Error checking permission in organization:', error);
    return false;
  }
}

/**
 * Get all units where user has a specific role
 */
export async function getUserUnits(userId: string): Promise<Array<{ unitId: string; role: UserRole }>> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }
    
    const unitsQuery = query(
      collection(db, 'units'),
      where('active', '==', true)
    );
    const unitsSnapshot = await getDocs(unitsQuery);
    
    const userUnits: Array<{ unitId: string; role: UserRole }> = [];
    
    for (const unitDocSnap of unitsSnapshot.docs) {
      const unitData = unitDocSnap.data();
      
      // Check if user is unit admin
      if (unitData.unitAdminUid === userId) {
        userUnits.push({ unitId: unitDocSnap.id, role: UserRole.UNIT_ADMIN });
        continue;
      }
      
      // Check if user has a role in the unit
      if (unitData.roles && unitData.roles[userId]) {
        const roles = unitData.roles[userId];
        if (Array.isArray(roles) && roles.length > 0) {
          const role = roles[0];
          if (role === 'dispatcher') {
            userUnits.push({ unitId: unitDocSnap.id, role: UserRole.DISPATCHER });
          } else if (role === 'officer') {
            userUnits.push({ unitId: unitDocSnap.id, role: UserRole.OFFICER });
          }
        }
      }
    }
    
    return userUnits;
  } catch (error) {
    console.error('Error getting user units:', error);
    return [];
  }
}

/**
 * Get all organizations where user has a specific role
 */
export async function getUserOrganizations(userId: string): Promise<Array<{ organizationId: string; role: UserRole }>> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }
    
    const orgsQuery = query(
      collection(db, 'organizations'),
      where('active', '==', true)
    );
    const orgsSnapshot = await getDocs(orgsQuery);
    
    const userOrgs: Array<{ organizationId: string; role: UserRole }> = [];
    
    for (const orgDocSnap of orgsSnapshot.docs) {
      const orgData = orgDocSnap.data();
      
      // Check if user is org admin
      if (orgData.adminUid === userId) {
        userOrgs.push({ organizationId: orgDocSnap.id, role: UserRole.ORG_ADMIN });
        continue;
      }
      
      // Check if user has a role in any branch or unit
      const role = await getUserRoleInOrganization(userId, orgDocSnap.id);
      if (role) {
        userOrgs.push({ organizationId: orgDocSnap.id, role });
      }
    }
    
    return userOrgs;
  } catch (error) {
    console.error('Error getting user organizations:', error);
    return [];
  }
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(user: User | null): boolean {
  return user?.email === 'admin@safereport.ng';
}

/**
 * Export role permissions for reference
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}
