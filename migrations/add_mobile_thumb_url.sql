-- Add mobile_thumb_url column to images table for mobile-optimized thumbnails (600px)
-- This column stores the URL path for the smaller mobile thumbnail version
-- Run this BEFORE deploying the updated server.js and running the migration script

ALTER TABLE images ADD COLUMN IF NOT EXISTS mobile_thumb_url TEXT;

-- Optional: Add comment for documentation
COMMENT ON COLUMN images.mobile_thumb_url IS 'URL path to mobile-optimized thumbnail (600px, q75). Used for faster loading on mobile devices.';
