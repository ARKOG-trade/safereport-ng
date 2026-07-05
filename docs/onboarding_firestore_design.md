# SafeReport NG – Institutional Onboarding: Final Architectural Design

This document outlines the **final architectural design** for the institutional onboarding system, incorporating a flexible hierarchy, Role-Based Access Control (RBAC), a comprehensive and immutable audit timeline, a notifications system, **soft deletes for organizational entities**, and a **human-readable case number system** for reports. This design addresses all the latest requirements for SafeReport NG, ensuring Super Admin isolation and international scalability.

## 1. Final Firestore Schema Design

To support the new hierarchy and features, the schema introduces `units`, `auditLog`, and `notifications` collections, and modifies existing collections.

### 1.1. `organizations` Collection (Modified)

This collection stores top-level organizational entities.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` (Document ID) | `string` | Unique identifier for the organization. | `nigerianPoliceForce` |
| `name` | `string` | Full name of the organization. | `Nigerian Police Force` |
| `adminUid` | `string` | UID of the primary administrator for this organization (Organization Admin). | `orgAdminFirebaseUid` |
| `organizationType` | `string` | Type of organization for categorization (e.g., `police`, `hospital`). | `police` |
| `country` | `string` | Country where the organization is located. | `Nigeria` |
| `state` | `string` | State/Province where the organization is located. | `Anambra` |
| `city` | `string` | City where the organization is located. | `Awka` |
| `active` | `boolean` | **NEW**: Flag indicating if the entity is active. Default `true`. | `true` |
| `deletedAt` | `Timestamp` or `null` | **NEW**: Timestamp when the entity was soft-deleted. `null` if active. | `Timestamp.now()` |
| `deletedBy` | `string` or `null` | **NEW**: UID of the user who soft-deleted the entity. `null` if active. | `someUserUid` |
| `createdAt` | `Timestamp` | Server timestamp when the organization was created. | `Timestamp.now()` |
| `updatedAt` | `Timestamp` | Server timestamp of the last update. | `Timestamp.now()` |

### 1.2. `branches` Collection (Modified)

This collection stores branches belonging to an organization.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` (Document ID) | `string` | Unique identifier for the branch. | `anambraStateCommand` |
| `organizationId` | `string` | Reference to the parent organization's ID. | `nigerianPoliceForce` |
| `name` | `string` | Name of the branch. | `Anambra State Command` |
| `branchAdminUid` | `string` | UID of the primary administrator for this branch (Branch Admin). | `branchAdminFirebaseUid` |
| `active` | `boolean` | **NEW**: Flag indicating if the entity is active. Default `true`. | `true` |
| `deletedAt` | `Timestamp` or `null` | **NEW**: Timestamp when the entity was soft-deleted. `null` if active. | `Timestamp.now()` |
| `deletedBy` | `string` or `null` | **NEW**: UID of the user who soft-deleted the entity. `null` if active. | `someUserUid` |
| `createdAt` | `Timestamp` | Server timestamp when the branch was created. | `Timestamp.now()` |
| `updatedAt` | `Timestamp` | Server timestamp of the last update. | `Timestamp.now()` |

### 1.3. `units` Collection (Modified)

