#!/bin/bash
# ============================================
# Supabase PostgreSQL Auto-Backup Script
# Fotohahn Gallery Platform
# ============================================
#
# Erstellt tägliche Backups der Supabase-Datenbank
# und speichert sie auf dem NAS.
#
# Installation:
#   1. Script auf den Server kopieren:
#      scp scripts/db-backup.sh user@debian:/opt/fotohahn/db-backup.sh
#
#   2. Ausführbar machen:
#      chmod +x /opt/fotohahn/db-backup.sh
#
#   3. Cron-Job einrichten (täglich um 03:00 Uhr):
#      crontab -e
#      0 3 * * * /opt/fotohahn/db-backup.sh >> /var/log/fotohahn-backup.log 2>&1
#
# ============================================

set -euo pipefail

# --- Konfiguration ---
BACKUP_DIR="/mnt/nas/onlinegalerie/_backups/db"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="supabase_backup_${TIMESTAMP}.sql.gz"

# PostgreSQL Container — Coolify benennt Container nach Schema
# Finde den Supabase-DB Container automatisch
DB_CONTAINER=$(docker ps --filter "name=supabase" --filter "name=db" --format "{{.Names}}" | grep -i "db" | head -1)

# Fallback: versuche gängige Container-Namen
if [ -z "$DB_CONTAINER" ]; then
  for name in "supabase-db" "supabase_db" "supabase-db-1"; do
    if docker ps --format "{{.Names}}" | grep -q "^${name}$"; then
      DB_CONTAINER="$name"
      break
    fi
  done
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "[$(date)] FEHLER: Kein Supabase-DB Container gefunden!"
  echo "  Verfügbare Container:"
  docker ps --format "  - {{.Names}}" | grep -i "supa" || echo "  (keine Supabase-Container)"
  exit 1
fi

# --- Backup-Verzeichnis anlegen ---
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starte Backup..."
echo "  Container: $DB_CONTAINER"
echo "  Ziel: $BACKUP_DIR/$BACKUP_FILE"

# --- pg_dump ausführen ---
docker exec "$DB_CONTAINER" pg_dump \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -F plain \
  | gzip > "$BACKUP_DIR/$BACKUP_FILE"

# --- Backup prüfen ---
FILESIZE=$(stat -c%s "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_DIR/$BACKUP_FILE" 2>/dev/null)
if [ "$FILESIZE" -lt 1000 ]; then
  echo "[$(date)] WARNUNG: Backup-Datei ist sehr klein (${FILESIZE} Bytes) — möglicherweise fehlgeschlagen!"
  exit 1
fi

echo "[$(date)] Backup erfolgreich: $BACKUP_FILE ($(numfmt --to=iec $FILESIZE 2>/dev/null || echo "${FILESIZE} Bytes"))"

# --- Alte Backups löschen (älter als RETENTION_DAYS Tage) ---
DELETED=$(find "$BACKUP_DIR" -name "supabase_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] $DELETED alte Backups gelöscht (älter als ${RETENTION_DAYS} Tage)"
fi

# --- Aktuellen Stand anzeigen ---
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "supabase_backup_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo "[$(date)] Aktuelle Backups: $BACKUP_COUNT Dateien ($TOTAL_SIZE)"
echo "---"
