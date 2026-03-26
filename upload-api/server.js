import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync, createReadStream, readdirSync, statSync, unlinkSync } from 'fs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { exec } from 'child_process';
import { promisify } from 'util';
import cron from 'node-cron';

const execAsync = promisify(exec);

// ── Config ──
const PORT = process.env.PORT || 3200;
const NAS_BASE = process.env.NAS_BASE_PATH || '/mnt/nas/onlinegalerie';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

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

// ── SMTP Config ──
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let emailTransporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  emailTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  console.log(`✅ Email transporter created (${SMTP_HOST}:${SMTP_PORT})`);
} else {
  console.warn('⚠️  SMTP credentials missing — email sending disabled.');
}

const app = express();

// ── Trust Proxy (behind Cloudflare/Traefik) ──
// Required for rate limiter to see real client IPs
app.set('trust proxy', 1);

// ── Security Middleware ──
// HSTS disabled in helmet — we set it conditionally below for *.fotohahn.ch only
app.use(helmet({
  hsts: false, // Don't set HSTS globally (breaks Tailscale HTTP access)
  crossOriginResourcePolicy: { policy: 'same-site' }, // Allow admin.fotohahn.ch to load images from api.fotohahn.ch
}));

// Conditional HSTS: only for *.fotohahn.ch domains (not Tailscale internal)
app.use((req, res, next) => {
  if (req.hostname && req.hostname.endsWith('fotohahn.ch')) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Note: HTTPS redirect is handled by Cloudflare "Always Use HTTPS"
// Do NOT redirect here — Cloudflare Tunnel communicates over HTTP internally

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, health checks)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS: Blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ── Rate Limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 100,                  // max. 100 Requests pro IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                   // max. 20 Uploads pro IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please try again later.' },
});
app.use(generalLimiter);

app.use(express.json());

// ── Request logging (security audit trail) ──
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || req.connection?.remoteAddress;
    if (!req.path.startsWith('/api/images/') || req.method !== 'GET') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${res.statusCode} (${duration}ms) IP:${ip}`);
    }
  });
  next();
});

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
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/tiff', 'image/gif'];
const upload = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB per file
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed: JPEG, PNG, WebP, HEIC, TIFF, GIF`), false);
    }
  },
});

// ── Helper: Validate file is a real image via magic bytes ──
const MAGIC_BYTES = {
  'ffd8ff': 'image/jpeg',          // JPEG
  '89504e47': 'image/png',         // PNG
  '52494646': 'image/webp',        // WebP (RIFF header)
  '47494638': 'image/gif',         // GIF
  '49492a00': 'image/tiff',        // TIFF (little-endian)
  '4d4d002a': 'image/tiff',        // TIFF (big-endian)
};
async function validateImageMagicBytes(filePath) {
  try {
    const fd = await fs.open(filePath, 'r');
    const buf = Buffer.alloc(8);
    await fd.read(buf, 0, 8, 0);
    await fd.close();
    const hex = buf.toString('hex').toLowerCase();
    for (const [magic, type] of Object.entries(MAGIC_BYTES)) {
      if (hex.startsWith(magic)) return true;
    }
    // HEIC/HEIF: check for 'ftyp' at offset 4
    if (hex.substring(8, 16) === '66747970') return true;
    return false;
  } catch {
    return false;
  }
}

