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
import archiver from 'archiver';
import Stripe from 'stripe';

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

// ── Gelato Print API ──
const GELATO_API_KEY = process.env.GELATO_API_KEY || '';
const GELATO_API_BASE = 'https://order.gelatoapis.com/v3';
const GELATO_PRODUCT_API = 'https://product.gelatoapis.com/v3';

// ── Stripe Payment ──
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Debug: Log env vars on startup
console.log('🔧 Environment variables:');
console.log(`   PORT=${PORT}`);
console.log(`   NAS_BASE_PATH=${NAS_BASE}`);
console.log(`   SUPABASE_URL=${SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : '❌ NOT SET'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   SUPABASE_JWT_SECRET=${JWT_SECRET ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   GELATO_API_KEY=${GELATO_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
console.log(`   STRIPE=${STRIPE_SECRET_KEY ? '✅ Active' : '❌ Not configured'}`);

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
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin fetch (needed for ZIP download on galerie.fotohahn.ch)
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
    // Always allow *.fotohahn.ch subdomains
    if (origin.endsWith('.fotohahn.ch') || origin.endsWith('fotohahn.ch')) {
      return callback(null, true);
    }
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
  max: 5000,                 // max. 5000 Requests pro IP (für Batch-Uploads von 3000+ Bildern)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
// Upload limiter disabled — authenticated users can upload unlimited
// Security is handled by JWT auth, not rate limiting
const uploadLimiter = (req, res, next) => next();
app.use(generalLimiter);

app.use(express.json({ limit: '10mb' }));

// ── GET /api/manifest ── Dynamic Web App Manifest ──
// Generates a per-gallery manifest so iOS "Add to Home Screen" preserves the correct URL.
// Scrappbook uses the same pattern: absolute URLs in start_url and scope.
// Usage: <link rel="manifest" href="https://api.fotohahn.ch/api/manifest?origin=https://galerie.fotohahn.ch&start=/hochzeit&name=Hochzeit">
app.get('/api/manifest', (req, res) => {
  const {
    origin = 'https://galerie.fotohahn.ch',
    start = '/',
    name = 'Fotogalerie',
    short = '',
    desc = '',
    theme = '#1a1a1a',
    bg = '#0f1419',
    icon = '',
  } = req.query;

  // Build absolute URLs (like Scrappbook does)
  const absoluteStart = start.startsWith('http') ? start : `${origin}${start}`;
  const absoluteScope = start.startsWith('http') ? start : `${origin}${start}`;

  const manifest = {
    name: name,
    short_name: (short || name).substring(0, 12),
    description: desc || `Fotogalerie – ${name}`,
    start_url: absoluteStart,
    scope: absoluteScope,
    display: 'standalone',
    background_color: bg,
    theme_color: theme,
    orientation: 'any',
    icons: [
      {
        src: `${origin}${icon || '/logo192.png'}`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: `${origin}/logo512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    categories: ['photography'],
    lang: 'de',
    dir: 'ltr',
  };

  // CORS: allow the gallery domain to fetch this manifest
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(manifest);
});

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
app.post('/api/upload/:galleryId/:albumParam', uploadLimiter, authenticate, upload.array('images', 100), async (req, res) => {
  const { galleryId, albumParam } = req.params;
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

    // Determine if albumParam is an album_id (prefixed with 'aid_') or legacy album_index (integer)
    const isAlbumId = String(albumParam).startsWith('aid_');
    let albumId = null;
    let albumIndex;

    if (isAlbumId) {
      // New: album_id provided (prefixed) — look up sort_order for NAS path
      const actualId = albumParam.replace('aid_', '');
      const { data: album, error: albErr } = await supabase
        .from('albums')
        .select('id, sort_order')
        .eq('id', actualId)
        .single();
      if (albErr || !album) {
        return res.status(404).json({ error: 'Album not found' });
      }
      albumId = album.id;
      albumIndex = album.sort_order;
    } else {
      // Legacy: album_index provided — look up album_id
      albumIndex = Number(albumParam);
      const { data: album } = await supabase
        .from('albums')
        .select('id')
        .eq('gallery_id', galleryId)
        .eq('sort_order', albumIndex)
        .single();
      if (album) albumId = album.id;
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

    // Load existing filenames for this album to detect duplicates
    const { data: existingImages } = await supabase
      .from('images')
      .select('filename')
      .eq('gallery_id', galleryId)
      .eq('album_index', Number(albumIndex));
    const existingFilenames = new Set((existingImages || []).map(img => img.filename));

    const results = [];
    let skippedDuplicates = 0;
    for (const file of req.files) {
      // Skip duplicates (same original filename already in this album)
      if (existingFilenames.has(file.originalname)) {
        console.log(`⏭️ Skipping duplicate: ${file.originalname}`);
        await fs.unlink(file.path).catch(() => {});
        skippedDuplicates++;
        continue;
      }
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

      // ── Write verification: confirm files actually persist on NAS ──
      const stat = await fs.stat(originalPath);
      const thumbStat = await fs.stat(thumbPath);
      const fileSizeKb = Math.round(stat.size / 1024);

      if (stat.size < 1000 || thumbStat.size < 500) {
        console.error(`[Upload] ❌ WRITE VERIFICATION FAILED: original=${stat.size}B, thumb=${thumbStat.size}B for ${filename}`);
        // Try to read back the file to verify it's actually on NAS
        const readCheck = await fs.readFile(originalPath).catch(() => null);
        if (!readCheck || readCheck.length < 1000) {
          console.error(`[Upload] ❌ NAS READ-BACK FAILED — Dateien werden NICHT persistent gespeichert!`);
          return res.status(503).json({ 
            error: 'NAS-Speicher nicht verfügbar — Dateien können nicht gesichert werden. Bitte kontaktiere den Administrator.',
            detail: 'Write verification failed — files are not persisting to NAS storage.'
          });
        }
      }

      // Build URLs (relative to API base)
      const originalUrl = `/api/images/${userId}/${slug}/${albumIndex}/original/${filename}`;
      const thumbUrl = `/api/images/${userId}/${slug}/${albumIndex}/thumb/${thumbFilename}`;

      // Insert into Supabase
      const insertData = {
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
      };
      if (albumId) insertData.album_id = albumId;

      const { data: imgRow, error: insertErr } = await supabase
        .from('images')
        .insert(insertData)
        .select()
        .single();

      if (insertErr) {
        console.error('[Upload] DB insert error:', insertErr);
      }

      results.push(imgRow || { filename, originalUrl, thumbUrl });

      // Clean up temp file
      await fs.unlink(file.path).catch(() => {});
    }

    if (skippedDuplicates > 0) {
      console.log(`📋 ${skippedDuplicates} Duplikate übersprungen, ${results.length} neue Bilder hochgeladen`);
    }

    res.json({ success: true, images: results, skippedDuplicates });
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
const WM_CACHE_TTL = 300000; // 5 min cache (was 1hr – too stale when toggling off)

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

    // Gallery-level only (album-level watermarks removed)
    const wmEnabled = !!toggles.wasserzeichen && !!toggles.selectedWatermarkId;
    if (!wmEnabled) { wmCache.set(cacheKey, { data: null, ts: Date.now() }); return null; }

    const wmId = toggles.selectedWatermarkId;
    if (!wmId) { wmCache.set(cacheKey, { data: null, ts: Date.now() }); return null; }

    // Load watermark from watermarks table
    const { data: wmRow } = await supabase
      .from('watermarks').select('*').eq('id', Number(wmId)).maybeSingle();
    const wm = wmRow ? {
      id: wmRow.id, name: wmRow.name, wmType: wmRow.wm_type || 'image',
      position: wmRow.position || 'mitte', image: wmRow.image || null,
      text: wmRow.text || '', font: wmRow.font || '',
      scale: wmRow.scale ?? 100, transparency: wmRow.transparency ?? 50,
    } : null;

    wmCache.set(cacheKey, { data: wm, ts: Date.now() });
    return wm;
  } catch (err) {
    console.error('[Watermark] Config load error:', err.message);
    return null;
  }
}

// Serve images from NAS with optional watermark overlay
app.get('/api/images/:userId/:slug/:albumIndex/:type/:filename', async (req, res) => {
  const { userId, slug, albumIndex, type, filename } = req.params;

  if (!['original', 'thumb'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  // Request-level timeout: 10 seconds max
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error(`[Images] ⏰ Timeout serving ${type}/${filename}`);
      res.status(504).json({ error: 'NAS timeout — bitte Seite neu laden' });
    }
  }, 10000);
  res.on('close', () => clearTimeout(timeout));

  const filePath = path.join(NAS_BASE, userId, slug, albumIndex, type, filename);

  // Async file check (non-blocking)
  try {
    await fs.access(filePath);
  } catch {
    clearTimeout(timeout);
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

        clearTimeout(timeout);
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

          clearTimeout(timeout);
          res.set({
            'Cache-Control': 'public, max-age=300',
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
  clearTimeout(timeout);
  res.set({
    'Cache-Control': 'public, max-age=604800',
    'Content-Type': 'image/jpeg',
  });

  const stream = createReadStream(filePath);
  stream.on('error', (err) => {
    console.error(`[Images] Stream error for ${filename}:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'File read error' });
    }
  });
  stream.pipe(res);
});

// ── GET /api/download/:gallerySlug ──
// Server-side ZIP download: streams images directly from NAS
// Query params: ?albums=id1,id2 (optional: specific album IDs, empty = all)
// No auth required (public gallery download for customers)
app.get('/api/download/:gallerySlug', async (req, res) => {
  // Override Helmet headers for file download
  res.removeHeader('Content-Security-Policy');
  res.removeHeader('X-Frame-Options');
  res.removeHeader('Cross-Origin-Opener-Policy');

  const { gallerySlug } = req.params;
  const albumFilter = req.query.albums ? req.query.albums.split(',') : null;

  try {
    // Look up gallery
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id, user_id, slug')
      .eq('slug', gallerySlug.toLowerCase())
      .maybeSingle();

    if (!gallery) return res.status(404).json({ error: 'Gallery not found' });

    // Fetch images (optionally filtered by album_id)
    let query = supabase
      .from('images')
      .select('id, filename, original_url, album_id, album_index')
      .eq('gallery_id', gallery.id)
      .order('album_index', { ascending: true })
      .order('sort_order', { ascending: true });

    if (albumFilter && albumFilter.length > 0) {
      const albumIds = albumFilter.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
      if (albumIds.length > 0) query = query.in('album_id', albumIds);
    }

    const { data: images, error } = await query;
    if (error) throw error;
    if (!images || images.length === 0) {
      return res.status(404).json({ error: 'No images found' });
    }

    // Fetch album names for folder structure
    const { data: albums } = await supabase
      .from('albums')
      .select('id, name, sort_order')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true });
    const albumNameMap = {};
    (albums || []).forEach(a => { albumNameMap[a.id] = a.name; });

    // Set response headers for ZIP download
    const zipName = encodeURIComponent(gallerySlug) + '.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // Create ZIP archive stream
    const archive = archiver('zip', { zlib: { level: 1 } }); // level 1 = fast (images are already compressed)
    archive.on('error', err => {
      console.error('[ZIP] Archive error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'ZIP generation failed' });
    });
    archive.pipe(res);

    // Add each image from NAS to the ZIP
    let added = 0;
    for (const img of images) {
      const filePath = path.join(
        NAS_BASE,
        gallery.user_id,
        gallery.slug,
        String(img.album_index),
        'original',
        path.basename(img.original_url)
      );

      try {
        await fs.access(filePath);
        // Use album name as folder in ZIP
        const folderName = albumNameMap[img.album_id] || `Album_${img.album_index}`;
        const safeFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_');
        archive.file(filePath, { name: `${safeFolderName}/${img.filename}` });
        added++;
      } catch {
        console.warn(`[ZIP] File not found: ${filePath}`);
      }
    }

    if (added === 0) {
      archive.abort();
      return res.status(404).json({ error: 'No files accessible on NAS' });
    }

    console.log(`[ZIP] Streaming ${added}/${images.length} images for gallery "${gallerySlug}"`);
    await archive.finalize();
  } catch (err) {
    console.error('[ZIP] Error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Download failed' });
  }
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

// ── DELETE /api/gallery/:galleryId ──
// Delete all gallery files from NAS + images from Supabase
app.delete('/api/gallery/:galleryId', authenticate, async (req, res) => {
  const { galleryId } = req.params;
  const userId = req.user.id;

  try {
    // Verify gallery exists and belongs to user
    const { data: gallery, error: fetchErr } = await supabase
      .from('galleries')
      .select('slug, user_id')
      .eq('id', galleryId)
      .single();

    if (fetchErr || !gallery) {
      return res.status(404).json({ error: 'Gallery not found' });
    }
    if (gallery.user_id !== userId) {
      return res.status(403).json({ error: 'Not your gallery' });
    }

    const galleryPath = path.join(NAS_BASE, userId, gallery.slug);

    // Delete all images from Supabase
    await supabase.from('images').delete().eq('gallery_id', galleryId);

    // Delete all albums from Supabase
    await supabase.from('albums').delete().eq('gallery_id', galleryId);

    // Delete gallery views
    await supabase.from('gallery_views').delete().eq('gallery_id', galleryId);

    // Delete gallery folder from NAS (recursive)
    if (existsSync(galleryPath)) {
      await fs.rm(galleryPath, { recursive: true, force: true });
      console.log(`[DeleteGallery] Removed NAS folder: ${galleryPath}`);
    }

    res.json({ success: true, deleted: galleryPath });
  } catch (err) {
    console.error('[DeleteGallery] Error:', err);
    res.status(500).json({ error: 'Gallery cleanup failed', details: err.message });
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
      .select('user_id, gallery_id, album_id, album_index')
      .eq('id', imageId)
      .single();

    if (!img || img.user_id !== userId) {
      return res.status(403).json({ error: 'Not your image' });
    }

    // If setting a flag, clear it from other images in same gallery+album first
    // Use album_id (stable) with fallback to album_index (legacy)
    const albumFilter = img.album_id
      ? (q) => q.eq('album_id', img.album_id)
      : (q) => q.eq('album_index', img.album_index);

    if (updates.is_title_image) {
      let q = supabase.from('images')
        .update({ is_title_image: false })
        .eq('gallery_id', img.gallery_id);
      await albumFilter(q);
    }
    if (updates.is_mobile_title) {
      let q = supabase.from('images')
        .update({ is_mobile_title: false })
        .eq('gallery_id', img.gallery_id);
      await albumFilter(q);
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

  const { to, subject, body, galleryUrl, password, showPassword, cc, brandName, brandEmail, brandLogo, previewImage } = req.body;

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
    const senderEmail = brandEmail || SMTP_FROM;
    const mailOptions = {
      from: `"${brandName || 'Fotohahn Galerie'}" <${senderEmail}>`,
      replyTo: brandEmail || undefined,
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

// ── POST /api/admin/migrate-album-ids — One-time migration ──
app.post('/api/admin/migrate-album-ids', authenticate, async (req, res) => {
  try {
    // 1. Check if album_id column exists
    const { data: cols } = await supabase
      .from('images')
      .select('id')
      .limit(1);

    // 2. Add album_id column if not exists (via raw SQL through supabase-js)
    // Since we can't run DDL via supabase-js, we'll do it via the migration approach
    // First try to add the column
    const addColResult = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE images ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE CASCADE`
    }).catch(() => null);

    // If RPC doesn't exist, try direct approach
    if (!addColResult || addColResult.error) {
      // Try inserting with album_id to see if column exists
      const testResult = await supabase
        .from('images')
        .select('album_id')
        .limit(1)
        .catch(() => null);
      
      if (!testResult || testResult.error) {
        return res.status(500).json({ 
          error: 'album_id column does not exist. Please run the migration SQL manually:',
          sql: 'ALTER TABLE images ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(id) ON DELETE CASCADE; CREATE INDEX IF NOT EXISTS idx_images_album_id ON images(album_id);'
        });
      }
    }

    // 3. Backfill: link images to albums via gallery_id + album_index = sort_order
    const { data: allImages, error: imgErr } = await supabase
      .from('images')
      .select('id, gallery_id, album_index, album_id')
      .is('album_id', null);

    if (imgErr) throw imgErr;

    if (!allImages || allImages.length === 0) {
      return res.json({ success: true, message: 'No images to migrate (all already have album_id)', migrated: 0 });
    }

    // Get all albums
    const { data: allAlbums, error: albErr } = await supabase
      .from('albums')
      .select('id, gallery_id, sort_order');
    if (albErr) throw albErr;

    // Build lookup: { galleryId_sortOrder: albumId }
    const albumLookup = {};
    (allAlbums || []).forEach(a => {
      albumLookup[`${a.gallery_id}_${a.sort_order}`] = a.id;
    });

    // Update images in batches
    let migrated = 0;
    let skipped = 0;
    for (const img of allImages) {
      const albumId = albumLookup[`${img.gallery_id}_${img.album_index}`];
      if (albumId) {
        const { error: upErr } = await supabase
          .from('images')
          .update({ album_id: albumId })
          .eq('id', img.id);
        if (!upErr) migrated++;
        else console.error(`[Migration] Failed to update image ${img.id}:`, upErr);
      } else {
        skipped++;
        console.warn(`[Migration] No album found for gallery=${img.gallery_id} index=${img.album_index}`);
      }
    }

    res.json({ 
      success: true, 
      message: `Migration complete`, 
      migrated, 
      skipped, 
      total: allImages.length 
    });
  } catch (err) {
    console.error('[Migration] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/health ──
app.get('/api/health', async (req, res) => {
  let nasFiles = [];
  try {
    nasFiles = existsSync(NAS_BASE) ? readdirSync(NAS_BASE) : [];
  } catch {}
  res.json({
    status: supabase ? 'ok' : 'degraded',
    nasAvailable: existsSync(NAS_BASE),
    nasPath: NAS_BASE,
    nasContents: nasFiles,
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

// ── GET /api/admin/nas-check — Deep NAS diagnostic ──
app.get('/api/admin/nas-check', authenticate, adminOnly, async (req, res) => {
  try {
    const result = { nasPath: NAS_BASE, available: existsSync(NAS_BASE), tree: {} };
    if (!result.available) return res.json(result);

    // List top-level (user IDs)
    const userDirs = readdirSync(NAS_BASE).filter(f => !f.startsWith('.') && !f.startsWith('#'));
    for (const uid of userDirs) {
      const userPath = path.join(NAS_BASE, uid);
      try {
        const stat = statSync(userPath);
        if (!stat.isDirectory()) continue;
        const slugs = readdirSync(userPath).filter(f => !f.startsWith('.'));
        result.tree[uid] = {};
        for (const slug of slugs) {
          const slugPath = path.join(userPath, slug);
          try {
            const slugStat = statSync(slugPath);
            if (!slugStat.isDirectory()) continue;
            const albumDirs = readdirSync(slugPath).filter(f => !f.startsWith('.'));
            result.tree[uid][slug] = {};
            for (const album of albumDirs) {
              const albumPath = path.join(slugPath, album);
              try {
                const origPath = path.join(albumPath, 'original');
                const thumbPath = path.join(albumPath, 'thumb');
                const origCount = existsSync(origPath) ? readdirSync(origPath).length : 0;
                const thumbCount = existsSync(thumbPath) ? readdirSync(thumbPath).length : 0;
                result.tree[uid][slug][album] = { originals: origCount, thumbs: thumbCount };
              } catch {}
            }
          } catch {}
        }
      } catch {}
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/admin/purge-images — Remove all image DB records (for re-upload) ──
app.delete('/api/admin/purge-images', authenticate, adminOnly, async (req, res) => {
  const { gallery_id } = req.query; // optional: purge only one gallery
  try {
    let query = supabase.from('images').delete();
    if (gallery_id) {
      query = query.eq('gallery_id', gallery_id);
    } else {
      // Delete ALL — need a filter for PostgREST, use id != null
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await query.select('id');
    if (error) return res.status(500).json({ error: error.message });
    console.log(`[Admin] 🗑️ Purged ${data?.length || 0} image records${gallery_id ? ` for gallery ${gallery_id}` : ''}`);
    res.json({ success: true, deleted: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    const cmd = `PGPASSWORD="${DB_PASSWORD}" pg_dump -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d postgres --clean --if-exists --no-owner --no-privileges --disable-triggers 2>&1 | gzip > "${filepath}"`;
    let result;
    try {
      result = await execAsync(`bash -c 'set -o pipefail; ${cmd.replace(/'/g, "'\\''")}'`, { timeout: 120000 }); // 2 min timeout
    } catch (execErr) {
      // pg_dump failed — try to get error details
      const errMsg = execErr.stderr || execErr.stdout || execErr.message || 'Unknown pg_dump error';
      console.error(`[Backup] ❌ pg_dump Fehler: ${errMsg}`);
      // Clean up empty/broken file
      await fs.unlink(filepath).catch(() => {});
      return { success: false, error: `pg_dump failed: ${errMsg.substring(0, 300)}` };
    }

    if (result?.stderr && !result.stderr.includes('SET') && !result.stderr.includes('DROP')) {
      console.warn(`[Backup] ⚠️  stderr: ${result.stderr.substring(0, 200)}`);
    }

    // Validate backup file
    const stat = await fs.stat(filepath);
    if (stat.size < 1000) {
      // Read file content to check for error messages
      const { stdout: headContent } = await execAsync(`gzip -d < "${filepath}" | head -c 500 2>/dev/null || echo "empty"`).catch(() => ({ stdout: 'unreadable' }));
      console.error(`[Backup] ❌ Backup-Datei ist zu klein (${stat.size} Bytes) — möglicherweise fehlerhaft`);
      console.error(`[Backup]   Inhalt: ${headContent}`);
      await fs.unlink(filepath).catch(() => {});
      return { success: false, error: `Backup file too small (${stat.size} bytes). Content: ${headContent.substring(0, 200)}` };
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

// ═══════════════════════════════════════════════
// ── SHOP MODULE: Order & Provider Endpoints ──
// ═══════════════════════════════════════════════

// ── Helper: Generate order number ──
function generateOrderNumber() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `FH-${date}-${rand}`;
}

// ── POST /api/shop/order ──
// Create a new shop order (called from customer checkout)
app.post('/api/shop/order', async (req, res) => {
  try {
    const {
      gallery_id, user_id, items, customer_name, customer_email,
      customer_address, coupon_code, payment_method, provider,
    } = req.body;

    if (!user_id || !items?.length || !customer_email) {
      return res.status(400).json({ error: 'user_id, items, and customer_email are required' });
    }

    // Calculate totals
    let totalGross = 0;
    let totalProductionCost = 0;
    const orderItems = items.map(item => {
      const lineTotal = (item.unit_price || 0) * (item.quantity || 1);
      const lineCost = (item.production_cost || 0) * (item.quantity || 1);
      totalGross += lineTotal;
      totalProductionCost += lineCost;
      return {
        product_sku: item.sku,
        product_name: item.name,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        production_cost: item.production_cost || 0,
        options: item.options || {},
      };
    });

    // Apply coupon discount
    let discount = 0;
    if (coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('user_id', user_id)
        .eq('code', coupon_code)
        .eq('active', true)
        .maybeSingle();

      if (coupon) {
        if (coupon.discount_type === 'percent') {
          discount = totalGross * (coupon.discount_value / 100);
        } else {
          discount = Math.min(coupon.discount_value, totalGross);
        }
      }
    }

    totalGross -= discount;
    const serviceFee = Math.round(totalGross * 0.05 * 100) / 100; // 5% service fee
    const totalShipping = 7.90; // Flat rate CH shipping
    const totalProfit = totalGross - totalProductionCost - serviceFee;

    const orderNumber = generateOrderNumber();

    // Insert order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id,
        gallery_id: gallery_id || null,
        order_number: orderNumber,
        provider: provider || 'gelato',
        customer_name: customer_name || '',
        customer_email,
        customer_address: customer_address || {},
        total_gross: totalGross,
        total_production_cost: totalProductionCost,
        total_shipping: totalShipping,
        service_fee: serviceFee,
        total_profit: totalProfit,
        status: 'pending',
        coupon_code: coupon_code || null,
      })
      .select()
      .single();

    if (orderErr) {
      console.error('[Shop] Order insert error:', orderErr);
      return res.status(500).json({ error: 'Order creation failed', details: orderErr.message });
    }

    // Insert order items
    const itemRows = orderItems.map(item => ({ ...item, order_id: order.id }));
    const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
    if (itemsErr) {
      console.error('[Shop] Order items insert error:', itemsErr);
    }

    console.log(`🛒 [Shop] New order ${orderNumber} created (${items.length} items, ${totalGross.toFixed(2)} CHF)`);

    res.json({ success: true, order });
  } catch (err) {
    console.error('[Shop] Order error:', err);
    res.status(500).json({ error: 'Order failed', details: err.message });
  }
});

// ── GET /api/shop/orders ──
// List orders for authenticated user
app.get('/api/shop/orders', authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59');

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ orders: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shop/order/:orderId ──
// Get single order detail
app.get('/api/shop/order/:orderId', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', req.params.orderId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found' });
    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/order/:orderId/forward ──
// Forward order to production provider (Gelato or nPhoto)
app.post('/api/shop/order/:orderId/forward', authenticate, async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', req.params.orderId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });

    const provider = order.provider || 'gelato';
    let externalId = null;

    if (provider === 'gelato') {
      // Gelato API integration (placeholder — needs real API key)
      const GELATO_API_KEY = process.env.GELATO_API_KEY;
      if (!GELATO_API_KEY) {
        console.warn('[Shop] GELATO_API_KEY not configured — order forwarding skipped');
        externalId = `gelato-mock-${Date.now()}`;
      } else {
        try {
          const gelatoOrder = {
            orderReferenceId: order.order_number,
            customerReferenceId: order.customer_email,
            currency: 'CHF',
            items: order.order_items.map(item => ({
              itemReferenceId: item.product_sku,
              productUid: item.product_sku,
              quantity: item.quantity,
              fileUrl: item.options?.imageUrl || '',
            })),
            shippingAddress: {
              firstName: order.customer_name?.split(' ')[0] || '',
              lastName: order.customer_name?.split(' ').slice(1).join(' ') || '',
              addressLine1: order.customer_address?.strasse || '',
              city: order.customer_address?.ort || '',
              postCode: order.customer_address?.plz || '',
              country: order.customer_address?.land === 'Schweiz' ? 'CH' : 'DE',
              email: order.customer_email,
            },
          };

          const resp = await fetch('https://order.gelatoapis.com/v4/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': GELATO_API_KEY,
            },
            body: JSON.stringify(gelatoOrder),
          });
          const result = await resp.json();
          externalId = result.id || result.orderId || `gelato-${Date.now()}`;
          console.log(`📦 [Shop] Gelato order created: ${externalId}`);
        } catch (gelatoErr) {
          console.error('[Shop] Gelato API error:', gelatoErr.message);
          externalId = `gelato-error-${Date.now()}`;
        }
      }
    } else if (provider === 'nphoto') {
      // nPhoto API integration (placeholder — needs real API key)
      const NPHOTO_API_KEY = process.env.NPHOTO_API_KEY;
      if (!NPHOTO_API_KEY) {
        console.warn('[Shop] NPHOTO_API_KEY not configured — order forwarding skipped');
        externalId = `nphoto-mock-${Date.now()}`;
      } else {
        try {
          const nphotoOrder = {
            reference: order.order_number,
            items: order.order_items.map(item => ({
              sku: item.product_sku,
              quantity: item.quantity,
              file: item.options?.imageUrl || '',
            })),
            delivery: {
              name: order.customer_name,
              street: order.customer_address?.strasse || '',
              zip: order.customer_address?.plz || '',
              city: order.customer_address?.ort || '',
              country: order.customer_address?.land === 'Schweiz' ? 'CH' : 'DE',
            },
          };

          const resp = await fetch('https://api.nphoto.com/v1/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${NPHOTO_API_KEY}`,
            },
            body: JSON.stringify(nphotoOrder),
          });
          const result = await resp.json();
          externalId = result.id || `nphoto-${Date.now()}`;
          console.log(`📦 [Shop] nPhoto order created: ${externalId}`);
        } catch (nphotoErr) {
          console.error('[Shop] nPhoto API error:', nphotoErr.message);
          externalId = `nphoto-error-${Date.now()}`;
        }
      }
    }

    // Update order status and external ID
    await supabase
      .from('orders')
      .update({
        status: 'processing',
        external_id: externalId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    console.log(`✅ [Shop] Order ${order.order_number} forwarded to ${provider} (${externalId})`);
    res.json({ success: true, provider, externalId });
  } catch (err) {
    console.error('[Shop] Forward error:', err);
    res.status(500).json({ error: 'Forward failed', details: err.message });
  }
});

// ── POST /api/shop/webhook/gelato ──
// Receive Gelato status webhooks
app.post('/api/shop/webhook/gelato', async (req, res) => {
  try {
    const { orderId, orderReferenceId, status, trackingCode, trackingUrl } = req.body;
    console.log(`📬 [Shop] Gelato webhook: ${orderReferenceId} → ${status}`);

    const statusMap = {
      'created': 'processing',
      'passed_to_production': 'processing',
      'in_production': 'processing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'canceled': 'cancelled',
      'failed': 'cancelled',
    };

    const newStatus = statusMap[status] || 'processing';

    // Find order by order_number or external_id
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .or(`order_number.eq.${orderReferenceId},external_id.eq.${orderId}`)
      .maybeSingle();

    if (order) {
      await supabase.from('orders').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Shop] Gelato webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shop/webhook/nphoto ──
// Receive nPhoto status webhooks
app.post('/api/shop/webhook/nphoto', async (req, res) => {
  try {
    const { reference, status: nphotoStatus, tracking } = req.body;
    console.log(`📬 [Shop] nPhoto webhook: ${reference} → ${nphotoStatus}`);

    const statusMap = {
      'accepted': 'processing',
      'in_production': 'processing',
      'shipped': 'shipped',
      'delivered': 'delivered',
      'cancelled': 'cancelled',
    };

    const newStatus = statusMap[nphotoStatus] || 'processing';

    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', reference)
      .maybeSingle();

    if (order) {
      await supabase.from('orders').update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Shop] nPhoto webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── NAS Watchdog: auto-restart if NAS becomes unreachable ──
let nasFailCount = 0;
const NAS_FAIL_THRESHOLD = 3; // 3 consecutive failures = restart
const NAS_CHECK_INTERVAL = 30000; // Check every 30 seconds

async function checkNasHealth() {
  const testFile = path.join(NAS_BASE, '.nas_health_check');
  try {
    // Try to write + read a small test file with a 5s timeout
    const checkPromise = (async () => {
      await fs.writeFile(testFile, Date.now().toString());
      await fs.readFile(testFile, 'utf-8');
      await fs.unlink(testFile).catch(() => {});
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('NAS check timeout (5s)')), 5000)
    );

    await Promise.race([checkPromise, timeoutPromise]);
    
    if (nasFailCount > 0) {
      console.log(`[NAS-Watchdog] ✅ NAS wieder erreichbar (nach ${nasFailCount} Fehlern)`);
    }
    nasFailCount = 0;
  } catch (err) {
    nasFailCount++;
    console.error(`[NAS-Watchdog] ❌ NAS-Fehler #${nasFailCount}/${NAS_FAIL_THRESHOLD}: ${err.message}`);

    if (nasFailCount >= NAS_FAIL_THRESHOLD) {
      console.error(`[NAS-Watchdog] 🔄 ${NAS_FAIL_THRESHOLD} aufeinanderfolgende NAS-Fehler — Container wird neu gestartet...`);
      process.exit(1); // Docker/Coolify restarts the container
    }
  }
}

// ════════════════════════════════════════════════
// ═══ GELATO PRINT API INTEGRATION ═══
// ════════════════════════════════════════════════

// Helper: Make authenticated Gelato API request
async function gelatoFetch(url, options = {}) {
  if (!GELATO_API_KEY) throw new Error('GELATO_API_KEY not configured');
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-API-KEY': GELATO_API_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`[Gelato] API error ${res.status}:`, data);
    throw new Error(data?.message || `Gelato API error ${res.status}`);
  }
  return data;
}

// ── GET /api/gelato/products — List available product catalogs ──
app.get('/api/gelato/products', async (req, res) => {
  try {
    const catalogs = await gelatoFetch(`${GELATO_PRODUCT_API}/catalogs`);
    res.json(catalogs);
  } catch (err) {
    console.error('[Gelato] Products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/gelato/shipping-estimate — Get shipping prices ──
app.post('/api/gelato/shipping-estimate', async (req, res) => {
  try {
    const { products, shippingAddress } = req.body;
    if (!products?.length || !shippingAddress?.country) {
      return res.status(400).json({ error: 'products and shippingAddress.country required' });
    }
    const estimate = await gelatoFetch(`${GELATO_API_BASE}/orders/quote`, {
      method: 'POST',
      body: JSON.stringify({
        lineItems: products.map((p, i) => ({
          itemReferenceId: `item_${i}`,
          productUid: p.productUid,
          quantity: p.quantity || 1,
          fileUrl: p.fileUrl || 'https://via.placeholder.com/3000x2000',
        })),
        shippingAddress: {
          firstName: shippingAddress.firstName || 'Test',
          lastName: shippingAddress.lastName || 'User',
          addressLine1: shippingAddress.addressLine1 || '',
          city: shippingAddress.city || '',
          postCode: shippingAddress.postCode || '',
          country: shippingAddress.country,
        },
      }),
    });
    res.json(estimate);
  } catch (err) {
    console.error('[Gelato] Shipping estimate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/gelato/order — Create a print order ──
app.post('/api/gelato/order', async (req, res) => {
  try {
    const {
      galleryId,
      userId,
      customer,       // { firstName, lastName, email, addressLine1, city, postCode, country, phone }
      items,          // [{ productSku, productUid, productName, quantity, fileUrl, price, productionCost }]
      couponCode,
      orderNote,
    } = req.body;

    if (!customer?.email || !items?.length) {
      return res.status(400).json({ error: 'customer.email and items[] required' });
    }

    // Generate order number
    const orderNumber = `FH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Calculate totals
    const totalGross = items.reduce((sum, i) => sum + (i.price * (i.quantity || 1)), 0);
    const totalProductionCost = items.reduce((sum, i) => sum + (i.productionCost * (i.quantity || 1)), 0);
    const totalProfit = totalGross - totalProductionCost;

    // 1) Create order in Supabase first
    let supabaseOrder = null;
    if (supabase && userId) {
      const { data, error } = await supabase.from('orders').insert({
        user_id: userId,
        gallery_id: galleryId || null,
        order_number: orderNumber,
        provider: 'gelato',
        customer_name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
        customer_email: customer.email,
        customer_address: {
          addressLine1: customer.addressLine1,
          city: customer.city,
          postCode: customer.postCode,
          country: customer.country,
          phone: customer.phone,
        },
        total_gross: totalGross,
        total_production_cost: totalProductionCost,
        total_profit: totalProfit,
        status: 'pending',
        coupon_code: couponCode || null,
      }).select().single();

      if (error) console.error('[Gelato] Supabase order insert error:', error);
      else supabaseOrder = data;

      // Insert order items
      if (supabaseOrder) {
        const orderItems = items.map(item => ({
          order_id: supabaseOrder.id,
          product_sku: item.productSku || item.productUid,
          product_name: item.productName,
          quantity: item.quantity || 1,
          unit_price: item.price,
          production_cost: item.productionCost,
          options: { fileUrl: item.fileUrl },
        }));
        await supabase.from('order_items').insert(orderItems);
      }
    }

    // 2) Submit order to Gelato API
    let gelatoOrder = null;
    if (GELATO_API_KEY) {
      try {
        gelatoOrder = await gelatoFetch(`${GELATO_API_BASE}/orders`, {
          method: 'POST',
          body: JSON.stringify({
            orderType: 'order',
            orderReferenceId: orderNumber,
            customerReferenceId: customer.email,
            lineItems: items.map((item, i) => ({
              itemReferenceId: `${orderNumber}_${i}`,
              productUid: item.productUid,
              quantity: item.quantity || 1,
              fileUrl: item.fileUrl,
            })),
            shippingAddress: {
              firstName: customer.firstName || '',
              lastName: customer.lastName || '',
              addressLine1: customer.addressLine1 || '',
              city: customer.city || '',
              postCode: customer.postCode || '',
              country: customer.country || 'CH',
              email: customer.email,
              phone: customer.phone || '',
            },
          }),
        });

        // Update Supabase order with Gelato external ID
        if (supabaseOrder && gelatoOrder?.id) {
          await supabase.from('orders').update({
            external_id: gelatoOrder.id,
            status: 'processing',
          }).eq('id', supabaseOrder.id);
        }

        console.log(`[Gelato] ✅ Order ${orderNumber} submitted → Gelato ID: ${gelatoOrder?.id}`);
      } catch (gelatoErr) {
        console.error(`[Gelato] ❌ Order ${orderNumber} Gelato submission failed:`, gelatoErr.message);
        // Order is still in Supabase as 'pending' — can be retried
        if (supabaseOrder) {
          await supabase.from('orders').update({
            status: 'error',
            invoice_numbers: `Gelato Error: ${gelatoErr.message}`,
          }).eq('id', supabaseOrder.id);
        }
      }
    }

    res.json({
      success: true,
      orderNumber,
      orderId: supabaseOrder?.id,
      gelatoId: gelatoOrder?.id || null,
      total: totalGross,
    });

  } catch (err) {
    console.error('[Gelato] Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/gelato/order/:id — Check order status ──
app.get('/api/gelato/order/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Try Gelato first
    if (GELATO_API_KEY) {
      try {
        const order = await gelatoFetch(`${GELATO_API_BASE}/orders/${id}`);
        return res.json(order);
      } catch (e) {
        // If not a Gelato ID, try Supabase
      }
    }
    // Fallback: check Supabase by order_number or id
    if (supabase) {
      const { data } = await supabase.from('orders')
        .select('*, order_items(*)')
        .or(`id.eq.${id},order_number.eq.${id},external_id.eq.${id}`)
        .single();
      if (data) return res.json(data);
    }
    res.status(404).json({ error: 'Order not found' });
  } catch (err) {
    console.error('[Gelato] Order status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════
// ██  STRIPE PAYMENT INTEGRATION
// ══════════════════════════════════════════════════════════════════

// ── GET /api/stripe/config — Return publishable key to frontend ──
app.get('/api/stripe/config', (req, res) => {
  res.json({ publishableKey: STRIPE_PUBLISHABLE_KEY });
});

// ── POST /api/stripe/create-checkout-session — Create Stripe payment session ──
app.post('/api/stripe/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(500).json({ error: 'Stripe is not configured' });
  }
  try {
    const { galleryId, userId, customer, items, couponCode, returnUrl } = req.body;

    if (!customer?.email || !items?.length) {
      return res.status(400).json({ error: 'customer.email and items[] required' });
    }

    // Build Stripe line items from cart
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'chf',
        product_data: {
          name: item.productName,
          metadata: {
            sku: item.productSku,
            productUid: item.productUid,
            fileUrl: item.fileUrl,
          },
        },
        unit_amount: Math.round(item.price * 100), // Stripe uses cents
      },
      quantity: item.quantity || 1,
    }));

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: customer.email,
      line_items: lineItems,
      metadata: {
        galleryId: String(galleryId || ''),
        userId: String(userId || ''),
        customerFirstName: customer.firstName || '',
        customerLastName: customer.lastName || '',
        customerAddress: customer.addressLine1 || '',
        customerCity: customer.city || '',
        customerPostCode: customer.postCode || '',
        customerCountry: customer.country || 'CH',
        customerPhone: customer.phone || '',
        couponCode: couponCode || '',
        // Store the full items data as JSON for the webhook
        orderItems: JSON.stringify(items),
      },
      success_url: `${returnUrl || 'https://galerie.fotohahn.ch'}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || 'https://galerie.fotohahn.ch'}?payment=cancelled`,
    });

    console.log(`[Stripe] ✅ Checkout session created: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });

  } catch (err) {
    console.error('[Stripe] Checkout session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/stripe/webhook — Handle Stripe payment events ──
// NOTE: This must use express.raw() for signature verification
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).send('Stripe not configured');

  let event;
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } else {
      // Without webhook secret, parse the event directly (less secure, OK for initial setup)
      event = JSON.parse(req.body.toString());
      console.warn('[Stripe] ⚠️ Webhook secret not set — accepting unverified events');
    }
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`[Stripe] 💰 Payment received! Session: ${session.id}, Amount: ${session.amount_total / 100} CHF`);

    try {
      const meta = session.metadata || {};
      const items = JSON.parse(meta.orderItems || '[]');
      const customer = {
        firstName: meta.customerFirstName || '',
        lastName: meta.customerLastName || '',
        email: session.customer_email || session.customer_details?.email || '',
        addressLine1: meta.customerAddress || '',
        city: meta.customerCity || '',
        postCode: meta.customerPostCode || '',
        country: meta.customerCountry || 'CH',
        phone: meta.customerPhone || '',
      };

      // Generate order number
      const orderNumber = `FH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

      // Calculate totals
      const totalGross = (session.amount_total || 0) / 100;
      const totalProductionCost = items.reduce((sum, i) => sum + ((i.productionCost || 0) * (i.quantity || 1)), 0);
      const totalProfit = totalGross - totalProductionCost;

      // 1) Save order in Supabase
      let supabaseOrder = null;
      if (supabase && meta.userId) {
        const { data, error } = await supabase.from('orders').insert({
          user_id: meta.userId,
          gallery_id: meta.galleryId ? parseInt(meta.galleryId) : null,
          order_number: orderNumber,
          provider: 'gelato',
          customer_name: `${customer.firstName} ${customer.lastName}`.trim(),
          customer_email: customer.email,
          customer_address: {
            addressLine1: customer.addressLine1,
            city: customer.city,
            postCode: customer.postCode,
            country: customer.country,
            phone: customer.phone,
          },
          total_gross: totalGross,
          total_production_cost: totalProductionCost,
          total_profit: totalProfit,
          status: 'paid',
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          coupon_code: meta.couponCode || null,
        }).select().single();

        if (error) console.error('[Stripe→Supabase] Order insert error:', error);
        else supabaseOrder = data;

        // Insert order items
        if (supabaseOrder && items.length > 0) {
          const orderItems = items.map(item => ({
            order_id: supabaseOrder.id,
            product_sku: item.productSku || item.productUid,
            product_name: item.productName,
            quantity: item.quantity || 1,
            unit_price: item.price,
            production_cost: item.productionCost || 0,
            options: { fileUrl: item.fileUrl },
          }));
          await supabase.from('order_items').insert(orderItems);
        }
      }

      // 2) Submit to Gelato for production (only physical products)
      const physicalItems = items.filter(i => i.productUid && !i.productSku?.startsWith('digital_'));
      if (GELATO_API_KEY && physicalItems.length > 0) {
        try {
          const gelatoOrder = await gelatoFetch(`${GELATO_API_BASE}/orders`, {
            method: 'POST',
            body: JSON.stringify({
              orderType: 'order',
              orderReferenceId: orderNumber,
              customerReferenceId: customer.email,
              lineItems: physicalItems.map((item, i) => ({
                itemReferenceId: `${orderNumber}_${i}`,
                productUid: item.productUid,
                quantity: item.quantity || 1,
                fileUrl: item.fileUrl,
              })),
              shippingAddress: {
                firstName: customer.firstName,
                lastName: customer.lastName,
                addressLine1: customer.addressLine1,
                city: customer.city,
                postCode: customer.postCode,
                country: customer.country,
                email: customer.email,
                phone: customer.phone,
              },
            }),
          });

          // Update order with Gelato ID
          if (supabaseOrder && gelatoOrder?.id) {
            await supabase.from('orders').update({
              external_id: gelatoOrder.id,
              status: 'processing',
            }).eq('id', supabaseOrder.id);
          }

          console.log(`[Stripe→Gelato] ✅ Order ${orderNumber} → Gelato ID: ${gelatoOrder?.id}`);
        } catch (gelatoErr) {
          console.error(`[Stripe→Gelato] ❌ Gelato submission failed for ${orderNumber}:`, gelatoErr.message);
          if (supabaseOrder) {
            await supabase.from('orders').update({
              status: 'paid_gelato_error',
              invoice_numbers: `Gelato Error: ${gelatoErr.message}`,
            }).eq('id', supabaseOrder.id);
          }
        }
      }

      // 3) Send confirmation email
      if (emailTransporter && customer.email) {
        try {
          await emailTransporter.sendMail({
            from: SMTP_FROM,
            to: customer.email,
            subject: `Bestellbestätigung ${orderNumber}`,
            html: `
              <h2>Vielen Dank für deine Bestellung!</h2>
              <p>Bestellnummer: <strong>${orderNumber}</strong></p>
              <p>Betrag: <strong>CHF ${totalGross.toFixed(2)}</strong></p>
              <p>Deine Bestellung wird nun produziert und direkt zu dir versendet.</p>
              <br/>
              <p>Liebe Grüsse,<br/>Fotohahn</p>
            `,
          });
          console.log(`[Stripe] 📧 Confirmation email sent to ${customer.email}`);
        } catch (mailErr) {
          console.error('[Stripe] Email send error:', mailErr.message);
        }
      }

    } catch (processErr) {
      console.error('[Stripe] Webhook processing error:', processErr);
    }
  }

  res.json({ received: true });
});

// ── Start ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Upload-API running on port ${PORT}`);
  console.log(`📁 NAS base: ${NAS_BASE}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}`);
  console.log(`🗄️  DB Backups: täglich 03:00 → ${BACKUP_DIR}`);
  console.log(`📡 Monitoring: alle 5 Min → ${MONITOR_TARGETS.map(t => t.name).join(', ')}`);
  console.log(`   DB Host: ${DB_HOST}:${DB_PORT}`);
  console.log(`🛡️  NAS-Watchdog: alle ${NAS_CHECK_INTERVAL / 1000}s, Restart nach ${NAS_FAIL_THRESHOLD} Fehlern`);
  console.log(`🖨️  Gelato Print API: ${GELATO_API_KEY ? '✅ Active' : '❌ Not configured'}`);
  console.log(`💳 Stripe Payments: ${STRIPE_SECRET_KEY ? '✅ Active' : '❌ Not configured'}`);

  // Auto-purge Cloudflare cache on startup (= after redeploy)
  purgeCloudflareCache();

  // Run initial uptime check on startup
  setTimeout(runUptimeCheck, 5000);

  // Start NAS watchdog
  setInterval(checkNasHealth, NAS_CHECK_INTERVAL);
  // Initial check after 10s (give container time to mount)
  setTimeout(checkNasHealth, 10000);
});
