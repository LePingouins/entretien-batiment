#!/usr/bin/env bash
set -euo pipefail

# Simple backup script for the entretien Postgres container.
# Usage: run as root or a user with docker rights.

BACKUP_DIR=/root/entretien-batiment/uploads/backups
TMP=/tmp/entretien_pg_backup.sql
DATE=$(date +%F_%H%M)
RETENTION_DAYS=${RETENTION_DAYS:-14}
DB_CONTAINER=${DB_CONTAINER:-entretien-db}
DB_USER=${DB_USER:-entretien_user}
DB_NAME=${DB_NAME:-entretien}

mkdir -p "$BACKUP_DIR"
chown root:root "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Dump
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" -F p -f /tmp/entretien_pg_backup.sql

# Copy out and compress
docker cp "$DB_CONTAINER":/tmp/entretien_pg_backup.sql "$TMP"
gzip -c "$TMP" > "$BACKUP_DIR"/entretien_pg_backup_${DATE}.sql.gz
rm -f "$TMP"

# Set strict perms
chown root:root "$BACKUP_DIR"/entretien_pg_backup_${DATE}.sql.gz
chmod 600 "$BACKUP_DIR"/entretien_pg_backup_${DATE}.sql.gz

# Rotate old backups
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete || true

# Exit cleanly
exit 0
