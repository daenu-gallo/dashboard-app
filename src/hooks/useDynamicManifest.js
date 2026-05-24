import { useEffect } from 'react';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

/**
 * useDynamicManifest – Points the manifest link to a server-side endpoint
 * that generates a real manifest.json with the correct start_url.
 *
 * iOS Safari ignores blob: and data: URL manifests. The ONLY way to make
 * "Add to Home Screen" preserve the gallery URL is a real HTTP manifest.
 *
 * The server endpoint (upload-api) returns a proper manifest.json with
 * the gallery-specific start_url, name, and theme colors.
 */
export const useDynamicManifest = ({
  name,
  shortName,
  startUrl,
  themeColor = '#528c68',
  backgroundColor = '#0f1419',
  description = '',
  iconUrl = '',
} = {}) => {
  useEffect(() => {
    if (!name || !startUrl) return;

    // Build the server-side manifest URL with query params
    const params = new URLSearchParams({
      start: startUrl,
      name: name,
      short: shortName || name.substring(0, 12),
      desc: description || `Fotogalerie – ${name}`,
      theme: themeColor,
      bg: backgroundColor,
    });
    if (iconUrl) params.set('icon', iconUrl);

    const manifestUrl = `${UPLOAD_API}/api/manifest?${params.toString()}`;

    // Remove ALL existing manifest links
    const existingLinks = document.querySelectorAll('link[rel="manifest"]');
    const previousHrefs = Array.from(existingLinks).map(l => l.href);
    existingLinks.forEach(l => l.remove());

    // Create new manifest link pointing to the server endpoint
    const newLink = document.createElement('link');
    newLink.rel = 'manifest';
    newLink.href = manifestUrl;
    document.head.appendChild(newLink);

    // Update apple-mobile-web-app-title for iOS home screen name
    let titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousAppleTitle = titleMeta ? titleMeta.content : null;
    if (!titleMeta) {
      titleMeta = document.createElement('meta');
      titleMeta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(titleMeta);
    }
    titleMeta.content = shortName || name.substring(0, 12);

    // Update theme-color meta tag
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta ? themeMeta.content : null;
    if (themeMeta) {
      themeMeta.content = themeColor;
    }

    // Update apple-touch-icon if custom icon provided
    if (iconUrl) {
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = iconUrl;
      } else {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.href = iconUrl;
        document.head.appendChild(appleIcon);
      }
    }

    // Cleanup: restore original manifest on unmount
    return () => {
      newLink.remove();
      previousHrefs.forEach(href => {
        const restored = document.createElement('link');
        restored.rel = 'manifest';
        restored.href = href;
        document.head.appendChild(restored);
      });
      if (titleMeta && previousAppleTitle !== null) {
        titleMeta.content = previousAppleTitle;
      }
      if (themeMeta && previousTheme) {
        themeMeta.content = previousTheme;
      }
    };
  }, [name, shortName, startUrl, themeColor, backgroundColor, description, iconUrl]);
};
