import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const GalleryContext = createContext(null);

// Slug helper
export const toSlug = (title) =>
  title.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

export const GalleryProvider = ({ children }) => {
  const { user } = useAuth();
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ─── Fetch all galleries for current user ───
  const fetchGalleries = useCallback(async () => {
    if (!user) { setGalleries([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('galleries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setGalleries(data || []);
    } catch (err) {
      console.error('[GalleryContext] fetchGalleries error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchGalleries(); }, [fetchGalleries]);

  // ─── Create gallery ───
  const createGallery = useCallback(async ({ title, internalName, shootingDate, preset, brand, designTemplate }) => {
    if (!user) throw new Error('Not authenticated');

    const slug = toSlug(title);

    // Design template defaults
    const templateDefaults = {
      'atelier': { primaryColor: '#f0f0f4', secondaryColor: '#1a1a1a', font: 'Inter', spacing: 'klein', display: 'standard' },
      'dark-shark': { primaryColor: '#1a1a2e', secondaryColor: '#e8d5b7', font: 'Josefin Sans', spacing: 'klein', display: 'standard' },
      'lazy-r': { primaryColor: '#f5f0eb', secondaryColor: '#2d4a3e', font: 'Playfair Display', spacing: 'mittel', display: 'standard' },
      'luminance': { primaryColor: '#1a0a10', secondaryColor: '#d4a0a0', font: 'Cormorant Garamond', spacing: 'klein', display: 'standard' },
      'noir-classique': { primaryColor: '#111111', secondaryColor: '#ffffff', font: 'Montserrat', spacing: 'mittel', display: 'kacheln' },
    };

    const templateId = (() => {
      const name = designTemplate || 'Atelier';
      if (name === 'Atelier') return 'atelier';
      if (name === 'Dark Shark') return 'dark-shark';
      if (name === 'Lazy R') return 'lazy-r';
      if (name === 'Luminance') return 'luminance';
      if (name === 'Noir Classique') return 'noir-classique';
      return 'atelier';
    })();
    const td = templateDefaults[templateId] || templateDefaults['atelier'];

    const toggles = {
      appHinweis: preset ? preset.appHinweis !== false : true,
      teilen: preset ? preset.teilen !== false : true,
      kommentarfunktion: preset ? preset.kommentar !== false : true,
      dateienamen: preset ? preset.zeigeDateinamen || false : false,
      download: preset ? preset.download !== false : true,
      downloadPin: preset ? preset.downloadPin || false : false,
      wasserzeichen: preset ? !!preset.wasserzeichen : false,
      selectedWatermarkId: preset?.wasserzeichen || null,
    };

    const design = {
      template: templateId,
      primaryColor: preset?.primaerfarbe || td.primaryColor,
      secondaryColor: preset?.sekundaerfarbe || td.secondaryColor,
      font: preset?.schriftart || td.font,
      spacing: preset?.bildabstand || td.spacing,
      display: preset?.bilddarstellung || td.display,
    };

    const tracking = preset ? {
      gaCode: preset?.gaCode || '',
      gtmId: preset?.gtmId || '',
      fbPixel: preset?.fbPixel || '',
    } : {};

    // Calculate expiry date from preset.ablauf (days from now)
    let expiryDate = null;
    if (preset?.ablauf) {
      const d = new Date();
      d.setDate(d.getDate() + parseInt(preset.ablauf));
      expiryDate = d.toISOString().split('T')[0];
    }

    // Tags: preset stores as comma-separated string or array
    let tagsArray = [];
    if (preset?.tags) {
      tagsArray = Array.isArray(preset.tags) ? preset.tags : preset.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const galleryData = {
      user_id: user.id,
      title: title.trim(),
      slug,
      internal_name: internalName?.trim() || null,
      shooting_date: shootingDate || null,
      brand: brand || preset?.marke || null,
      language: preset?.sprache || 'Deutsch',
      domain: preset?.domain || null,
      domain_path: slug,
      message: preset?.mitteilung || null,
      expiry_date: expiryDate,
      tags: tagsArray,
      download_pin_code: preset?.downloadPinCode || null,
      toggles,
      design,
      tracking,
      color: '#528c68',
    };

    const { data, error: err } = await supabase
      .from('galleries')
      .insert(galleryData)
      .select()
      .single();
    if (err) throw err;

    // Create preset albums if any
    const albumNames = preset?.alben || [];
    console.log('[createGallery] Preset albums to create:', albumNames, '| Raw preset.alben:', preset?.alben, '| Full preset keys:', preset ? Object.keys(preset) : 'null');
    if (albumNames.length > 0) {
      const albumsToInsert = albumNames.map((name, i) => ({
        gallery_id: data.id,
        name: typeof name === 'string' ? name : (name?.name || `Album ${i + 1}`),
        sort_order: i,
      }));
      const { error: albumErr } = await supabase.from('albums').insert(albumsToInsert);
      if (albumErr) console.error('[createGallery] Album insert error:', albumErr);
      else console.log('[createGallery] Created', albumsToInsert.length, 'albums');
    }

    // Update local state immediately
    setGalleries(prev => [data, ...prev]);
    return data;
  }, [user]);

  // ─── Update gallery ───
  const updateGallery = useCallback(async (id, updates) => {
    const { data, error: err } = await supabase
      .from('galleries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (err) throw err;
    setGalleries(prev => prev.map(g => g.id === id ? data : g));
    return data;
  }, []);

  // ─── Delete gallery ───
  const deleteGallery = useCallback(async (id) => {
    // Clean up NAS files, images, albums, views via upload-API
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';
        await fetch(`${UPLOAD_API}/api/gallery/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn('[deleteGallery] NAS cleanup failed (continuing):', err.message);
    }

    // Delete gallery record from Supabase
    const { error: err } = await supabase
      .from('galleries')
      .delete()
      .eq('id', id);
    if (err) throw err;
    setGalleries(prev => prev.filter(g => g.id !== id));
  }, []);

  // ─── Get single gallery by slug ───
  const getGalleryBySlug = useCallback((slugToFind) => {
    return galleries.find(g => g.slug === slugToFind) || null;
  }, [galleries]);

  const value = {
    galleries,
    loading,
    error,
    fetchGalleries,
    createGallery,
    updateGallery,
    deleteGallery,
    getGalleryBySlug,
    toSlug,
  };

  return (
    <GalleryContext.Provider value={value}>
      {children}
    </GalleryContext.Provider>
  );
};

export const useGalleries = () => {
  const context = useContext(GalleryContext);
  if (!context) throw new Error('useGalleries must be used within a GalleryProvider');
  return context;
};
