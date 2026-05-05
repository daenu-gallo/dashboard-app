-- ============================================
-- Migration 009: Album-ID statt Album-Index
-- ============================================
-- Verknüpft Bilder über stabile Album-UUIDs statt fragile Positions-Indizes.
-- Verhindert Datenverlust bei Album-Operationen (hinzufügen/löschen/verschieben).
-- ============================================

-- 1. Add album_id column (nullable initially for backfill)
ALTER TABLE images ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE CASCADE;

-- 2. Backfill: link existing images to albums via gallery_id + album_index = sort_order
UPDATE images i
SET album_id = a.id
FROM albums a
WHERE i.gallery_id = a.gallery_id
  AND i.album_index = a.sort_order
  AND i.album_id IS NULL;

-- 3. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_images_album_id ON images(album_id);

-- 4. Note: album_index is kept for backwards compatibility (NAS paths use it)
-- but album_id is now the primary relationship key.
-- We do NOT drop album_index to preserve NAS path resolution.
