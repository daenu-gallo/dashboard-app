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

  // ── Upload Queue: one album at a time ──
  const [uploadQueue, setUploadQueue] = useState([]); // [{ albumIndex, albumName, files, status: 'queued'|'uploading'|'done' }]
  const queueProcessingRef = useRef(false);
  const uploadQueueRef = useRef([]);
  const wakeLockRef = useRef(null);

  // Prevent device sleep during uploads (Wake Lock API)
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[Upload] Wake lock acquired');
      }
    } catch (err) { console.warn('[Upload] Wake lock failed:', err.message); }
  };
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      console.log('[Upload] Wake lock released');
    }
  };

  // Warn before closing/navigating during active uploads
  const isUploading = uploadQueue.some(q => q.status === 'uploading' || q.status === 'queued');
  useEffect(() => {
    if (!isUploading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = 'Upload läuft noch. Wirklich verlassen?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    acquireWakeLock();
    return () => {
      window.removeEventListener('beforeunload', handler);
      releaseWakeLock();
    };
  }, [isUploading]);

  // Keep ref in sync with state
  useEffect(() => { uploadQueueRef.current = uploadQueue; }, [uploadQueue]);

  // Process queue: upload one album at a time
  const processQueue = useCallback(async () => {
    if (queueProcessingRef.current) return; // Already processing
    queueProcessingRef.current = true;

    const token = await getToken();
    if (!token) { queueProcessingRef.current = false; return; }

    while (true) {
      // Find next queued item
      const currentQueue = uploadQueueRef.current;
      const nextIdx = currentQueue.findIndex(q => q.status === 'queued');
      if (nextIdx === -1) break; // No more items

      const item = currentQueue[nextIdx];

      // Mark as uploading
      setUploadQueue(prev => prev.map((q, i) => i === nextIdx ? { ...q, status: 'uploading', completed: 0 } : q));
      setUploadProgress({ albumIndex: item.albumIndex, albumName: item.albumName, total: item.files.length, completed: 0 });

      const allResults = [];
      let totalSkipped = 0;

      for (let i = 0; i < item.files.length; i++) {
        if (!mountedRef.current) break;

        try {
          const formData = new FormData();
          formData.append('images', item.files[i]);

          // Use albumId (UUID) if available, fall back to albumIndex
          const albumParam = item.albumId || item.albumIndex;
          const response = await fetch(
            `${UPLOAD_API}/api/upload/${galleryId}/${albumParam}`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            }
          );

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error(`[Upload] File ${i + 1}/${item.files.length} failed:`, err.error || response.status);
          } else {
            const result = await response.json();
            if (result.images) allResults.push(...result.images);
            if (result.skippedDuplicates) totalSkipped += result.skippedDuplicates;
          }
        } catch (err) {
          console.error(`[Upload] File ${i + 1}/${item.files.length} error:`, err);
        }

        // Update progress
        const completed = i + 1;
        if (mountedRef.current) {
          setUploadQueue(prev => prev.map((q, j) => j === nextIdx ? { ...q, completed } : q));
          setUploadProgress({ albumIndex: item.albumIndex, albumName: item.albumName, total: item.files.length, completed });
          if (item.onProgress) item.onProgress(completed, item.files.length);
        }
      }

      // Mark as done (include skipped info)
      setUploadQueue(prev => prev.map((q, i) => i === nextIdx ? { ...q, status: 'done', skippedDuplicates: totalSkipped, newUploads: allResults.length } : q));

      // Refresh images from DB after each album
      await loadImages();
    }

    // All done — clear queue after delay
    if (mountedRef.current) {
      setUploadProgress(null);
      setTimeout(() => {
        if (mountedRef.current) {
          setUploadQueue(prev => prev.filter(q => q.status !== 'done'));
        }
      }, 3000);
    }

    queueProcessingRef.current = false;
  }, [galleryId, loadImages]);

  // Public API: enqueue an album upload
  const uploadImages = useCallback(async (albumIdOrIndex, files, onProgress, albumName, albumId) => {
    if (!galleryId || !files?.length) return [];

    const queueItem = {
      albumIndex: typeof albumIdOrIndex === 'number' ? albumIdOrIndex : null,
      albumId: albumId || (typeof albumIdOrIndex === 'string' ? albumIdOrIndex : null),
      albumName: albumName || `Album`,
      files: Array.from(files),
      status: 'queued',
      completed: 0,
      onProgress,
    };

    setUploadQueue(prev => [...prev, queueItem]);

    // Kick off processing (no-op if already running)
    // Use setTimeout to ensure state is updated before processing
    setTimeout(() => processQueue(), 50);

    return [];
  }, [galleryId, processQueue]);

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

  // ── Reassign album indexes (when albums are reordered) ──
  const reassignAlbumIndexes = useCallback(async (indexMapping) => {
    // indexMapping: { oldIndex: newIndex, ... }
    // e.g., when adding album at front: { 0: 1, 1: 2, ..., N: N+1 }
    // e.g., when swapping 2 and 3: { 2: 3, 3: 2 }
    if (!galleryId) return false;

    try {
      // Get all images for this gallery
      const { data: allImages, error } = await supabase
        .from('images')
        .select('id, album_index')
        .eq('gallery_id', galleryId);

      if (error) throw error;
      if (!allImages?.length) return true;

      // Find images that need updating
      const updates = allImages
        .filter(img => indexMapping[img.album_index] !== undefined)
        .map(img => ({
          id: img.id,
          newIndex: indexMapping[img.album_index],
        }));

      if (updates.length === 0) return true;

      // Use a temporary high offset to avoid collisions during reindex
      const OFFSET = 10000;

      // Step 1: Move all affected images to temp indexes
      for (const { id, newIndex } of updates) {
        await supabase
          .from('images')
          .update({ album_index: newIndex + OFFSET })
          .eq('id', id);
      }

      // Step 2: Move from temp to final indexes
      for (const { id, newIndex } of updates) {
        await supabase
          .from('images')
          .update({ album_index: newIndex })
          .eq('id', id);
      }

      // Refresh images
      await loadImages();
      return true;
    } catch (err) {
      console.error('[ReassignAlbumIndexes] Error:', err);
      return false;
    }
  }, [galleryId, loadImages]);


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
    uploadQueue,
    uploadImages,
    deleteImage,
    setTitleImage,
    setMobileTitleImage,
    setAppIcon,
    reorderImages,
    reassignAlbumIndexes,
    refreshImages: loadImages,
  };
}
