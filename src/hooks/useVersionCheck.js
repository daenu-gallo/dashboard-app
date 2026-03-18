import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const DISMISSED_KEY = 'announcement_dismissed_at';

/**
 * useVersionCheck – polls app_config every 60s for version changes.
 * On version change → auto-reloads the page (no popup).
 * Also returns the current announcement (if any).
 * Dismissed announcements stay hidden until a new one is sent.
 */
export const useVersionCheck = () => {
  const [announcement, setAnnouncement] = useState(null);
  const knownVersion = useRef(null);
  const pollTimer = useRef(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('*')
          .eq('key', 'app_settings')
          .maybeSingle();

        if (error || !data) {
          if (error) console.warn('[VersionCheck] Query error:', error.message);
          return;
        }

        // value may be TEXT (string) or JSONB (object) – handle both
        let config = data.value;
        if (typeof config === 'string') {
          try { config = JSON.parse(config); } catch { config = {}; }
        }
        if (!config || typeof config !== 'object') config = {};

        // Version check → auto-reload
        if (config.current_version) {
          if (knownVersion.current === null) {
            // First load – just store it
            knownVersion.current = config.current_version;
          } else if (knownVersion.current !== config.current_version) {
            console.log('[VersionCheck] New version detected, reloading...');
            window.location.reload();
            return;
          }
        }

        // Announcement (with persistent dismiss)
        if (config.announcement && config.announcement.trim()) {
          const announcementTimestamp = config.announcement_at || data.updated_at;
          const dismissedAt = localStorage.getItem(DISMISSED_KEY);

          // Show only if not dismissed, or if announcement is newer than dismissal
          if (!dismissedAt || new Date(announcementTimestamp) > new Date(dismissedAt)) {
            setAnnouncement({
              message: config.announcement,
              type: config.announcement_type || 'info',
              timestamp: announcementTimestamp,
            });
          }
        } else {
          setAnnouncement(null);
          // Clean up dismissed state when announcement is removed
          localStorage.removeItem(DISMISSED_KEY);
        }
      } catch (err) {
        console.error('[VersionCheck] Poll error:', err);
      }
    };

    // Initial check
    checkConfig();

    // Poll every 60 seconds
    pollTimer.current = setInterval(checkConfig, 60000);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const dismissAnnouncement = () => {
    if (announcement?.timestamp) {
      localStorage.setItem(DISMISSED_KEY, announcement.timestamp);
    }
    setAnnouncement(null);
  };

  return { announcement, dismissAnnouncement };
};
