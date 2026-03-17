import { useEffect } from 'react';

/**
 * useMetaTags – Dynamically sets document title and meta tags.
 * Supports Open Graph (og:), Twitter Cards, and standard meta tags.
 * Cleans up on unmount to restore defaults.
 *
 * @param {Object} meta
 * @param {string} meta.title - Page title
 * @param {string} meta.description - Meta description
 * @param {string} meta.image - OG image URL (absolute)
 * @param {string} meta.url - Canonical URL
 * @param {string} meta.type - OG type (default: 'website')
 * @param {string} meta.siteName - OG site name
 * @param {string} meta.locale - OG locale (default: 'de_CH')
 */
export const useMetaTags = ({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName = 'Fotohahn Gallery',
  locale = 'de_CH',
} = {}) => {
  useEffect(() => {
    const previousTitle = document.title;
    const createdTags = [];

    const setMeta = (property, content) => {
      if (!content) return;
      // Check if tag already exists
      let tag = document.querySelector(`meta[property="${property}"]`)
        || document.querySelector(`meta[name="${property}"]`);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('article:')) {
          tag.setAttribute('property', property);
        } else {
          tag.setAttribute('name', property);
        }
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
        createdTags.push(tag);
      }
    };

    // Set title
    if (title) {
      document.title = title;
    }

    // Standard meta
    setMeta('description', description);

    // Open Graph
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:image', image);
    setMeta('og:url', url);
    setMeta('og:type', type);
    setMeta('og:site_name', siteName);
    setMeta('og:locale', locale);

    // Twitter Card
    setMeta('twitter:card', image ? 'summary_large_image' : 'summary');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    // Cleanup: restore title and remove created tags
    return () => {
      document.title = previousTitle;
      createdTags.forEach(tag => {
        if (tag.parentNode) tag.parentNode.removeChild(tag);
      });
    };
  }, [title, description, image, url, type, siteName, locale]);
};
