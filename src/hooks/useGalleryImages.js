import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

/**
 * Hook to manage gallery images via Supabase + Upload-API (NAS storage).
 * Replaces usePersistedState('gallery_*_images') and related localStorage keys.
 *
 * @param {string} galleryId - Supabase gallery UUID
 * @returns {{ images, titleImages, appIconUrl, loading, uploadProgress, uploadImages, deleteImage, setTitleImage, setMobileTitleImage, setAppIcon, reorderImages, refreshImages }}
 */
export function useGalleryImages(galleryId) {
  // images: { [albumIndex]: [{ id, src, thumbSrc, name, ... }] }
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Load images from Supabase ──
  const loadImages = useCallback(async () => {
    if (!galleryId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('images')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      // Group by album_index
      const grouped = {};
      (data || []).forEach(img => {
        const idx = img.album_index;
        if (!grouped[idx]) grouped[idx] = [];
        grouped[idx].push({
          id: img.id,
          src: UPLOAD_API + img.original_url,
          thumbSrc: UPLOAD_API + img.thumb_url,
          name: img.filename,
          width: img.width,
          height: img.height,
          fileSizeKb: img.file_size_kb,
          sortOrder: img.sort_order,
          isTitleImage: img.is_title_image,
          isMobileTitle: img.is_mobile_title,
          isAppIcon: img.is_app_icon,
          _raw: img,
        });
      });

      if (mountedRef.current) {
        setImages(grouped);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useGalleryImages] Load error:', err);
      if (mountedRef.current) setLoading(false);
    }
  }, [galleryId]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // ── Get auth token ──
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  // ── Upload images ──
  const uploadImages = useCallback(async (albumIndex, files) => {
    if (!galleryId || !files?.length) return [];
    const token = await getToken();
    if (!token) { console.error('[Upload] No auth token'); return []; }

    const formData = new FormData();
    for (const file of files) {
      formData.append('images', file);
    }

    try {
      setUploadProgress({ albumIndex, total: files.length, completed: 0 });

      const response = await fetch(
        `${UPLOAD_API}/api/upload/${galleryId}/${albumIndex}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed (${response.status})`);
      }

      const result = await response.json();

      // Refresh images from DB
      await loadImages();

      setUploadProgress(prev => prev ? { ...prev, completed: files.length } : null);
      setTimeout(() => {
        if (mountedRef.current) setUploadProgress(null);
      }, 2500);

      return result.images || [];
    } catch (err) {
      console.error('[Upload] Error:', err);
      if (mountedRef.current) setUploadProgress(null);
      return [];
    }
  }, [galleryId, loadImages]);

  // ── Delete image ──
  const deleteImage = useCallback(async (albumIndex, imageId) => {
    const token = await getToken();
    if (!token) return false;

    try {
      const response = await fetch(
        `${UPLOAD_API}/api/images/${imageId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Delete failed');

      // Remove from local state instantly
      setImages(prev => {
        const albumImgs = [...(prev[albumIndex] || [])];
        const filtered = albumImgs.filter(img => img.id !== imageId);
        return { ...prev, [albumIndex]: filtered };
      });

      return true;
    } catch (err) {
      console.error('[Delete] Error:', err);
      return false;
    }
  }, []);

  // ── Set title/mobile/app-icon flags ──
  const updateImageFlag = useCallback(async (imageId, flag, value = true) => {
    const token = await getToken();
    if (!token) return false;

    try {
      const response = await fetch(
        `${UPLOAD_API}/api/images/${imageId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [flag]: value }),
        }
      );

      if (!response.ok) throw new Error('Update failed');

      // Refresh to get updated flags
      await loadImages();
      return true;
    } catch (err) {
      console.error('[UpdateFlag] Error:', err);
      return false;
    }
  }, [loadImages]);

  const setTitleImage = useCallback((imageId) =>
    updateImageFlag(imageId, 'is_title_image'), [updateImageFlag]);

  const setMobileTitleImage = useCallback((imageId) =>
    updateImageFlag(imageId, 'is_mobile_title'), [updateImageFlag]);

  const setAppIcon = useCallback((imageId) =>
    updateImageFlag(imageId, 'is_app_icon'), [updateImageFlag]);

  // ── Reorder images ──
  const reorderImages = useCallback(async (albumIndex, imageIds) => {
    const token = await getToken();
    if (!token) return false;

    try {
      const response = await fetch(
        `${UPLOAD_API}/api/images/reorder`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageIds }),
        }
      );

      if (!response.ok) throw new Error('Reorder failed');

      // Update local state order
      setImages(prev => {
        const albumImgs = prev[albumIndex] || [];
        const ordered = imageIds.map(id => albumImgs.find(img => img.id === id)).filter(Boolean);
        return { ...prev, [albumIndex]: ordered };
      });

      return true;
    } catch (err) {
      console.error('[Reorder] Error:', err);
      return false;
    }
  }, []);

  // ── Computed values ──

  // Title images per album: { [albumIndex]: { titelbild: url, mobile: url } }
  const titleImages = {};
  Object.entries(images).forEach(([albumIdx, imgs]) => {
    const title = imgs.find(i => i.isTitleImage);
    const mobile = imgs.find(i => i.isMobileTitle);
    if (title || mobile) {
      titleImages[albumIdx] = {
        titelbild: title?.src || null,
        mobile: mobile?.src || null,
      };
    }
  });

  // App icon URL (first image flagged as app icon across all albums)
  const appIconImg = Object.values(images).flat().find(i => i.isAppIcon);
  const appIconUrl = appIconImg?.thumbSrc || null;

  return {
    images,
    titleImages,
    appIconUrl,
    loading,
    uploadProgress,
    uploadImages,
    deleteImage,
    setTitleImage,
    setMobileTitleImage,
    setAppIcon,
    reorderImages,
    refreshImages: loadImages,
  };
}
