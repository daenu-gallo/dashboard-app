-- Gallery Views Tracking Table
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS gallery_views (
  id BIGSERIAL PRIMARY KEY,
  gallery_id BIGINT REFERENCES galleries(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  visitor_id TEXT,          -- anonymous hash for unique visitor counting
  referrer TEXT,
  user_agent TEXT,
  country TEXT
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_gallery_views_gallery_id ON gallery_views(gallery_id);
CREATE INDEX IF NOT EXISTS idx_gallery_views_viewed_at ON gallery_views(viewed_at);

-- Enable Row Level Security
ALTER TABLE gallery_views ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (customers viewing galleries)
CREATE POLICY "Anyone can insert views" ON gallery_views
  FOR INSERT WITH CHECK (true);

-- Only gallery owner can read views
CREATE POLICY "Gallery owner can read views" ON gallery_views
  FOR SELECT USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE user_id = auth.uid()
    )
  );
