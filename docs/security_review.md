# Security Review Report

This report evaluates the security posture of SafeReport NG Phase 2.

## 1. Authentication & Authorization
- **Authentication**: Powered by Firebase Auth. All sensitive routes are guarded by `AdminAuthGuard` or unit-specific guards.
- **Authorization**: Implemented via a robust RBAC system with 6 hierarchical roles. Permissions are evaluated server-side and enforced via Firestore Security Rules.

## 2. Firestore Security Rules
- **Principles**: Least privilege access.
- **Enforcement**:
  - Public can only create reports and read their own via tracking code/case number.
  - Organizations/Branches/Units can only read/write data within their hierarchy.
  - Audit logs and Timelines are append-only and immutable (no delete/update).

## 3. Data Validation
- **Commands**: All administrative actions are processed through a Command Layer that performs schema and business logic validation.
- **Types**: Strict TypeScript interfaces for all data structures.

## 4. File Security
- **Chain of Custody**: Every file upload is hashed (SHA-256) and versioned.
- **Metadata**: Comprehensive metadata (uploader, timestamp, size) is recorded.
- **Access**: Restricted via Firebase Storage rules (planned for Milestone 6).

## 5. Protection Against Common Attacks
- **XSS**: Next.js automatically sanitizes data rendered in components.
- **Injection**: Firestore's document-based structure and API-driven queries prevent traditional SQL injection.
- **Rate Limiting**: Planned for implementation via Vercel Edge Functions or Firebase Functions.

## 6. Secrets & Logging
- **Secrets**: Managed via Vercel Environment Variables. Never committed to source control.
- **Logging**: Immutable Audit Log and Case Timeline provide complete visibility into system actions.
- **Health Monitoring**: Real-time tracking of authentication and operational failures.
