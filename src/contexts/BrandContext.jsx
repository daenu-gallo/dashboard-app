import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const BrandContext = createContext();

export const useBrand = () => useContext(BrandContext);

/**
 * Provides global brand settings from Supabase user_settings table.
 * Replaces all usePersistedState('global_brand_settings', ...) calls.
 */
export const BrandProvider = ({ children }) => {
  const { user } = useAuth();
  const [globalBrand, setGlobalBrandState] = useState({});
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load brand settings from user_settings + brands table
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const load = async () => {
      try {
        // Load global_brand_settings from user_settings
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', 'global_brand_settings')
          .maybeSingle();

        if (settingsRow?.value) {
          setGlobalBrandState(settingsRow.value);
        }

        // Load brands list from brands table
        const { data: brandsList } = await supabase
          .from('brands')
          .select('*')
          .eq('user_id', user.id);

        setBrands(brandsList || []);
      } catch (err) {
        console.error('[BrandContext] Load error:', err);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Save brand settings
  const setGlobalBrand = useCallback(async (newBrand) => {
    const resolved = typeof newBrand === 'function' ? newBrand(globalBrand) : newBrand;
    setGlobalBrandState(resolved);

    if (!user) return;
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          key: 'global_brand_settings',
          value: resolved,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' });
    } catch (err) {
      console.error('[BrandContext] Save error:', err);
    }
  }, [user, globalBrand]);

  return (
    <BrandContext.Provider value={{ globalBrand, setGlobalBrand, brands, setBrands, loading }}>
      {children}
    </BrandContext.Provider>
  );
};
