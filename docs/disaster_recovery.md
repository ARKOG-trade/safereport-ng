# Disaster Recovery Documentation

This document outlines the backup, restore, and incident response procedures for SafeReport NG.

## 1. Backup Strategy

### Firestore Backups
- **Mechanism**: Google Cloud Firestore Managed Backups.
- **Schedule**: Daily automated backups.
- **Retention**: 30 days.
- **Scope**: All collections (Reports, Organizations, Audit Logs, etc.).

### File Storage Backups
- **Mechanism**: Firebase Storage (GCS) Versioning.
- **Scope**: All evidence files and organization logos.
- **Retention**: Permanent (via versioning).

## 2. Restore Procedure

### Firestore Restore
1. Identify the target backup timestamp.
2. Use the Google Cloud Console or `gcloud` CLI to initiate a restore to a new database or overwrite the current one.
3. Verify data integrity after restore.

### File Restore
1. Access the Firebase Storage console.
2. Navigate to the specific file and select the desired version.
3. Restore the version as the current active file.

## 3. Secret Rotation

### Procedures
- **Firebase Service Account**: Rotate annually via Google Cloud IAM.
- **Vercel API Tokens**: Rotate every 90 days.
- **External API Keys (SMS/Email)**: Rotate if compromise is suspected or every 180 days.

## 4. Incident Response

### Priority 1: System Down
1. **Detection**: Health Service records `SYSTEM_ERROR` or `FIRESTORE_FAILURE`.
2. **Alerting**: Automated alerts to Super Admin.
3. **Action**: Verify Vercel status, check Firestore availability, and revert latest deployment if necessary.

### Priority 2: Data Breach
1. **Detection**: Audit Log shows suspicious administrative activity.
2. **Action**: Revoke compromised user sessions, rotate affected secrets, and notify relevant organizations.

### Priority 3: Service Failure (SMS/Email)
1. **Detection**: Health Service records `NOTIFICATION_FAILURE`.
2. **Action**: Check external provider status, verify API keys, and process the failed delivery queue.
