import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUpload } from '../contexts/UploadContext';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

/**
 * Hook to manage gallery images via Supabase + Upload-API (NAS storage).
 * Upload logic is delegated to the global UploadContext so uploads survive navigation.
 *
 * @param {string} galleryId - Supabase gallery UUID
 * @returns {{ images, titleImages, appIconUrl, loading, uploadProgress, uploadQueue, uploadImages, deleteImage, setTitleImage, setMobileTitleImage, setAppIcon, reorderImages, refreshImages }}
 */
export function useGalleryImages(galleryId) {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Global upload context
  const upload = useUpload();

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

      // Group by album_id (stable) with fallback to album_index (legacy)
      const grouped = {};
      (data || []).forEach(img => {
        const key = img.album_id || `idx_${img.album_index}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          id: img.id,
          albumId: img.album_id,
          albumIndex: img.album_index,
          src: UPLOAD_API + img.original_url + '?v=3',
          thumbSrc: UPLOAD_API + img.thumb_url + '?v=3',
          mobileSrc: img.mobile_thumb_url ? (UPLOAD_API + img.mobile_thumb_url + '?v=3') : (UPLOAD_API + img.thumb_url + '?v=3'),
          name: img.filename,
          width: img.width,
          height: img.height,
          sortOrder: img.sort_order,
          fileSize: img.file_size_kb,
          isTitleImage: img.is_title_image,
          isMobileTitleImage: img.is_mobile_title,
          isAppIcon: img.is_app_icon,
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

  // Register refresh callback with global upload context
  useEffect(() => {
    if (!galleryId || !upload) return;
    upload.registerRefresh(galleryId, loadImages);
    return () => upload.unregisterRefresh(galleryId);
  }, [galleryId, loadImages, upload]);

  // ── Get auth token ──
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  // ── Upload: delegate to global context ──
  const uploadImages = useCallback(async (albumIndex, files, onProgress, albumName, albumId) => {
    if (!galleryId || !files?.length || !upload) return [];
    upload.enqueueUpload(galleryId, albumIndex, files, onProgress, albumName, albumId);
    return [];
  }, [galleryId, upload]);

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
    console.log(`[UpdateFlag] Setting ${flag}=${value} on image ${imageId}`);
    const token = await getToken();
    if (!token) { console.error('[UpdateFlag] No auth token!'); return false; }

    try {
      const url = `${UPLOAD_API}/api/images/${imageId}`;
      const response = await fetch(
        url,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ [flag]: value }),
        }
      );

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        console.error(`[UpdateFlag] Failed: ${response.status}`, errBody);
        throw new Error('Update failed');
      }

      await loadImages();
      return true;
    } catch (err) {
      console.error('[UpdateFlag] Error:', err);
      return false;
    }
  }, [loadImages]);

  const setTitleImage = useCallback((imageId, value = true) =>
    updateImageFlag(imageId, 'is_title_image', value), [updateImageFlag]);

  const setMobileTitleImage = useCallback((imageId, value = true) =>
    updateImageFlag(imageId, 'is_mobile_title', value), [updateImageFlag]);

  const setAppIcon = useCallback((imageId, value = true) =>
    updateImageFlag(imageId, 'is_app_icon', value), [updateImageFlag]);

  // ── Reorder images ──
  const reorderImages = useCallback(async (albumKey, reorderedImages) => {
    setImages(prev => ({ ...prev, [albumKey]: reorderedImages }));

    const token = await getToken();
    if (!token) return;

    try {
      const updates = reorderedImages.map((img, idx) => ({
        id: img.id,
        sort_order: idx,
      }));
      for (const u of updates) {
        await supabase.from('images').update({ sort_order: u.sort_order }).eq('id', u.id);
      }
    } catch (err) {
      console.error('[Reorder] Error:', err);
    }
  }, []);

  // Upload state from global context (filtered for this gallery)
  const uploadQueue = upload?.uploadQueue?.filter(q => q.galleryId === galleryId) || [];
  const uploadProgress = upload?.uploadProgress?.galleryId === galleryId ? upload.uploadProgress : null;

  // Computed – return { titelbild, mobile } per album key (matches BilderTab expectations)
  const titleImages = {};
  Object.entries(images).forEach(([key, imgs]) => {
    const title = imgs.find(i => i.isTitleImage);
    const mobile = imgs.find(i => i.isMobileTitleImage);
    if (title || mobile) {
      titleImages[key] = {
        titelbild: title?.thumbSrc || title?.src || null,
        mobile: mobile?.thumbSrc || mobile?.src || null,
      };
    }
  });

  const allImages = Object.values(images).flat();
  const appIconImg = allImages.find(i => i.isAppIcon);
  const appIconUrl = appIconImg?.thumbSrc || null;

  return {
    images,
    titleImages,
    appIconUrl,
    loading,
    uploadProgress,
    uploadQueue,
    uploadImages,
    deleteImage,
    setTitleImage,
    setMobileTitleImage,
    setAppIcon,
    reorderImages,
    refreshImages: loadImages,
  };
}
