import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, createReadStream } from 'fs';
import crypto from 'crypto';

// ── Config ──
const PORT = process.env.PORT || 3200;
const NAS_BASE = process.env.NAS_BASE_PATH || '/mnt/nas/onlinegalerie';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

// Debug: Log env vars on startup
console.log('🔧 Environment variables:');
console.log(`   PORT=${PORT}`);
console.log(`   NAS_BASE_PATH=${NAS_BASE}`);
console.log(`   SUPABASE_URL=${SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : '❌ NOT SET'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   SUPABASE_JWT_SECRET=${JWT_SECRET ? '✅ SET' : '❌ NOT SET'}`);

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  console.log('✅ Supabase client created');
} else {
  console.error('⚠️  Supabase credentials missing! API will start but uploads won\'t work.');
}

const app = express();
app.use(cors());
app.use(express.json());

// ── JWT Auth Middleware ──
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('❌ Auth: Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.slice(7);
  console.log(`🔐 Auth: Verifying token (${token.substring(0, 20)}...) via ${SUPABASE_URL}`);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error('❌ Auth: Supabase returned error:', JSON.stringify(error));
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    if (!data?.user) {
      console.error('❌ Auth: No user returned from Supabase');
      return res.status(401).json({ error: 'Invalid token', details: 'No user found' });
    }
    console.log(`✅ Auth: User verified: ${data.user.email}`);
    req.user = data.user;
    next();
  } catch (err) {
    console.error('❌ Auth: Exception:', err.message, err.stack);
    return res.status(401).json({ error: 'Auth failed', details: err.message });
  }
};

// ── Multer: temp upload to /tmp ──
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  },
});

// ── Helper: Ensure directory exists ──
const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

// ── Helper: Build NAS path ──
const buildNasPath = (userId, gallerySlug, albumIndex) => {
  return path.join(NAS_BASE, userId, gallerySlug, String(albumIndex));
};

