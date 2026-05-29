import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

const UploadContext = createContext(null);

export const useUpload = () => useContext(UploadContext);

/**
 * Global Upload Provider — survives React Router navigation.
 * Uploads continue even if the user navigates away from the gallery page.
 */
export function UploadProvider({ children }) {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const queueProcessingRef = useRef(false);
  const uploadQueueRef = useRef([]);
  const wakeLockRef = useRef(null);
  // Store callbacks to refresh images after upload completes
  const refreshCallbacksRef = useRef({});

  // Keep ref in sync with state
  useEffect(() => { uploadQueueRef.current = uploadQueue; }, [uploadQueue]);

  // ── Wake Lock ──
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* ignore */ }
  };
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  // ── Warn before closing browser/tab ──
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

  // ── Get auth token ──
  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token;
  };

  // ── Client-side resize ──
  const resizeImage = (file, maxDim = 4000, quality = 0.85) => new Promise((resolve) => {
    if (!file.type.startsWith('image/')) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width <= maxDim && img.height <= maxDim) { resolve(file); return; }
      const scale = maxDim / Math.max(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: file.lastModified }));
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

  // ── Process queue: upload one album at a time (GLOBAL — never stops on navigation) ──
  const processQueue = useCallback(async () => {
    if (queueProcessingRef.current) return;
    queueProcessingRef.current = true;

    const token = await getToken();
    if (!token) { console.error('[Upload] No auth token available!'); queueProcessingRef.current = false; return; }
    console.log('[Upload] Global queue processing started');

    while (true) {
      const currentQueue = uploadQueueRef.current;
      const nextIdx = currentQueue.findIndex(q => q.status === 'queued');
      if (nextIdx === -1) break;

      const item = currentQueue[nextIdx];

      // Mark as uploading
      setUploadQueue(prev => prev.map((q, i) => i === nextIdx ? { ...q, status: 'uploading', completed: 0 } : q));
      setUploadProgress({ galleryId: item.galleryId, albumIndex: item.albumIndex, albumName: item.albumName, total: item.files.length, completed: 0 });

      const allResults = [];
      let totalSkipped = 0;
      const CONCURRENCY = 5;
      const albumParam = item.albumId ? `aid_${item.albumId}` : item.albumIndex;
      let completedCount = 0;
      console.log(`[Upload] Starting album "${item.albumName}" for gallery ${item.galleryId}: ${item.files.length} files`);

      const uploadSingleFile = async (file, fileIdx) => {
        try {
          const resized = await resizeImage(file);
          const formData = new FormData();
          formData.append('images', resized);

          const response = await fetch(
            `${UPLOAD_API}/api/upload/${item.galleryId}/${albumParam}`,
            {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` },
              body: formData,
            }
          );

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error(`[Upload] File ${fileIdx + 1}/${item.files.length} failed:`, err.error || response.status);
          } else {
            const result = await response.json();
            if (result.images) allResults.push(...result.images);
            if (result.skippedDuplicates) totalSkipped += result.skippedDuplicates;
          }
        } catch (err) {
          console.error(`[Upload] File ${fileIdx + 1}/${item.files.length} error:`, err);
        }

        completedCount++;
        setUploadQueue(prev => prev.map((q, j) => j === nextIdx ? { ...q, completed: completedCount } : q));
        setUploadProgress({ galleryId: item.galleryId, albumIndex: item.albumIndex, albumName: item.albumName, total: item.files.length, completed: completedCount });
        if (item.onProgress) item.onProgress(completedCount, item.files.length);
      };

      // Process in batches
      for (let i = 0; i < item.files.length; i += CONCURRENCY) {
        const batch = item.files.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((file, batchIdx) => uploadSingleFile(file, i + batchIdx)));
      }

      // Mark as done
      setUploadQueue(prev => prev.map((q, i) => i === nextIdx ? { ...q, status: 'done', skippedDuplicates: totalSkipped, newUploads: allResults.length } : q));

      // Trigger refresh callback for this gallery (if the page is still open)
      const refreshFn = refreshCallbacksRef.current[item.galleryId];
      if (refreshFn) {
        try { await refreshFn(); } catch { /* page might have unmounted */ }
      }
    }

    // All done
    setUploadProgress(null);
    setTimeout(() => {
      setUploadQueue(prev => prev.filter(q => q.status !== 'done'));
    }, 3000);

    queueProcessingRef.current = false;
  }, []);

  // ── Public: enqueue upload ──
  const enqueueUpload = useCallback((galleryId, albumIndex, files, onProgress, albumName, albumId) => {
    if (!galleryId || !files?.length) return;

    const queueItem = {
      galleryId,
      albumIndex,
      albumId: albumId || null,
      albumName: albumName || 'Album',
      files: Array.from(files),
      status: 'queued',
      completed: 0,
      onProgress,
    };

    setUploadQueue(prev => [...prev, queueItem]);
    console.log(`[Upload] Enqueued: ${files.length} files for "${albumName}" in gallery ${galleryId}`);

    setTimeout(() => processQueue(), 50);
  }, [processQueue]);

  // ── Register/unregister refresh callbacks per gallery ──
  const registerRefresh = useCallback((galleryId, fn) => {
    refreshCallbacksRef.current[galleryId] = fn;
  }, []);
  const unregisterRefresh = useCallback((galleryId) => {
    delete refreshCallbacksRef.current[galleryId];
  }, []);

  return (
    <UploadContext.Provider value={{
      uploadQueue,
      uploadProgress,
      isUploading,
      enqueueUpload,
      registerRefresh,
      unregisterRefresh,
    }}>
      {children}
    </UploadContext.Provider>
  );
}
