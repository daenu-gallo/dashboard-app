-- Tabelle für das Audit-Log der API-Schlüssel-Rotation
-- Speichert Historie und Status der durchgeführten Rotationen
CREATE TABLE IF NOT EXISTS key_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rotated_at TIMESTAMPTZ DEFAULT NOW(),
  rotated_keys TEXT[] NOT NULL,
  triggered_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  details JSONB,
  next_rotation_at TIMESTAMPTZ
);

-- Tabellen-Kommentar für die Dokumentation
COMMENT ON TABLE key_rotation_log IS 'Protokoll der API-Schlüssel-Rotationen für Sicherheitsaudits (Backend-only).';

-- Index für effiziente zeitbasierte Abfragen
CREATE INDEX IF NOT EXISTS idx_key_rotation_log_rotated_at ON key_rotation_log(rotated_at);

-- Row Level Security (RLS) aktivieren
ALTER TABLE key_rotation_log ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinie: Zugriff nur für Service-Rolle (Backend-only)
CREATE POLICY "Vollzugriff für Service-Rolle" ON key_rotation_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
