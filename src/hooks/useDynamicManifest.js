import { useEffect } from 'react';

/**
 * useDynamicManifest – Dynamically generates a web app manifest so that
 * "Add to Home Screen" preserves the current gallery URL as start_url.
 *
 * Uses multiple strategies for cross-browser compatibility:
 * - Replaces <link rel="manifest"> with data: URL (works on most browsers)
 * - Sets Apple-specific meta tags for iOS Safari (which ignores dynamic manifests)
 * - Updates theme-color and apple-touch-icon
 *
 * @param {Object} options
 * @param {string} options.name - App name (e.g. gallery title)
 * @param {string} options.shortName - Short name for home screen
 * @param {string} options.startUrl - The URL to open when launching from home screen
 * @param {string} [options.themeColor] - Theme color
 * @param {string} [options.backgroundColor] - Background color
 * @param {string} [options.description] - App description
 * @param {string} [options.iconUrl] - URL for the app icon (optional)
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

    // Build a dynamic manifest object
    const manifest = {
      name: name,
      short_name: shortName || name.substring(0, 12),
      description: description || `Fotogalerie – ${name}`,
      start_url: startUrl,
      scope: '/',
      display: 'standalone',
      background_color: backgroundColor,
      theme_color: themeColor,
      orientation: 'any',
      icons: [
        {
          src: iconUrl || '/logo192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/logo512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['photography'],
      lang: 'de',
      dir: 'ltr',
    };

    // ── Strategy 1: Replace manifest link with data: URL ──
    // Remove ALL existing manifest links (iOS caches the first one it sees)
    const existingLinks = document.querySelectorAll('link[rel="manifest"]');
    const previousHrefs = Array.from(existingLinks).map(l => l.href);
    existingLinks.forEach(l => l.remove());

    // Create new manifest link with data: URL (more compatible than blob: on iOS)
    const manifestJson = JSON.stringify(manifest);
    const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(manifestJson)}`;
    const newLink = document.createElement('link');
    newLink.rel = 'manifest';
    newLink.href = dataUrl;
    document.head.appendChild(newLink);

    // ── Strategy 2: Apple-specific meta tags for iOS Safari ──
    // iOS Safari often ignores the manifest for "Add to Home Screen"
    // and instead uses these meta tags + current URL as start URL.

    // apple-mobile-web-app-capable: makes it open as standalone app
    let awacMeta = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
    if (!awacMeta) {
      awacMeta = document.createElement('meta');
      awacMeta.name = 'apple-mobile-web-app-capable';
      document.head.appendChild(awacMeta);
    }
    awacMeta.content = 'yes';

    // apple-mobile-web-app-title: sets the app name on home screen
    let titleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const previousAppleTitle = titleMeta ? titleMeta.content : null;
    if (!titleMeta) {
      titleMeta = document.createElement('meta');
      titleMeta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(titleMeta);
    }
    titleMeta.content = shortName || name.substring(0, 12);

    // apple-mobile-web-app-status-bar-style
    let statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusMeta) {
      statusMeta = document.createElement('meta');
      statusMeta.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(statusMeta);
    }
    statusMeta.content = 'black-translucent';

    // ── Strategy 3: Update theme-color meta tag ──
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta ? themeMeta.content : null;
    if (themeMeta) {
      themeMeta.content = themeColor;
    }

    // ── Strategy 4: Update apple-touch-icon ──
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
      // Remove our dynamic link
      newLink.remove();
      // Restore original manifest links
      previousHrefs.forEach(href => {
        const restored = document.createElement('link');
        restored.rel = 'manifest';
        restored.href = href;
        document.head.appendChild(restored);
      });
      // Restore Apple title
      if (titleMeta && previousAppleTitle !== null) {
        titleMeta.content = previousAppleTitle;
      }
      // Restore theme
      if (themeMeta && previousTheme) {
        themeMeta.content = previousTheme;
      }
    };
  }, [name, shortName, startUrl, themeColor, backgroundColor, description, iconUrl]);
};
