import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * Track a gallery page view.
 * Generates an anonymous visitor hash from browser fingerprint.
 * Debounced: only one view per session per gallery.
 */
export const useTrackView = (galleryId) => {
  const tracked = useRef(false);

  useEffect(() => {
    if (!galleryId || tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      try {
        // Simple anonymous visitor ID from browser fingerprint
        const raw = navigator.userAgent + screen.width + screen.height + navigator.language;
        const encoder = new TextEncoder();
        const data = encoder.encode(raw);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const visitorId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);

        await supabase.from('gallery_views').insert({
          gallery_id: galleryId,
          visitor_id: visitorId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent.slice(0, 200),
        });
      } catch (err) {
        // Silently fail - view tracking is non-critical
        console.debug('[TrackView] Failed:', err.message);
      }
    };

    // Delay slightly to not block initial render
    const timer = setTimeout(trackView, 2000);
    return () => clearTimeout(timer);
  }, [galleryId]);
};
