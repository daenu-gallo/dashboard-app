import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ── Cache version reset ──
// Increment this number to force clear all cached data on next load
const CACHE_VERSION = 4;
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

