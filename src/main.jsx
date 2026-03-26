import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Cache version reset ──
// Increment this number to force clear all cached data on next load
const CACHE_VERSION = 7;
const storedVersion = localStorage.getItem('_cache_version');
if (!storedVersion || Number(storedVersion) < CACHE_VERSION) {
  // Clear all localStorage
  localStorage.clear();
  // Clear IndexedDB
  try {
    const req = indexedDB.deleteDatabase('fotohahn_db');
    req.onsuccess = () => console.log('[CacheReset] IndexedDB cleared');
  } catch (e) {}
  // Set new version
  localStorage.setItem('_cache_version', String(CACHE_VERSION));
  console.log(`[CacheReset] Cleared all cached data (v${CACHE_VERSION})`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  });
}