This collection stores operational units belonging to a branch. Units are optional.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` (Document ID) | `string` | Unique identifier for the unit. | `cid` |
| `branchId` | `string` | Reference to the parent branch's ID. | `anambraStateCommand` |
| `organizationId` | `string` | Reference to the parent organization's ID (for easier querying). | `nigerianPoliceForce` |
| `name` | `string` | Name of the unit. | `CID` |
| `members` | `string[]` | Array of Firebase Authentication UIDs of unit members (Officers, Dispatchers). | `['uid1', 'uid2']` |
| `unitAdminUid` | `string` | UID of the primary administrator for this unit (Unit Admin). | `unitAdminFirebaseUid` |
| `roles` | `Map<string, string[]>` | Map of UIDs to an array of roles (e.g., `{ 'uid1': ['officer'], 'uid2': ['dispatcher'] }`). | `{ 'uid1': ['officer'] }` |
| `active` | `boolean` | **NEW**: Flag indicating if the entity is active. Default `true`. | `true` |
| `deletedAt` | `Timestamp` or `null` | **NEW**: Timestamp when the entity was soft-deleted. `null` if active. | `Timestamp.now()` |
| `deletedBy` | `string` or `null` | **NEW**: UID of the user who soft-deleted the entity. `null` if active. | `someUserUid` |
| `createdAt` | `Timestamp` | Server timestamp when the unit was created. | `Timestamp.now()` |
| `updatedAt` | `Timestamp` | Server timestamp of the last update. | `Timestamp.now()` |

### 1.4. `reports` Collection (Modified)

The existing `reports` collection will be updated to reflect the flexible assignment, unassigned state, and include a human-readable case number.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `caseNumber` | `string` | **NEW**: Human-readable, auto-generated case number. | `SRN-2026-AN-000001` |
| `organizationId` | `string` or `null` | Reference to the assigned organization's ID, `null` if unassigned. | `nigerianPoliceForce` or `null` |
| `branchId` | `string` or `null` | Reference to the assigned branch's ID, `null` if unassigned. | `anambraStateCommand` or `null` |
| `unitId` | `string` or `null` | Reference to the assigned unit's ID, `null` if unassigned. | `cid` or `null` |
| `status` | `string` | Default to `unassigned` for new public reports. | `unassigned` |
| `assignedTo` | `string` | Stores the name of the lowest level assigned entity (Organization, Branch, or Unit). | `CID` or `Anambra State Command` |

### 1.5. `auditLog` Collection (NEW)

This collection will store a comprehensive and immutable audit trail for all critical actions.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` (Document ID) | `string` | Unique identifier for the audit entry. | `auto-generated` |
| `action` | `string` | Description of the action performed. | `organization_created`, `officer_added`, `report_assigned`, `organization_deactivated` |
| `timestamp` | `Timestamp` | Server timestamp when the action occurred. | `Timestamp.now()` |
| `userId` | `string` or `null` | UID of the user who performed the action, `null` for public submissions. | `someUserUid` |
| `details` | `Map<string, any>` | Object with relevant details (e.g., `entityId`, `entityType`, `oldValue`, `newValue`). | `{ organizationId: 'org1', name: 'New Org' }` |

### 1.6. `notifications` Collection (NEW)

This collection will store notifications for relevant users.

| Field Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| `id` (Document ID) | `string` | Unique identifier for the notification. | `auto-generated` |
| `userId` | `string` | UID of the recipient. | `someUserUid` |
| `reportId` | `string` or `null` | Reference to the related report's ID. | `report123` |
| `type` | `string` | Type of notification (e.g., `new_report`, `report_assigned`). | `report_assigned` |
| `message` | `string` | Human-readable notification message. | `Report #123 assigned to CID.` |
| `read` | `boolean` | Flag indicating if the notification has been read. | `false` |
| `createdAt` | `Timestamp` | Server timestamp when the notification was created. | `Timestamp.now()` |

## 2. Final Firestore Security Rules Design (RBAC-focused)

