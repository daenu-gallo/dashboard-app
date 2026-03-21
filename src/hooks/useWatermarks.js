import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * useWatermarks – loads watermarks from Supabase `watermarks` table.
 * For authenticated users: loads own watermarks.
 * For anonymous users (customer gallery): pass ownerUserId to load that user's watermarks.
 */
export const useWatermarks = (ownerUserId = null) => {
  const { user } = useAuth();
  const userId = ownerUserId || user?.id;
  const [watermarks, setWatermarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('watermarks')
          .select('*')
          .eq('user_id', userId);
        if (error) { console.warn('[useWatermarks] Error:', error.message); return; }
        if (data) {
          setWatermarks(data.map(w => ({
            id: w.id, name: w.name, wmType: w.wm_type || 'image',
            position: w.position || 'mitte', image: w.image || null,
            text: w.text || '', font: w.font || '',
            scale: w.scale ?? 100, transparency: w.transparency ?? 50,
            tileSpacing: w.tile_spacing ?? 120, tileSize: w.tile_size ?? 60,
          })));
        }
      } catch (err) { console.error('[useWatermarks] Error:', err); }
      setLoading(false);
    };
    load();
  }, [userId]);

  return [watermarks, loading];
};
