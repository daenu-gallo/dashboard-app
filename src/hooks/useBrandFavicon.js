import { useEffect } from 'react';
import { usePersistedState } from './usePersistedState';

/**
 * Watches the active brand logo and sets it as the browser favicon.
 * Automatically updates when the brand logo changes.
 * Scales the image to 32×32 for favicon compatibility.
 */
export function useBrandFavicon() {
  const [brands] = usePersistedState('settings_brands', [
    { id: 1, name: '', active: true, logo: null },
  ]);

  useEffect(() => {
    const activeBrand = brands.find(b => b.active);
    if (!activeBrand?.logo) return;

    // Scale the brand logo to 32×32 for favicon
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Use 128×128 for sharp rendering on retina/HiDPI displays
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Clear with transparent background
      ctx.clearRect(0, 0, size, size);

      // Scale to fit while maintaining aspect ratio
      const scale = Math.min(size / img.width, size / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (size - w) / 2;
      const y = (size - h) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, w, h);

      const faviconUrl = canvas.toDataURL('image/png');

      // Update or create the favicon link elements
      let link = document.querySelector("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        link.sizes = '128x128';
        document.head.appendChild(link);
      }
      link.type = 'image/png';
      link.href = faviconUrl;

      // Also set apple-touch-icon for mobile
      let appleLink = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = faviconUrl;
    };
    img.src = activeBrand.logo;
  }, [brands]);
}
