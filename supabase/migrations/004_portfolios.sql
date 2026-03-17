-- Portfolios Table
-- Run this SQL in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS portfolios (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  brand TEXT DEFAULT '',
  password TEXT DEFAULT '',
  language TEXT DEFAULT 'Deutsch',
  domain TEXT DEFAULT '',
  domain_path TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  cover_image TEXT,           -- base64 or URL of cover image
  cover_image_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- Enable Row Level Security
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

-- Only owners can CRUD their portfolios
CREATE POLICY "Users can manage own portfolios" ON portfolios
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