The security rules will be significantly updated to enforce the new hierarchical structure, Role-Based Access Control (RBAC), comprehensive audit logging, and soft deletion. The Super Admin's access is explicitly handled outside the institutional hierarchy.

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Helper Functions for Roles and Hierarchy ---

    function isAuthenticated() {
      return request.auth != null;
    }

    function isSuperAdmin() {
      // Super Admin is identified by a specific email, existing outside the institutional hierarchy
      return isAuthenticated() && request.auth.token.email == 'admin@safereport.ng';
    }

    function getOrgData(orgId) {
      return get(/databases/$(database)/documents/organizations/$(orgId)).data;
    }

    function getBranchData(branchId) {
      return get(/databases/$(database)/documents/branches/$(branchId)).data;
    }

    function getUnitData(unitId) {
      return get(/databases/$(database)/documents/units/$(unitId)).data;
    }

    function isOrgAdmin(orgId) {
      return isAuthenticated() && getOrgData(orgId).adminUid == request.auth.uid;
    }

    function isBranchAdmin(branchId) {
      return isAuthenticated() && getBranchData(branchId).branchAdminUid == request.auth.uid;
    }

    function isUnitAdmin(unitId) {
      return isAuthenticated() && getUnitData(unitId).unitAdminUid == request.auth.uid;
    }

    function isUnitMember(unitId) {
      return isAuthenticated() && request.auth.uid in getUnitData(unitId).members;
    }

    function hasRole(unitId, role) {
      return isAuthenticated() && request.auth.uid in getUnitData(unitId).roles && getUnitData(unitId).roles[request.auth.uid].hasAny([role]);
    }

    // --- Collection Rules ---

    // Organizations Collection Rules
    match /organizations/{orgId} {
      allow create: if isSuperAdmin();
      allow read: if isSuperAdmin() || (resource.data.active == true && isOrgAdmin(orgId));
      allow update: if isSuperAdmin() || (resource.data.active == true && isOrgAdmin(orgId));
      allow delete: if isSuperAdmin(); // Hard delete only for Super Admin, soft delete for others
    }

    // Branches Collection Rules
    match /branches/{branchId} {
      allow create: if isSuperAdmin() || isOrgAdmin(request.resource.data.organizationId);
      allow read: if isSuperAdmin() || (resource.data.active == true && (isOrgAdmin(resource.data.organizationId) || isBranchAdmin(branchId)));
      allow update: if isSuperAdmin() || (resource.data.active == true && (isOrgAdmin(resource.data.organizationId) || isBranchAdmin(branchId)));
      allow delete: if isSuperAdmin(); // Hard delete only for Super Admin, soft delete for others
    }

    // Units Collection Rules
    match /units/{unitId} {
      allow create: if isSuperAdmin() || isOrgAdmin(request.resource.data.organizationId) || isBranchAdmin(request.resource.data.branchId);
      allow read: if isSuperAdmin() || (resource.data.active == true && (isOrgAdmin(resource.data.organizationId) || isBranchAdmin(resource.data.branchId) || isUnitAdmin(unitId) || isUnitMember(unitId)));
      allow update: if isSuperAdmin() || (resource.data.active == true && (isOrgAdmin(resource.data.organizationId) || isBranchAdmin(resource.data.branchId) || isUnitAdmin(unitId)));
      allow delete: if isSuperAdmin(); // Hard delete only for Super Admin, soft delete for others
    }

    // Reports Collection Rules
    match /reports/{reportId} {
      // Public users can create reports anonymously with unassigned status and auto-generated caseNumber
      allow create: if request.auth == null &&
                       request.resource.data.status == 'unassigned' &&
                       request.resource.data.organizationId == null &&
                       request.resource.data.branchId == null &&
                       request.resource.data.unitId == null &&
                       request.resource.data.caseNumber is string &&
                       request.resource.data.caseNumber.matches('SRN-\d{4}-[A-Z]{2}-\d{6}');

      // Read permissions based on roles and hierarchy
      allow read: if isSuperAdmin() ||
                  // Org Admin can view all reports in their organization
                  (resource.data.organizationId != null && isOrgAdmin(resource.data.organizationId)) ||
                  // Branch Admin can view all reports in their branch
                  (resource.data.branchId != null && isBranchAdmin(resource.data.branchId)) ||
                  // Unit Admin/Dispatcher/Officer can view reports assigned to their unit
                  (resource.data.unitId != null && (isUnitAdmin(resource.data.unitId) || isUnitMember(resource.data.unitId)));

      // Update permissions based on roles and hierarchy
      allow update: if isSuperAdmin() ||
                      // Org Admin can assign reports within their organization
                      (resource.data.organizationId != null && isOrgAdmin(resource.data.organizationId) && request.resource.data.organizationId == resource.data.organizationId) ||
                      // Branch Admin can assign reports within their branch
                      (resource.data.branchId != null && isBranchAdmin(resource.data.branchId) && request.resource.data.branchId == resource.data.branchId) ||
                      // Dispatcher can assign/reassign reports within their unit/branch
                      (resource.data.unitId != null && hasRole(resource.data.unitId, 'dispatcher')) ||
                      // Officer can update status/add notes to assigned reports
                      (resource.data.unitId != null && hasRole(resource.data.unitId, 'officer') && request.resource.data.status != resource.data.status);

      // Only Super Admin can delete reports
      allow delete: if isSuperAdmin();
    }

    // Audit Log Collection Rules (Immutable)
    match /auditLog/{auditId} {
      allow create: if isAuthenticated(); // Any authenticated user can create audit entries for actions they perform
      allow read: if isSuperAdmin() ||
                  // Org Admin can read audit logs for entities in their organization
                  (request.resource.data.organizationId != null && isOrgAdmin(request.resource.data.organizationId)) ||
                  // Branch Admin can read audit logs for entities in their branch
                  (request.resource.data.branchId != null && isBranchAdmin(request.resource.data.branchId)) ||
                  // Unit Admin/Member can read audit logs for entities in their unit
                  (request.resource.data.unitId != null && (isUnitAdmin(request.resource.data.unitId) || isUnitMember(request.resource.data.unitId)));
      allow update, delete: if false; // Audit log is immutable
    }

    // Notifications Collection Rules
    match /notifications/{notificationId} {
      allow create: if isAuthenticated(); // Any authenticated user can create notifications for relevant events
      allow read: if isAuthenticated() && request.auth.uid == resource.data.userId;
      allow update: if isAuthenticated() && request.auth.uid == resource.data.userId && request.resource.data.keys().hasOnly(['read']); // Only allow marking as read
      allow delete: if false; // Notifications are not deleted by users
    }
  }
}
```

## 3. Final Implementation Plan

This final design will be implemented in the following phases:

1.  **Schema Implementation**: Create the new `units`, `auditLog`, and `notifications` collections in Firestore. Update the `organizations`, `branches`, and `reports` collections with the modified fields, including `country`, `state`, `city`, `active`, `deletedAt`, `deletedBy` for organizations/branches/units, and `caseNumber` for reports.
2.  **Security Rules Deployment**: Deploy the new Firestore security rules to enforce the defined access control, RBAC, audit log immutability, and soft deletion logic.
3.  **Admin Onboarding Dashboard**: Build a new section in the Admin dashboard for managing organizations, branches, and units. This will include functionalities for:
    *   Creating, viewing, and editing organizations (including `organizationType`, `country`, `state`, `city`, and `adminUid`).
    *   Creating, viewing, and editing branches under organizations (including `branchAdminUid`).
    *   Creating, viewing, and editing units under branches (including `members`, `unitAdminUid`, and `roles`).
    *   Managing user roles (Dispatcher, Officer) within units.
    *   **Soft Deletion**: Implement functionality to soft-delete organizations, branches, and units, updating their `active`, `deletedAt`, and `deletedBy` fields.
    *   **Audit Logging**: Every creation, edit, and soft-delete action in this dashboard will trigger an `auditLog` entry.
4.  **Report Submission Modification**: Update the public report submission process (`reportService.ts`) to:
    *   Generate a unique `caseNumber` (e.g., `SRN-YYYY-XX-NNNNNN`).
    *   Create reports with `status="unassigned"`, `organizationId=null`, `branchId=null`, `unitId=null`, and `assignedTo="Unassigned"`.
5.  **Report Assignment Logic**: Implement functionality in the Admin dashboard to assign unassigned reports to specific organizations, branches, or units. This will update the `organizationId`, `branchId`, `unitId`, `status`, and `assignedTo` fields of the report. This action will also trigger an `auditLog` entry and `notifications`.
6.  **Role-Based Access Control (RBAC) Integration**: Integrate RBAC throughout the application, ensuring that UI elements and available actions are dynamically adjusted based on the logged-in user's roles and permissions.
7.  **Dashboard Updates**: Update the existing Admin and Institution (now Unit) dashboards to:
    *   Filter reports based on the logged-in user's assigned organization, branch, or unit, and their respective roles.
    *   By default, only display `active: true` organizational entities.
8.  **Audit Logging**: Implement logic to create `auditLog` entries for all significant actions (organization/branch/unit created/edited/deactivated, officer added/removed, role changes, report submission, assignment, status update, archival, etc.).
9.  **Notifications System**: Implement logic to create `notifications` for relevant events (new report, report assigned, status change) for the appropriate users.
10. **Testing**: Thoroughly test all new functionalities, including creation, reading, updating, and soft-deletion of hierarchical entities, user role management, report assignment, RBAC enforcement, comprehensive audit logging, and notification generation, ensuring compliance with the final security rules.

This comprehensive plan provides a structured approach to integrating the advanced institutional onboarding system with enhanced security, flexibility, and scalability, addressing all the architectural improvements requested. The Super Admin remains external to the hierarchy, and the system is ready for international expansion with robust data management capabilities.
