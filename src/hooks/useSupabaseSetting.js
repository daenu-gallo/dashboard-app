import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to load/save a single setting from Supabase user_settings table.
 * Replaces usePersistedState for global settings.
 * 
 * @param {string} key - Setting key (e.g. 'global_brand_settings')
 * @param {any} defaultValue - Default value if not found in DB
 * @returns {[value, setValue, loading]} - Current value, setter, loading state
 */
export function useSupabaseSetting(key, defaultValue) {
  const { user } = useAuth();
  const [value, setValueState] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    if (!user || !key) { setLoading(false); return; }

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', key)
          .maybeSingle();

        if (error) throw error;
        if (data?.value !== undefined && data?.value !== null) {
          setValueState(data.value);
        }
      } catch (err) {
        console.error(`[useSupabaseSetting] Load "${key}" error:`, err);
      }
      setLoading(false);
    };
    load();
  }, [user, key]);

  // Save to Supabase (upsert)
  const setValue = useCallback(async (newValue) => {
    // Support functional updates like setState(prev => ...)
    const resolvedValue = typeof newValue === 'function' ? newValue(value) : newValue;
    setValueState(resolvedValue);

    if (!user || !key) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          key,
          value: resolvedValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' });

      if (error) throw error;
    } catch (err) {
      console.error(`[useSupabaseSetting] Save "${key}" error:`, err);
    }
  }, [user, key, value]);

  return [value, setValue, loading];
}

/**
 * Hook to load ALL user settings at once (for performance).
 * Useful for SettingsPage which uses many settings.
 */
export function useAllSupabaseSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('key, value')
          .eq('user_id', user.id);

        if (error) throw error;
        const map = {};
        (data || []).forEach(row => { map[row.key] = row.value; });
        setSettings(map);
      } catch (err) {
        console.error('[useAllSupabaseSettings] Load error:', err);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const saveSetting = useCallback(async (key, value) => {
    if (!user) return;
    setSettings(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          key,
          value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' });

      if (error) throw error;
    } catch (err) {
      console.error(`[useAllSupabaseSettings] Save "${key}" error:`, err);
    }
  }, [user]);

  return { settings, saveSetting, loading };
}
