import { useEffect } from 'react';

/**
 * useDynamicManifest – Dynamically generates a web app manifest so that
 * "Add to Home Screen" preserves the current gallery URL as start_url.
 *
 * Without this, the static manifest.json has start_url: "/" which causes
 * the PWA to open the root page instead of the specific gallery.
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

    // Create a blob URL for the dynamic manifest
    const manifestBlob = new Blob(
      [JSON.stringify(manifest, null, 2)],
      { type: 'application/json' }
    );
    const manifestUrl = URL.createObjectURL(manifestBlob);

    // Find the existing <link rel="manifest"> or create one
    let link = document.querySelector('link[rel="manifest"]');
    const previousHref = link ? link.href : null;

    if (link) {
      link.href = manifestUrl;
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestUrl;
      document.head.appendChild(link);
    }

    // Also update theme-color meta tag
    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta ? themeMeta.content : null;
    if (themeMeta) {
      themeMeta.content = themeColor;
    }

    // Also update apple-touch-icon if custom icon provided
    if (iconUrl) {
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.href = iconUrl;
      }
    }

    // Cleanup: restore original manifest on unmount
    return () => {
      URL.revokeObjectURL(manifestUrl);
      if (link && previousHref) {
        link.href = previousHref;
      }
      if (themeMeta && previousTheme) {
        themeMeta.content = previousTheme;
      }
    };
  }, [name, shortName, startUrl, themeColor, backgroundColor, description, iconUrl]);
};
