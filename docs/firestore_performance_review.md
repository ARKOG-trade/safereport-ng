# Firestore Performance Review & Optimization Recommendations

This document outlines the current state of Firestore usage in SafeReport NG and provides recommendations for maintaining high performance as the platform scales.

## Current Firestore Usage Patterns

### Reads
- **High Frequency**: `reportTimelines`, `notifications`, `caseMessages` (via real-time listeners)
- **Medium Frequency**: `reports`, `organizations`, `branches`, `units` (dashboard views)
- **Low Frequency**: `auditLogs`, `slaPolicies`

### Writes
- **High Frequency**: `reportTimelines` (every action), `auditLogs` (every admin action), `notifications` (every event)
- **Medium Frequency**: `reports` (status/assignment changes), `caseMessages`
- **Low Frequency**: Hierarchy changes (org/branch/unit creation)

## Performance Bottlenecks & Risks

### 1. Document Growth
- **Risk**: `reportTimelines` and `caseMessages` grow linearly with activity.
- **Impact**: Large documents or excessive subcollections can slow down queries and increase costs.
- **Recommendation**: Implement pagination for all timeline and message views. Limit the size of individual metadata fields.

### 2. Expensive Queries
- **Risk**: Filtering reports by multiple hierarchical levels (Org -> Branch -> Unit) + status + date.
- **Impact**: Requires complex composite indexes.
- **Recommendation**: Pre-calculate counts or use flattened fields for common filters.

### 3. Missing Indexes
- **Risk**: New hierarchical queries for Milestone 2-4 will fail without indexes.
- **Recommendation**: Regularly review Firebase Console for suggested indexes. Specifically for `reportTimelines` (reportId + timestamp) and `auditLogs` (targetId + timestamp).

## Optimization Recommendations

| Area | Recommendation | Priority |
|------|----------------|----------|
| **Indexing** | Create composite indexes for all hierarchical queries (orgId + branchId + unitId + status). | **Critical** |
| **Pagination** | Use Firestore cursors (`startAfter`) for `auditLogs` and `reportTimelines`. | **High** |
| **Data Flattening** | Store `unitName` and `branchName` directly on the `Report` document to avoid extra lookups. | **Medium** |
| **Caching** | Implement local caching for hierarchy data (Organizations/Branches) which changes infrequently. | **Medium** |
| **Atomic Operations** | Use `writeBatch` or transactions for linked updates (e.g., assigning a report + creating a timeline entry). | **High** |

## Scalability Strategy

1. **Sharding**: If `caseNumber` generation becomes a bottleneck, move to a distributed counter or a sharded document approach.
2. **Archival**: Implement a TTL (Time To Live) or archival process for notifications and audit logs older than 2 years.
3. **Cold Storage**: Move resolved case timelines to a separate "archive" collection or BigQuery for long-term audit compliance.