// ── Helper: Sanitize filename (prevent path traversal) ──
function sanitizeFilename(name) {
  return name
    .replace(/\.\.\//g, '')           // Remove ../ path traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only safe chars
    .replace(/_{2,}/g, '_')           // Collapse multiple underscores
    .substring(0, 200);                // Max length
}

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
app.post('/api/upload/:galleryId/:albumIndex', uploadLimiter, authenticate, upload.array('images', 100), async (req, res) => {
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
      // Validate magic bytes (real image check)
      const isRealImage = await validateImageMagicBytes(file.path);
      if (!isRealImage) {
        console.warn(`⚠️ File rejected (invalid magic bytes): ${file.originalname}`);
        await fs.unlink(file.path).catch(() => {});
        continue; // Skip this file
      }

      // Generate unique sanitized filename
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const hash = crypto.randomBytes(6).toString('hex');
      const safeName = sanitizeFilename(file.originalname.replace(ext, ''));
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
        .resize(1200, null, { withoutEnlargement: true })
        .jpeg({ quality: 90 })
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

// ── Watermark config cache (1hr TTL) ──
const wmCache = new Map();
const WM_CACHE_TTL = 3600000;

async function getWatermarkConfig(userId, albumIndex, gallerySlug) {
  const cacheKey = `${userId}:${gallerySlug}:${albumIndex}`;
  const cached = wmCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WM_CACHE_TTL) return cached.data;

  if (!supabase) return null;
  try {
    // Get gallery by slug and user
    const { data: gallery } = await supabase
      .from('galleries').select('id, toggles').eq('slug', gallerySlug).eq('user_id', userId).maybeSingle();
    if (!gallery) return null;

    const toggles = gallery.toggles || {};
    const albumToggles = toggles[`album_${albumIndex}`] || {};

    // Check album-level watermark first, then gallery-level
    const wmEnabled = albumToggles.watermark || toggles.wasserzeichen;
    if (!wmEnabled) { wmCache.set(cacheKey, { data: null, ts: Date.now() }); return null; }

    const wmId = albumToggles.watermarkId || toggles.selectedWatermarkId;
    if (!wmId) { wmCache.set(cacheKey, { data: null, ts: Date.now() }); return null; }

    // Load watermark settings from user_settings
    const { data: settingsRow } = await supabase
      .from('user_settings').select('value').eq('user_id', userId).eq('key', 'settings_watermarks_v2').maybeSingle();
    const watermarks = settingsRow?.value || [];
    const wm = watermarks.find(w => String(w.id) === String(wmId));

    wmCache.set(cacheKey, { data: wm || null, ts: Date.now() });
    return wm || null;
  } catch (err) {
    console.error('[Watermark] Config load error:', err.message);
    return null;
  }
}

// ── GET /api/images/:userId/:slug/:albumIndex/:type/:filename ──
// Serve images from NAS with optional watermark overlay
app.get('/api/images/:userId/:slug/:albumIndex/:type/:filename', async (req, res) => {
  const { userId, slug, albumIndex, type, filename } = req.params;

  if (!['original', 'thumb'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const filePath = path.join(NAS_BASE, userId, slug, albumIndex, type, filename);

  if (!existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Only apply watermarks to originals (not thumbnails)
  if (type === 'original') {
    try {
      const wm = await getWatermarkConfig(userId, albumIndex, slug);
      if (wm && wm.wmType === 'text') {
        const image = sharp(filePath);
        const metadata = await image.metadata();
        const w = metadata.width || 1200;
        const h = metadata.height || 800;

        const fontStr = wm.font || 'Open Sans, 64px, weiß';
        const [fontName, fontSizeStr] = fontStr.split(',').map(s => s.trim());
        const fontSize = Math.min(parseInt(fontSizeStr) || 64, Math.round(w * 0.06));
        const isBlack = fontStr.includes('schwarz');
        const fillColor = isBlack ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
        const opacity = (wm.transparency ?? 50) / 100;
        const text = wm.text || wm.name || 'Watermark';

        // Position mapping
        const posMap = {
          'oben-links': { x: '8%', y: '10%', anchor: 'start' },
          'oben-mitte': { x: '50%', y: '10%', anchor: 'middle' },
          'oben-rechts': { x: '92%', y: '10%', anchor: 'end' },
          'mitte-links': { x: '8%', y: '52%', anchor: 'start' },
          'mitte': { x: '50%', y: '52%', anchor: 'middle' },
          'mitte-rechts': { x: '92%', y: '52%', anchor: 'end' },
          'unten-links': { x: '8%', y: '94%', anchor: 'start' },
          'unten-mitte': { x: '50%', y: '94%', anchor: 'middle' },
          'unten-rechts': { x: '92%', y: '94%', anchor: 'end' },
        };
        const pos = posMap[wm.position] || posMap['mitte'];

        const svgOverlay = Buffer.from(`
          <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
            <text x="${pos.x}" y="${pos.y}" text-anchor="${pos.anchor}" dominant-baseline="central"
              font-family="'${fontName}', sans-serif" font-size="${fontSize}" font-weight="700"
              fill="${fillColor}" opacity="${opacity}"
              filter="drop-shadow(0 2px 6px rgba(0,0,0,0.4))"
            >${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
          </svg>
        `);

        const buffer = await image
          .composite([{ input: svgOverlay, top: 0, left: 0 }])
          .jpeg({ quality: 85 })
          .toBuffer();

        res.set({
          'Cache-Control': 'public, max-age=86400',
          'Content-Type': 'image/jpeg',
          'Content-Length': buffer.length,
        });
        return res.send(buffer);
      }

      if (wm && wm.wmType === 'image' && wm.image) {
        try {
          const image = sharp(filePath);
          const metadata = await image.metadata();
          const w = metadata.width || 1200;
          const h = metadata.height || 800;
          const opacity = (wm.transparency ?? 50) / 100;
          const scale = (wm.scale ?? 100) / 100;
          const overlayW = Math.round(w * 0.25 * scale);

          // Fetch watermark image (base64 or URL)
          let wmBuffer;
          if (wm.image.startsWith('data:')) {
            const base64Data = wm.image.split(',')[1];
            wmBuffer = Buffer.from(base64Data, 'base64');
          } else {
            const resp = await fetch(wm.image);
            wmBuffer = Buffer.from(await resp.arrayBuffer());
          }

          const wmResized = await sharp(wmBuffer)
            .resize(overlayW, null, { fit: 'inside' })
            .ensureAlpha()
            .toBuffer();

          // Position
          const wmMeta = await sharp(wmResized).metadata();
          const posCalc = {
            'oben-links': { left: Math.round(w * 0.06), top: Math.round(h * 0.06) },
            'oben-mitte': { left: Math.round((w - wmMeta.width) / 2), top: Math.round(h * 0.06) },
            'oben-rechts': { left: Math.round(w * 0.94 - wmMeta.width), top: Math.round(h * 0.06) },
            'mitte-links': { left: Math.round(w * 0.06), top: Math.round((h - wmMeta.height) / 2) },
            'mitte': { left: Math.round((w - wmMeta.width) / 2), top: Math.round((h - wmMeta.height) / 2) },
            'mitte-rechts': { left: Math.round(w * 0.94 - wmMeta.width), top: Math.round((h - wmMeta.height) / 2) },
            'unten-links': { left: Math.round(w * 0.06), top: Math.round(h * 0.94 - wmMeta.height) },
            'unten-mitte': { left: Math.round((w - wmMeta.width) / 2), top: Math.round(h * 0.94 - wmMeta.height) },
            'unten-rechts': { left: Math.round(w * 0.94 - wmMeta.width), top: Math.round(h * 0.94 - wmMeta.height) },
          };
          const pos = posCalc[wm.position] || posCalc['mitte'];

          const buffer = await image
            .composite([{ input: wmResized, left: pos.left, top: pos.top, blend: 'over' }])
            .jpeg({ quality: 85 })
            .toBuffer();

          res.set({
            'Cache-Control': 'public, max-age=86400',
            'Content-Type': 'image/jpeg',
            'Content-Length': buffer.length,
          });
          return res.send(buffer);
        } catch (wmErr) {
          console.error('[Watermark] Image overlay error:', wmErr.message);
          // Fall through to serve without watermark
        }
      }
    } catch (err) {
      console.error('[Watermark] Processing error:', err.message);
      // Fall through to serve without watermark
    }
  }

  // Default: serve without watermark (thumbnails, or when no watermark configured)
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

// ── Admin Config ──
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN;
const COOLIFY_BASE = process.env.COOLIFY_BASE_URL || 'http://localhost:8000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'daenu.gallo@gmail.com';
const COOLIFY_UUIDS = {
  'dashboard-app': process.env.COOLIFY_UUID_DASHBOARD || 'ql9jj8b7paizylbo7cd3pgga',
  'upload-api': process.env.COOLIFY_UUID_UPLOAD || 'bhdfcbl54jtencddlim5hdfu',
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ── POST /api/admin/deploy/:service ──
// Triggers Coolify redeploy for dashboard-app or upload-api
app.post('/api/admin/deploy/:service', authenticate, adminOnly, async (req, res) => {
  const { service } = req.params;
  const uuid = COOLIFY_UUIDS[service];
  if (!uuid) {
    return res.status(400).json({ error: `Unknown service: ${service}. Use "dashboard-app" or "upload-api"` });
  }
  if (!COOLIFY_TOKEN) {
    return res.status(500).json({ error: 'COOLIFY_API_TOKEN not configured' });
  }

  try {
    console.log(`🚀 Admin ${req.user.email} triggered deploy for ${service} (UUID: ${uuid})`);
    const response = await fetch(`${COOLIFY_BASE}/api/v1/deploy?uuid=${uuid}&force=true`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${COOLIFY_TOKEN}` },
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      console.log(`✅ Deploy triggered for ${service}`);
      res.json({ success: true, service, message: `Redeploy für ${service} gestartet` });
    } else {
      console.error(`❌ Deploy failed for ${service}:`, data);
      res.status(response.status).json({ error: `Deploy failed: ${data.message || response.statusText}` });
    }
  } catch (err) {
    console.error(`❌ Deploy error for ${service}:`, err.message);
    res.status(500).json({ error: `Deploy error: ${err.message}` });
  }
});

// ── GET /api/admin/check ──
// Check if current user is admin
app.get('/api/admin/check', authenticate, (req, res) => {
  res.json({ isAdmin: req.user?.email === ADMIN_EMAIL });
});

// ── Cloudflare Cache Purge ──
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID || '';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';

async function purgeCloudflareCache() {
  if (!CF_ZONE_ID || !CF_API_TOKEN) {
    console.log('⚠️  Cloudflare cache purge skipped (CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set)');
    return { skipped: true };
  }
  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ purge_everything: true }),
    });
    const data = await response.json();
    if (data.success) {
      console.log('✅ Cloudflare cache purged successfully');
      return { success: true };
    } else {
      console.error('❌ Cloudflare cache purge failed:', data.errors);
      return { success: false, errors: data.errors };
    }
  } catch (err) {
    console.error('❌ Cloudflare cache purge error:', err.message);
    return { success: false, error: err.message };
  }
}

// Admin endpoint for manual cache purge
app.post('/api/admin/purge-cache', authenticate, async (req, res) => {
  if (req.user?.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Admin only' });
  }
  const result = await purgeCloudflareCache();
  res.json(result);
});

// ── POST /api/send-email ──
// Send branded gallery email to customer
app.post('/api/send-email', authenticate, async (req, res) => {
  if (!emailTransporter) {
    return res.status(503).json({ error: 'E-Mail-Versand nicht konfiguriert. Bitte SMTP Env-Vars setzen.' });
  }

  const { to, subject, body, galleryUrl, password, showPassword, cc, brandName, brandLogo, previewImage } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ error: 'Empfänger und Betreff sind erforderlich.' });
  }

  // Basic email validation
  const emails = Array.isArray(to) ? to : [to];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const email of emails) {
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: `Ungültige E-Mail-Adresse: ${email}` });
    }
  }

  // Build HTML email
  const bodyHtml = (body || '').replace(/\n/g, '<br>');
  const logoHtml = brandLogo
    ? `<img src="${brandLogo}" alt="${brandName || ''}" style="max-height:50px;max-width:180px;object-fit:contain;margin-bottom:16px;" />`
    : '';
  const imageHtml = previewImage
    ? `<img src="${previewImage}" alt="Galerie" style="width:100%;max-width:520px;border-radius:8px;margin:16px 0;" />`
    : '';
  const passwordHtml = (password && showPassword)
    ? `<p style="margin-top:16px;font-size:14px;color:#666;">Passwort: <strong>${password}</strong></p>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 32px 0;text-align:center;">
          ${logoHtml}
        </td></tr>
        <tr><td style="padding:0 32px;text-align:center;">
          ${imageHtml}
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <h2 style="margin:0 0 16px;font-size:20px;color:#222;">${subject}</h2>
          <div style="font-size:15px;line-height:1.7;color:#444;">${bodyHtml}</div>
        </td></tr>
        ${galleryUrl ? `
        <tr><td style="padding:0 32px 8px;text-align:center;">
          <a href="${galleryUrl}" style="display:inline-block;padding:14px 36px;background:#333;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px;letter-spacing:0.5px;">GALERIE ÖFFNEN</a>
        </td></tr>` : ''}
        <tr><td style="padding:0 32px 24px;text-align:center;">
          ${passwordHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #eee;text-align:center;font-size:12px;color:#999;">
          ${brandName ? `<p>${brandName}</p>` : ''}
          <p>Powered by <a href="https://fotohahn.ch" style="color:#528c68;text-decoration:none;">Fotohahn</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const mailOptions = {
      from: `"${brandName || 'Fotohahn Galerie'}" <${SMTP_FROM}>`,
      to: emails.map(e => e.trim()).join(', '),
      subject,
      html,
    };
    if (cc) mailOptions.cc = cc;

    await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${mailOptions.to} (subject: ${subject})`);
    res.json({ success: true, message: 'E-Mail wurde erfolgreich gesendet.' });
  } catch (err) {
    console.error('[Email] Send error:', err.message);
    res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden.', details: err.message });
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
      CLOUDFLARE_ZONE_ID: CF_ZONE_ID ? 'SET' : 'NOT SET',
      CLOUDFLARE_API_TOKEN: CF_API_TOKEN ? 'SET' : 'NOT SET',
      NAS_BASE_PATH: NAS_BASE,
      PORT: PORT,
    },
    timestamp: new Date().toISOString(),
  });
});

// ══════════════════════════════════════════
// ── Database Auto-Backup System ──
// ══════════════════════════════════════════
const DB_HOST = process.env.DB_HOST || 'supabase-db';
const DB_PORT = process.env.DB_PORT || '5432';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const BACKUP_DIR = path.join(NAS_BASE, '_backups', 'db');
const BACKUP_RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);

async function runDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `supabase_backup_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`[Backup] 🗄️  Starte Datenbank-Backup...`);
  console.log(`[Backup]   Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`[Backup]   Ziel: ${filepath}`);

  try {
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Run pg_dump with gzip compression
    const cmd = `PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres --clean --if-exists --no-owner --no-privileges --disable-triggers 2>/dev/null | gzip > "${filepath}"`;
    const { stderr } = await execAsync(cmd, { timeout: 120000 }); // 2 min timeout

    if (stderr && !stderr.includes('SET') && !stderr.includes('DROP')) {
      console.warn(`[Backup] ⚠️  stderr: ${stderr.substring(0, 200)}`);
    }

    // Validate backup file
    const stat = await fs.stat(filepath);
    if (stat.size < 1000) {
      console.error(`[Backup] ❌ Backup-Datei ist zu klein (${stat.size} Bytes) — möglicherweise fehlerhaft`);
      return { success: false, error: 'Backup file too small', size: stat.size };
    }

    const sizeKb = Math.round(stat.size / 1024);
    console.log(`[Backup] ✅ Backup erfolgreich: ${filename} (${sizeKb} KB)`);

    // Cleanup old backups
    const deleted = cleanupOldBackups();
    if (deleted > 0) {
      console.log(`[Backup] 🗑️  ${deleted} alte Backups gelöscht (älter als ${BACKUP_RETENTION_DAYS} Tage)`);
    }

    return { success: true, filename, sizeKb, deleted };
  } catch (err) {
    console.error(`[Backup] ❌ Fehler:`, err.message);
    return { success: false, error: err.message };
  }
}

function cleanupOldBackups() {
  try {
    if (!existsSync(BACKUP_DIR)) return 0;
    const now = Date.now();
    const maxAge = BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    let deleted = 0;

    const files = readdirSync(BACKUP_DIR).filter(f => f.startsWith('supabase_backup_') && f.endsWith('.sql.gz'));
    for (const file of files) {
      const filepath = path.join(BACKUP_DIR, file);
      const stat = statSync(filepath);
      if (now - stat.mtimeMs > maxAge) {
        unlinkSync(filepath);
        deleted++;
      }
    }
    return deleted;
  } catch (err) {
    console.error(`[Backup] Cleanup-Fehler:`, err.message);
    return 0;
  }
}

function listBackups() {
  try {
    if (!existsSync(BACKUP_DIR)) return [];
    return readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('supabase_backup_') && f.endsWith('.sql.gz'))
      .map(f => {
        const stat = statSync(path.join(BACKUP_DIR, f));
        return { filename: f, sizeKb: Math.round(stat.size / 1024), date: stat.mtime };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch {
    return [];
  }
}

// ── POST /api/admin/backup — Manual backup trigger ──
app.post('/api/admin/backup', authenticate, adminOnly, async (req, res) => {
  console.log(`[Backup] 🔧 Manuelles Backup ausgelöst von ${req.user.email}`);
  const result = await runDatabaseBackup();
  res.json(result);
});

// ── GET /api/admin/backups — List all backups ──
app.get('/api/admin/backups', authenticate, adminOnly, (req, res) => {
  const backups = listBackups();
  res.json({ backups, retentionDays: BACKUP_RETENTION_DAYS, backupDir: BACKUP_DIR });
});

// ── Daily Auto-Backup Cron (03:00 Uhr) ──
cron.schedule('0 3 * * *', () => {
  console.log(`[Backup] ⏰ Auto-Backup gestartet (Cron 03:00)`);
  runDatabaseBackup();
}, { timezone: 'Europe/Zurich' });

// ══════════════════════════════════════════
// ── Uptime Monitoring & Alerts ──
// ══════════════════════════════════════════
const MONITOR_TARGETS = [
  { name: 'Upload-API', url: `http://localhost:${PORT}/api/health`, type: 'internal' },
  { name: 'Dashboard-App', url: process.env.DASHBOARD_URL || 'https://admin.fotohahn.ch', type: 'external' },
  { name: 'Supabase', url: null, type: 'supabase' },
];

const monitorHistory = []; // Array of { timestamp, results: [{ name, status, responseTime, error }] }
const MAX_HISTORY = 20;
let lastAlertSent = 0; // Timestamp of last alert email
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between alerts

async function checkService(target) {
  const start = Date.now();
  try {
    if (target.type === 'supabase') {
      // Check Supabase by doing a simple query
      if (!supabase) return { name: target.name, status: 'down', responseTime: 0, error: 'Supabase not configured' };
      const { error } = await supabase.from('app_config').select('key').limit(1);
      if (error) throw error;
      return { name: target.name, status: 'up', responseTime: Date.now() - start };
    }

    // HTTP check
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    const res = await fetch(target.url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok || res.status < 500) {
      return { name: target.name, status: 'up', responseTime: Date.now() - start };
    }
    return { name: target.name, status: 'down', responseTime: Date.now() - start, error: `HTTP ${res.status}` };
  } catch (err) {
    return { name: target.name, status: 'down', responseTime: Date.now() - start, error: err.message?.substring(0, 100) };
  }
}

async function runUptimeCheck() {
  const results = await Promise.all(MONITOR_TARGETS.map(checkService));
  const entry = { timestamp: new Date().toISOString(), results };

  monitorHistory.unshift(entry);
  if (monitorHistory.length > MAX_HISTORY) monitorHistory.pop();

  // Log status
  const downServices = results.filter(r => r.status === 'down');
  if (downServices.length > 0) {
    console.error(`[Monitor] ❌ ${downServices.length} service(s) DOWN:`, downServices.map(s => `${s.name} (${s.error})`).join(', '));

    // Send alert email (with cooldown)
    if (emailTransporter && (Date.now() - lastAlertSent > ALERT_COOLDOWN_MS)) {
      lastAlertSent = Date.now();
      const downList = downServices.map(s => `• ${s.name}: ${s.error}`).join('\n');
      try {
        await emailTransporter.sendMail({
          from: `"Fotohahn Monitor" <${SMTP_FROM}>`,
          to: ADMIN_EMAIL,
          subject: `⚠️ Service Alert: ${downServices.length} Service(s) DOWN`,
          text: `Folgende Services sind nicht erreichbar:\n\n${downList}\n\nZeit: ${new Date().toLocaleString('de-CH')}\n\nBitte prüfe die Dienste.`,
          html: `<h2 style="color:#ef4444;">⚠️ Service Alert</h2>
            <p>Folgende Services sind nicht erreichbar:</p>
            <pre style="background:#f5f5f5;padding:12px;border-radius:6px;">${downList}</pre>
            <p style="color:#666;font-size:13px;">Zeit: ${new Date().toLocaleString('de-CH')}</p>`,
        });
        console.log('[Monitor] 📧 Alert email sent to', ADMIN_EMAIL);
      } catch (mailErr) {
        console.error('[Monitor] Failed to send alert email:', mailErr.message);
      }
    }
  } else {
    console.log(`[Monitor] ✅ All ${results.length} services OK (${results.map(r => `${r.name}:${r.responseTime}ms`).join(', ')})`);
  }

  return entry;
}

// GET /api/admin/status — Current service health
app.get('/api/admin/status', authenticate, adminOnly, (req, res) => {
  res.json({
    current: monitorHistory[0] || null,
    history: monitorHistory,
    alertCooldownMinutes: Math.round(ALERT_COOLDOWN_MS / 60000),
    lastAlertSent: lastAlertSent ? new Date(lastAlertSent).toISOString() : null,
  });
});

// POST /api/admin/check-now — Trigger immediate check
app.post('/api/admin/check-now', authenticate, adminOnly, async (req, res) => {
  console.log(`[Monitor] 🔍 Manual check triggered by ${req.user.email}`);
  const result = await runUptimeCheck();
  res.json(result);
});

// Uptime check cron: every 5 minutes
cron.schedule('*/5 * * * *', () => {
  runUptimeCheck();
}, { timezone: 'Europe/Zurich' });

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Upload-API running on port ${PORT}`);
  console.log(`📁 NAS base: ${NAS_BASE}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`🗄️  DB Backups: täglich 03:00 → ${BACKUP_DIR}`);
  console.log(`📡 Monitoring: alle 5 Min → ${MONITOR_TARGETS.map(t => t.name).join(', ')}`);
  console.log(`   DB Host: ${DB_HOST}:${DB_PORT}`);

  // Auto-purge Cloudflare cache on startup (= after redeploy)
  purgeCloudflareCache();

  // Run initial uptime check on startup
  setTimeout(runUptimeCheck, 5000);
});
