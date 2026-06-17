# SimLab Database Backup & Disaster Recovery Playbook

This document describes the backup protocols, verification procedures, and database restoration playbooks for the SimLab platform.

---

## 1. Backup Architecture & Storage Policies

SimLab uses a dual-backup strategy covering:
1. **Relational Database State**: Hourly logic exports of PostgreSQL schemas and records via `pg_dump`.
2. **Uploaded Assets**: Weekly synchronization of the `uploads/certificates/` directory.

### Backup Retention & Rotation Limits
- Hourly backups are retained for **7 days**.
- Daily backups are retained for **30 days**.
- Monthly backups are retained for **365 days**.

---

## 2. Automated Backup Script

The script below performs a database dump, compresses the output, and uploads it to secure cloud storage (e.g. S3).

```bash
#!/bin/bash
# file: scripts/backup-db.sh
set -e

BACKUP_DIR="/tmp/simlab-backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATABASE_NAME="simlab"
BACKUP_FILE="${BACKUP_DIR}/${DATABASE_NAME}_backup_${TIMESTAMP}.sql.gz"
S3_BUCKET="s3://simlab-production-backups/database/"

# 1. Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# 2. Execute pg_dump
echo "[INFO] Commencing pg_dump for database '${DATABASE_NAME}'..."
pg_dump -h localhost -U postgres -d "${DATABASE_NAME}" -F p | gzip > "${BACKUP_FILE}"

# 3. Upload to AWS S3 (uses IAM roles configured on host machine)
echo "[INFO] Uploading backup archive to S3..."
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}"

# 4. Clean up local copy
rm -f "${BACKUP_FILE}"
echo "[SUCCESS] Backup successfully executed and synced."
```

---

## 3. Data Restoration Playbook

Follow these steps to recover database states from a backup file in the event of database corruption or hardware failure.

### Phase A: Isolate the Platform
1. Stop the backend server to prevent incoming connections.
2. Put the frontend into Maintenance Mode.

### Phase B: Download the Target Backup Archive
```bash
aws s3 cp s3://simlab-production-backups/database/simlab_backup_20260617_210000.sql.gz ./target_backup.sql.gz
gunzip target_backup.sql.gz
```

### Phase C: Re-create Database & Restore Records
```bash
# Connect to PostgreSQL instance
psql -h localhost -U postgres

# Drop existing database
DROP DATABASE simlab;

# Recreate blank database schema
CREATE DATABASE simlab;
\q

# Restore data from SQL backup
psql -h localhost -U postgres -d simlab -f ./target_backup.sql
```

---

## 4. Verification & Mock Restores

Backups must be verified quarterly.
1. Deploy a sandbox PostgreSQL database.
2. Restore the latest backup using the Restoration Playbook above.
3. Query users count and verify certificate verify hash match.
