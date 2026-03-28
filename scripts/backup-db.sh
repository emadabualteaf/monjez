#!/bin/bash
# Daily PostgreSQL Backup Script for Monjez
# Add to cron: 0 2 * * * /home/runner/workspace/scripts/backup-db.sh

BACKUP_DIR="/home/runner/workspace/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/monjez_backup_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# Create compressed backup
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "[$(date)] ✅ Backup successful: $BACKUP_FILE"
  # Keep only last 7 backups
  ls -t "$BACKUP_DIR"/monjez_backup_*.sql.gz | tail -n +8 | xargs -r rm
  echo "[$(date)] 📂 Backup count: $(ls $BACKUP_DIR/monjez_backup_*.sql.gz 2>/dev/null | wc -l)"
else
  echo "[$(date)] ❌ Backup FAILED"
  exit 1
fi
