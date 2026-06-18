/**
 * Migration Script: Generate mobile thumbnails (600px) for all existing gallery images.
 * 
 * This script:
 * 1. Queries all images from Supabase that don't have a mobile_thumb_url
 * 2. For each image, reads the existing thumb from NAS
 * 3. Generates a 600px mobile version
 * 4. Saves it to the /mobile/ directory
 * 5. Updates the Supabase record with the mobile_thumb_url
 * 
 * Usage: node migrate-mobile-thumbs.js
 * 
 * Environment: Requires .env with SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NAS_BASE_PATH
 */

import 'dotenv/config';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const NAS_BASE = process.env.NAS_BASE_PATH || '/mnt/nas/onlinegalerie';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const ensureDir = async (dir) => {
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
};

async function migrate() {
  console.log('🚀 Starting mobile thumbnail migration...');
  console.log(`   NAS base: ${NAS_BASE}`);

  // Fetch all images that don't have mobile_thumb_url yet
  let allImages = [];
  let offset = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('images')
      .select('id, user_id, original_url, thumb_url, mobile_thumb_url, album_index, filename')
      .is('mobile_thumb_url', null)
      .range(offset, offset + PAGE_SIZE - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error('❌ Supabase query error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;
    allImages = allImages.concat(data);
    offset += PAGE_SIZE;

    if (data.length < PAGE_SIZE) break; // Last page
  }

  console.log(`📸 Found ${allImages.length} images without mobile thumbnails`);

  if (allImages.length === 0) {
    console.log('✅ Nothing to migrate — all images already have mobile thumbnails.');
    process.exit(0);
  }

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < allImages.length; i++) {
    const img = allImages[i];
    const progress = `[${i + 1}/${allImages.length}]`;

    try {
      // Parse the thumb_url to find the NAS file path
      // Format: /api/images/{userId}/{slug}/{albumIndex}/thumb/{thumbFilename}
      const thumbUrlParts = img.thumb_url.split('/');
      // Find the parts after /api/images/
      const apiIdx = thumbUrlParts.indexOf('images');
      if (apiIdx === -1 || thumbUrlParts.length < apiIdx + 5) {
        console.warn(`${progress} ⏭️ Skipping (invalid thumb_url): ${img.thumb_url}`);
        skipped++;
        continue;
      }

      const userId = thumbUrlParts[apiIdx + 1];
      const slug = thumbUrlParts[apiIdx + 2];
      const albumIndex = thumbUrlParts[apiIdx + 3];
      const thumbFilename = thumbUrlParts[thumbUrlParts.length - 1];

      // Build NAS paths
      const basePath = path.join(NAS_BASE, userId, slug, albumIndex);
      const thumbPath = path.join(basePath, 'thumb', thumbFilename);
      const mobileDir = path.join(basePath, 'mobile');

      // Check if thumb exists on NAS
      if (!existsSync(thumbPath)) {
        // Try original as fallback
        const origUrlParts = img.original_url.split('/');
        const origFilename = origUrlParts[origUrlParts.length - 1];
        const origPath = path.join(basePath, 'original', origFilename);
        
        if (!existsSync(origPath)) {
          console.warn(`${progress} ⏭️ Skipping (file not found on NAS): ${thumbPath}`);
          skipped++;
          continue;
        }

        // Use original as source
        await ensureDir(mobileDir);
        const mobileFilename = `mobile_${origFilename}`;
        const mobilePath = path.join(mobileDir, mobileFilename);

        // Check if mobile version already exists on disk
        if (existsSync(mobilePath)) {
          // Just update DB
          const mobileThumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/mobile/${mobileFilename}`;
          await supabase.from('images').update({ mobile_thumb_url: mobileThumbUrl }).eq('id', img.id);
          success++;
          if ((i + 1) % 50 === 0) console.log(`${progress} ✅ Progress: ${success} done, ${failed} failed, ${skipped} skipped`);
          continue;
        }

        await sharp(origPath)
          .rotate()
          .resize(600, null, { withoutEnlargement: true })
          .jpeg({ quality: 75, mozjpeg: true })
          .toFile(mobilePath);

        const mobileThumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/mobile/${mobileFilename}`;
        await supabase.from('images').update({ mobile_thumb_url: mobileThumbUrl }).eq('id', img.id);
        success++;
        if ((i + 1) % 50 === 0) console.log(`${progress} ✅ Progress: ${success} done, ${failed} failed, ${skipped} skipped`);
        continue;
      }

      // Generate mobile thumbnail from existing thumb
      await ensureDir(mobileDir);

      // Mobile filename: replace 'thumb_' prefix with 'mobile_'
      const mobileFilename = thumbFilename.replace(/^thumb_/, 'mobile_');
      const mobilePath = path.join(mobileDir, mobileFilename);

      // Check if mobile version already exists on disk
      if (existsSync(mobilePath)) {
        // Just update DB
        const mobileThumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/mobile/${mobileFilename}`;
        await supabase.from('images').update({ mobile_thumb_url: mobileThumbUrl }).eq('id', img.id);
        success++;
        if ((i + 1) % 50 === 0) console.log(`${progress} ✅ Progress: ${success} done, ${failed} failed, ${skipped} skipped`);
        continue;
      }

      // Resize thumb (1200px) down to mobile (600px)
      await sharp(thumbPath)
        .resize(600, null, { withoutEnlargement: true })
        .jpeg({ quality: 75, mozjpeg: true })
        .toFile(mobilePath);

      // Build mobile URL and update DB
      const mobileThumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/mobile/${mobileFilename}`;
      const { error: updateErr } = await supabase
        .from('images')
        .update({ mobile_thumb_url: mobileThumbUrl })
        .eq('id', img.id);

      if (updateErr) {
        console.error(`${progress} ❌ DB update error for image ${img.id}:`, updateErr);
        failed++;
      } else {
        success++;
      }

      // Progress log every 50 images
      if ((i + 1) % 50 === 0) {
        console.log(`${progress} ✅ Progress: ${success} done, ${failed} failed, ${skipped} skipped`);
      }

    } catch (err) {
      console.error(`${progress} ❌ Error processing image ${img.id}:`, err.message);
      failed++;
    }
  }

  console.log('\n══════════════════════════════════════════');
  console.log(`✅ Migration complete!`);
  console.log(`   ✅ Success: ${success}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   📸 Total:   ${allImages.length}`);
  console.log('══════════════════════════════════════════\n');
}

migrate().catch(err => {
  console.error('💥 Migration crashed:', err);
  process.exit(1);
});
