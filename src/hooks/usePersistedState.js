import { useState, useEffect, useCallback, useRef } from 'react';

const DB_NAME = 'fotohahn_db';
const DB_VERSION = 1;
const STORE_NAME = 'persisted_state';

// Open (or create) the IndexedDB database
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Read a value from IndexedDB
async function idbGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Write a value to IndexedDB
async function idbSet(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * A drop-in replacement for useState that auto-saves to IndexedDB.
 * Uses localStorage as a fast sync cache for small data, and IndexedDB
 * for reliable persistence of large data (images etc.).
 * Supports cross-component sync via custom events.
 */
export function usePersistedState(key, defaultValue) {
  const [state, setState] = useState(() => {
    // Try localStorage first for instant hydration
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch (e) { }
    const initial = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    // Write default to localStorage (small data only, ignore errors)
    try { localStorage.setItem(key, JSON.stringify(initial)); } catch (e) { }
    return initial;
  });

  const initialized = useRef(false);

  // On mount, load from IndexedDB (may have data that didn't fit in localStorage)
  useEffect(() => {
    idbGet(key).then(val => {
      if (val !== undefined) {
        setState(val);
        initialized.current = true;
      } else {
        // No IDB value yet – write current state
        const initial = typeof defaultValue === 'function' ? defaultValue() : defaultValue;
        idbSet(key, initial).catch(() => { });
        initialized.current = true;
      }
    }).catch(() => { initialized.current = true; });
  }, [key]);

  // Flag to prevent self-triggered event re-reads
  const selfUpdate = useRef(false);

  // Save to both localStorage (sync cache) and IndexedDB (reliable)
  // Side effects (persist + dispatch) are deferred via queueMicrotask
  // so they never run during React's render phase.
  const setPersistedState = useCallback((valueOrUpdater) => {
    setState(prev => {
      const newValue = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater;
      // Defer all side effects to avoid setState-during-render errors
      queueMicrotask(() => {
        // Save to IndexedDB (large data safe)
        idbSet(key, newValue).catch(e => {
          console.error(`[usePersistedState] IndexedDB save failed for "${key}":`, e);
        });
        // Try localStorage too (fast sync cache, may fail for large data)
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          // Quota exceeded – remove stale value so next load uses IndexedDB only
          try { localStorage.removeItem(key); } catch (_) {}
        }
        // Dispatch custom event so OTHER hooks with same key re-read
        selfUpdate.current = true;
        window.dispatchEvent(new CustomEvent('persisted-state-change', { detail: { key, value: newValue } }));
        selfUpdate.current = false;
      });
      return newValue;
    });
  }, [key]);

  // Listen for changes from OTHER components using the same key
  useEffect(() => {
    const handleChange = (e) => {
      if (e.detail?.key === key && !selfUpdate.current) {
        // Use value from event directly if available (most reliable)
        if (e.detail.value !== undefined) {
          setState(e.detail.value);
          return;
        }
        // Fallback: try localStorage then IndexedDB
        try {
          const saved = localStorage.getItem(key);
          if (saved !== null) {
            setState(JSON.parse(saved));
            return;
          }
        } catch (e) { }
        idbGet(key).then(val => {
          if (val !== undefined) setState(val);
        }).catch(() => { });
      }
    };

    // Listen for cross-iframe/tab storage events
    const handleStorage = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (err) { }
      }
    };

    window.addEventListener('persisted-state-change', handleChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('persisted-state-change', handleChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [key]);

  return [state, setPersistedState];
}
