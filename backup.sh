#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
FILENAME="dokkadesk_${TIMESTAMP}.sql"
mkdir -p "$BACKUP_DIR"

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-password}"
DB_NAME="${DB_NAME:-postgres}"

echo "Backing up $DB_NAME to $BACKUP_DIR/$FILENAME ..."

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "$BACKUP_DIR/$FILENAME"

echo "Done: $BACKUP_DIR/$FILENAME ($(wc -c < "$BACKUP_DIR/$FILENAME") bytes)"

# Keep last 7 backups, delete older ones
find "$BACKUP_DIR" -name 'dokkadesk_*.sql' -mtime +7 -delete 2>/dev/null || true