// ── POST /api/upload/:galleryId/:albumIndex ──
// Upload multiple images, generate thumbnails, save to NAS, insert into Supabase
app.post('/api/upload/:galleryId/:albumIndex', authenticate, upload.array('images', 100), async (req, res) => {
  const { galleryId, albumIndex } = req.params;
  const userId = req.user.id;

  try {
    // Verify gallery ownership
    const { data: gallery, error: gErr } = await supabase
      .from('galleries')
      .select('id, slug, user_id')
      .eq('id', galleryId)
      .single();

    if (gErr || !gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }
    if (gallery.user_id !== userId) {
      return res.status(403).json({ error: 'Not your gallery' });
    }

    const slug = gallery.slug;
    const basePath = buildNasPath(userId, slug, albumIndex);
    const originalDir = path.join(basePath, 'original');
    const thumbDir = path.join(basePath, 'thumb');
    await ensureDir(originalDir);
    await ensureDir(thumbDir);

    // Get current max sort_order for this gallery+album
    const { data: existing } = await supabase
      .from('images')
      .select('sort_order')
      .eq('gallery_id', galleryId)
      .eq('album_index', Number(albumIndex))
      .order('sort_order', { ascending: false })
      .limit(1);
    let nextSort = (existing?.[0]?.sort_order ?? -1) + 1;

    const results = [];
    for (const file of req.files) {
      // Generate unique filename
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const hash = crypto.randomBytes(6).toString('hex');
      const safeName = file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(ext, '');
      const filename = `${safeName}_${hash}${ext}`;

      // Process with sharp
      const metadata = await sharp(file.path).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Save original (re-encode to strip metadata, convert HEIC etc.)
      const originalPath = path.join(originalDir, filename);
      await sharp(file.path)
        .rotate() // Auto-rotate based on EXIF
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(originalPath);

      // Generate thumbnail (400px wide)
      const thumbFilename = `thumb_${filename}`;
      const thumbPath = path.join(thumbDir, thumbFilename);
      await sharp(file.path)
        .rotate()
        .resize(400, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbPath);

      // Calculate file size
      const stat = await fs.stat(originalPath);
      const fileSizeKb = Math.round(stat.size / 1024);

      // Build URLs (relative to API base)
      const originalUrl = `/api/images/${userId}/${slug}/${albumIndex}/original/${filename}`;
      const thumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/thumb/${thumbFilename}`;

      // Insert into Supabase
      const { data: imgRow, error: insertErr } = await supabase
        .from('images')
        .insert({
          gallery_id: galleryId,
          album_index: Number(albumIndex),
          filename: file.originalname,
          original_url: originalUrl,
          thumb_url: thumbUrl,
          file_size_kb: fileSizeKb,
          width,
          height,
          sort_order: nextSort++,
          user_id: userId,
        })
        .select()
        .single();

      if (insertErr) {
        console.error('[Upload] DB insert error:', insertErr);
      }

      results.push(imgRow || { filename, originalUrl, thumbUrl });

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {});
    }

    res.json({ success: true, images: results });
  } catch (err) {
    console.error('[Upload] Error:', err);
    // Clean up temp files on error
    for (const file of (req.files || [])) {
      await fs.unlink(file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// ── GET /api/images/:userId/:slug/:albumIndex/:type/:filename ──
// Serve images from NAS (type = 'original' or 'thumb')
app.get('/api/images/:userId/:slug/:albumIndex/:type/:filename', (req, res) => {
  const { userId, slug, albumIndex, type, filename } = req.params;

  if (!['original', 'thumb'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const filePath = path.join(NAS_BASE, userId, slug, albumIndex, type, filename);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Cache headers (images don't change)
  res.set({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': 'image/jpeg',
  });

  createReadStream(filePath).pipe(res);
});

// ── DELETE /api/images/:imageId ──
// Delete a single image from NAS + Supabase
app.delete('/api/images/:imageId', authenticate, async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user.id;

  try {
    // Fetch image record
    const { data: img, error: fetchErr } = await supabase
      .from('images')
      .select('*, galleries!inner(slug)')
      .eq('id', imageId)
      .single();

    if (fetchErr || !img) {
      return res.status(404).json({ error: 'Image not found' });
    }
    if (img.user_id !== userId) {
      return res.status(403).json({ error: 'Not your image' });
    }

    const slug = img.galleries.slug;
    const basePath = buildNasPath(userId, slug, String(img.album_index));

    // Delete files from NAS
    const originalFilename = path.basename(img.original_url);
    const thumbFilename = path.basename(img.thumb_url);
    await fs.unlink(path.join(basePath, 'original', originalFilename)).catch(() => {});
    await fs.unlink(path.join(basePath, 'thumb', thumbFilename)).catch(() => {});

    // Delete from Supabase
    const { error: delErr } = await supabase
      .from('images')
      .delete()
      .eq('id', imageId);

    if (delErr) {
      return res.status(500).json({ error: 'DB delete failed' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[Delete] Error:', err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ── PATCH /api/images/:imageId ──
// Update image flags (title, mobile, app-icon)
app.patch('/api/images/:imageId', authenticate, async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user.id;
  const updates = {};

  if ('is_title_image' in req.body) updates.is_title_image = req.body.is_title_image;
  if ('is_mobile_title' in req.body) updates.is_mobile_title = req.body.is_mobile_title;
  if ('is_app_icon' in req.body) updates.is_app_icon = req.body.is_app_icon;
  if ('sort_order' in req.body) updates.sort_order = req.body.sort_order;

  try {
    // Verify ownership
    const { data: img } = await supabase
      .from('images')
      .select('user_id, gallery_id, album_index')
      .eq('id', imageId)
      .single();

    if (!img || img.user_id !== userId) {
      return res.status(403).json({ error: 'Not your image' });
    }

    // If setting a flag, clear it from other images in same gallery+album first
    if (updates.is_title_image) {
      await supabase.from('images')
        .update({ is_title_image: false })
        .eq('gallery_id', img.gallery_id)
        .eq('album_index', img.album_index);
    }
    if (updates.is_mobile_title) {
      await supabase.from('images')
        .update({ is_mobile_title: false })
        .eq('gallery_id', img.gallery_id)
        .eq('album_index', img.album_index);
    }
    if (updates.is_app_icon) {
      await supabase.from('images')
        .update({ is_app_icon: false })
        .eq('gallery_id', img.gallery_id);
    }

    const { data, error } = await supabase
      .from('images')
      .update(updates)
      .eq('id', imageId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Update failed' });
    }

    res.json({ success: true, image: data });
  } catch (err) {
    console.error('[Patch] Error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── PUT /api/images/reorder ──
// Bulk update sort_order for images in an album
app.put('/api/images/reorder', authenticate, async (req, res) => {
  const { imageIds } = req.body; // Array of image IDs in desired order
  const userId = req.user.id;

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return res.status(400).json({ error: 'imageIds required' });
  }

  try {
    for (let i = 0; i < imageIds.length; i++) {
      await supabase
        .from('images')
        .update({ sort_order: i })
        .eq('id', imageIds[i])
        .eq('user_id', userId);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[Reorder] Error:', err);
    res.status(500).json({ error: 'Reorder failed' });
  }
});

// ── GET /api/health ──
app.get('/api/health', (req, res) => {
  res.json({
    status: supabase ? 'ok' : 'degraded',
    nasAvailable: existsSync(NAS_BASE),
    nasPath: NAS_BASE,
    supabaseConnected: !!supabase,
    envVars: {
      SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
      SUPABASE_JWT_SECRET: JWT_SECRET ? 'SET' : 'MISSING',
      NAS_BASE_PATH: NAS_BASE,
      PORT: PORT,
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Upload-API running on port ${PORT}`);
  console.log(`📁 NAS base: ${NAS_BASE}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
});
