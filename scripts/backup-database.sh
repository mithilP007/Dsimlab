#!/bin/bash
# SimLab Production PostgreSQL Database Backup Automation Script
# Sets up backup directories, executes pg_dump, verifies integrity, and prunes logs.

set -euo pipefail

BACKUP_DIR="/var/backups/simlab"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="simlab-postgres"
DB_NAME="simlab"
DB_USER="postgres"
MAX_BACKUPS=30

echo "=== Starting SimLab Database Backup at $(date) ==="

# Check if target container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo "Error: Container ${DB_CONTAINER} is not running!" >&2
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

BACKUP_FILE="${BACKUP_DIR}/simlab_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

echo "Executing pg_dump snapshot on container ${DB_CONTAINER}..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"

# Verification
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "Error: Database backup file is empty or failed to generate!" >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

echo "Verifying schema consistency (checking for CREATE TABLE presence)..."
if ! grep -q "CREATE TABLE" "${BACKUP_FILE}"; then
  echo "Warning: Schema verification failed! SQL file lacks expected 'CREATE TABLE' statements." >&2
fi

echo "Compressing SQL snapshot..."
gzip -f "${BACKUP_FILE}"

echo "Backup generated successfully: ${COMPRESSED_FILE} (Size: $(du -sh "${COMPRESSED_FILE}" | cut -f1))"

# Prune old backups
echo "Pruning database backups older than ${MAX_BACKUPS} days..."
find "${BACKUP_DIR}" -name "simlab_backup_*.sql.gz" -type f -mtime +${MAX_BACKUPS} -delete

echo "=== Backup Operation Finished Successfully ==="
