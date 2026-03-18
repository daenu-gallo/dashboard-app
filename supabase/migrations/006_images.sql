-- 006_images.sql
-- Bilder-Tabelle für NAS-gespeicherte Galerie-Fotos
-- Ersetzt localStorage base64-Speicherung

CREATE TABLE IF NOT EXISTS images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  album_index INT NOT NULL DEFAULT 0,
  filename TEXT NOT NULL,
  original_url TEXT NOT NULL,
  thumb_url TEXT NOT NULL,
  file_size_kb INT DEFAULT 0,
  width INT DEFAULT 0,
  height INT DEFAULT 0,
  sort_order INT DEFAULT 0,
  is_title_image BOOLEAN DEFAULT false,
  is_mobile_title BOOLEAN DEFAULT false,
  is_app_icon BOOLEAN DEFAULT false,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index für schnelles Laden nach Galerie
CREATE INDEX IF NOT EXISTS idx_images_gallery_id ON images(gallery_id);
CREATE INDEX IF NOT EXISTS idx_images_user_id ON images(user_id);

-- Row Level Security
ALTER TABLE images ENABLE ROW LEVEL SECURITY;

-- Fotografen: CRUD auf eigene Bilder
CREATE POLICY "Users manage own images" ON images
  FOR ALL USING (auth.uid() = user_id);

-- Öffentlich: Bilder lesen (für Kunden-Galerie)
CREATE POLICY "Public read images" ON images
  FOR SELECT USING (true);
