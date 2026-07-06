/**
 * RBAC Service
 * 
 * Manages role-based access control for the institutional hierarchy.
 * Provides functions for checking user roles, permissions, and hierarchical access.
 * Supports multiple roles per user for flexible permission management.
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
 * Get user's roles in a specific unit (supports multiple roles)
 */
export async function getUserRolesInUnit(userId: string, unitId: string): Promise<UserRole[]> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }
    
    const unitRef = doc(db, 'units', unitId);
    const unitDoc = await getDoc(unitRef);
    
    if (!unitDoc.exists()) {
      return [];
    }
    
    const unitData = unitDoc.data();
    if (!unitData) return [];
    
    const userRoles: UserRole[] = [];
    
    // Check if user is unit admin
    if (unitData.unitAdminUid === userId) {
      userRoles.push(UserRole.UNIT_ADMIN);
    }
    
    // Check if user has roles in the unit (support multiple roles)
    if (unitData.roles && unitData.roles[userId]) {
      const roles = unitData.roles[userId];
      if (Array.isArray(roles)) {
        for (const role of roles) {
          if (role === 'dispatcher') userRoles.push(UserRole.DISPATCHER);
          else if (role === 'officer') userRoles.push(UserRole.OFFICER);
        }
      }
    }
    
    return userRoles;
  } catch (error) {
    console.error('Error getting user roles in unit:', error);
    return [];
  }
}

/**
 * Get user's roles in a specific organization (supports multiple roles)
 */
export async function getUserRolesInOrganization(userId: string, organizationId: string): Promise<UserRole[]> {
  try {
    const db = getDb();
    if (!isFirestoreInitialized(db)) {
      return [];
    }
    
    const orgRef = doc(db, 'organizations', organizationId);
    const orgDoc = await getDoc(orgRef);
    
    if (!orgDoc.exists()) {
      return [];
    }
    
    const orgData = orgDoc.data();
    if (!orgData) return [];
    
    const userRoles: UserRole[] = [];
    
    // Check if user is org admin
    if (orgData.adminUid === userId) {
      userRoles.push(UserRole.ORG_ADMIN);
      return userRoles; // Org admin has highest priority
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
        userRoles.push(UserRole.BRANCH_ADMIN);
        continue;
      }
      
      // Check units in this branch
      const unitsQuery = query(
        collection(db, 'units'),
        where('branchId', '==', branchDocSnap.id)
      );
      const unitsSnapshot = await getDocs(unitsQuery);
      
      for (const unitDocSnap of unitsSnapshot.docs) {
        const unitRoles = await getUserRolesInUnit(userId, unitDocSnap.id);
        for (const role of unitRoles) {
          if (!userRoles.includes(role)) {
            userRoles.push(role);
          }
        }
      }
    }
    
    return userRoles;
  } catch (error) {
    console.error('Error getting user roles in organization:', error);
    return [];
  }
}

/**
 * Check if user has a specific permission in a unit
 * Evaluates all user roles and their combined permissions
 */
export async function hasPermissionInUnit(
  userId: string,
  unitId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userRoles = await getUserRolesInUnit(userId, unitId);
    if (userRoles.length === 0) return false;
    
    // Check if any of the user's roles has the permission
    for (const role of userRoles) {
      const permissions = rolePermissions[role];
      if (permissions.includes(permission)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking permission in unit:', error);
    return false;
  }
}

/**
 * Check if user has a specific permission in an organization
 * Evaluates all user roles and their combined permissions
 */
export async function hasPermissionInOrganization(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  try {
    const userRoles = await getUserRolesInOrganization(userId, organizationId);
    if (userRoles.length === 0) return false;
    
    // Check if any of the user's roles has the permission
    for (const role of userRoles) {
      const permissions = rolePermissions[role];
      if (permissions.includes(permission)) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking permission in organization:', error);
    return false;
  }
}

/**
 * Get all units where user has any role
 */
export async function getUserUnits(userId: string): Promise<Array<{ unitId: string; roles: UserRole[] }>> {
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
    
    const userUnits: Array<{ unitId: string; roles: UserRole[] }> = [];
    
    for (const unitDocSnap of unitsSnapshot.docs) {
      const roles = await getUserRolesInUnit(userId, unitDocSnap.id);
      if (roles.length > 0) {
        userUnits.push({ unitId: unitDocSnap.id, roles });
      }
    }
    
    return userUnits;
  } catch (error) {
    console.error('Error getting user units:', error);
    return [];
  }
}

/**
 * Get all organizations where user has any role
 */
export async function getUserOrganizations(userId: string): Promise<Array<{ organizationId: string; roles: UserRole[] }>> {
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
    
    const userOrgs: Array<{ organizationId: string; roles: UserRole[] }> = [];
    
    for (const orgDocSnap of orgsSnapshot.docs) {
      const roles = await getUserRolesInOrganization(userId, orgDocSnap.id);
      if (roles.length > 0) {
        userOrgs.push({ organizationId: orgDocSnap.id, roles });
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

/**
 * Get all permissions for a set of roles (union of all permissions)
 */
export function getPermissionsForRoles(roles: UserRole[]): Permission[] {
  const permissions = new Set<Permission>();
  
  for (const role of roles) {
    const rolePerms = rolePermissions[role];
    for (const perm of rolePerms) {
      permissions.add(perm);
    }
  }
  
  return Array.from(permissions);
}
