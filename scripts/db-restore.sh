#!/bin/bash
# ============================================
# Supabase PostgreSQL Restore Script
# Fotohahn Gallery Platform
# ============================================
#
# Stellt eine Datenbank aus einem Backup wieder her.
#
# Verwendung:
#   ./db-restore.sh /mnt/nas/onlinegalerie/_backups/db/supabase_backup_2026-03-23_030000.sql.gz
#
# ============================================

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Verwendung: $0 <backup-datei.sql.gz>"
  echo ""
  echo "Verfügbare Backups:"
  ls -lh /mnt/nas/onlinegalerie/_backups/db/supabase_backup_*.sql.gz 2>/dev/null || echo "  Keine Backups gefunden"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "FEHLER: Datei nicht gefunden: $BACKUP_FILE"
  exit 1
fi

# PostgreSQL Container finden
DB_CONTAINER=$(docker ps --filter "name=supabase" --filter "name=db" --format "{{.Names}}" | grep -i "db" | head -1)

if [ -z "$DB_CONTAINER" ]; then
  for name in "supabase-db" "supabase_db" "supabase-db-1"; do
    if docker ps --format "{{.Names}}" | grep -q "^${name}$"; then
      DB_CONTAINER="$name"
      break
    fi
  done
fi

if [ -z "$DB_CONTAINER" ]; then
  echo "FEHLER: Kein Supabase-DB Container gefunden!"
  exit 1
fi

echo "⚠️  ACHTUNG: Dies wird die aktuelle Datenbank ÜBERSCHREIBEN!"
echo "  Backup: $BACKUP_FILE"
echo "  Container: $DB_CONTAINER"
echo ""
read -p "Fortfahren? (ja/nein): " CONFIRM

if [ "$CONFIRM" != "ja" ]; then
  echo "Abgebrochen."
  exit 0
fi

echo "[$(date)] Restore wird gestartet..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres

echo "[$(date)] ✅ Restore erfolgreich abgeschlossen!"
echo "  Quelle: $BACKUP_FILE"
