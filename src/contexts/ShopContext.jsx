import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const ShopContext = createContext(null);

export const useShop = () => {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within a ShopProvider');
  return ctx;
};

export const ShopProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [shopSettings, setShopSettings] = useState(null);
  const [priceLists, setPriceLists] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [orders, setOrders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [automation, setAutomation] = useState(null);

  // ─── Fetch Shop Settings ───
  const fetchShopSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setShopSettings(data);
  }, [user]);

  // ─── Upsert Shop Settings ───
  const saveShopSettings = useCallback(async (updates) => {
    if (!user) return;
    const payload = { user_id: user.id, ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('shop_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) { console.error('[ShopContext] saveShopSettings:', error); return null; }
    setShopSettings(data);
    return data;
  }, [user]);

  // ─── Fetch Price Lists ───
  const fetchPriceLists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('price_lists')
      .select('*, price_list_items(*)')
      .eq('user_id', user.id)
      .order('created_at');
    setPriceLists(data || []);
  }, [user]);

  // ─── Create Price List ───
  const createPriceList = useCallback(async (name, items = []) => {
    if (!user) return null;
    const { data: list, error } = await supabase
      .from('price_lists')
      .insert({ user_id: user.id, name })
      .select()
      .single();
    if (error) { console.error('[ShopContext] createPriceList:', error); return null; }

    if (items.length > 0) {
      const rows = items.map((item) => ({ ...item, price_list_id: list.id }));
      await supabase.from('price_list_items').insert(rows);
    }
    await fetchPriceLists();
    return list;
  }, [user, fetchPriceLists]);

  // ─── Update Price List Items ───
  const updatePriceListItem = useCallback(async (itemId, updates) => {
    const { error } = await supabase
      .from('price_list_items')
      .update(updates)
      .eq('id', itemId);
    if (error) console.error('[ShopContext] updatePriceListItem:', error);
  }, []);

  // ─── Delete Price List ───
  const deletePriceList = useCallback(async (listId) => {
    const { error } = await supabase.from('price_lists').delete().eq('id', listId);
    if (error) { console.error('[ShopContext] deletePriceList:', error); return false; }
    await fetchPriceLists();
    return true;
  }, [fetchPriceLists]);

  // ─── Fetch Coupons ───
  const fetchCoupons = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    setCoupons(data || []);
  }, [user]);

  // ─── Create Coupon ───
  const createCoupon = useCallback(async ({ code, name, discount_type, discount_value }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('coupons')
      .insert({ user_id: user.id, code, name, discount_type, discount_value })
      .select()
      .single();
    if (error) { console.error('[ShopContext] createCoupon:', error); return null; }
    await fetchCoupons();
    return data;
  }, [user, fetchCoupons]);

  // ─── Update Coupon ───
  const updateCoupon = useCallback(async (id, updates) => {
    const { error } = await supabase
      .from('coupons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('[ShopContext] updateCoupon:', error); return false; }
    await fetchCoupons();
    return true;
  }, [fetchCoupons]);

  // ─── Delete Coupon ───
  const deleteCoupon = useCallback(async (id) => {
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) { console.error('[ShopContext] deleteCoupon:', error); return false; }
    await fetchCoupons();
    return true;
  }, [fetchCoupons]);

  // ─── Fetch Orders ───
  const fetchOrders = useCallback(async (dateFrom, dateTo) => {
    if (!user) return;
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

    const { data } = await query;
    setOrders(data || []);
  }, [user]);

  // ─── Fetch Documents ───
  const fetchDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shop_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('doc_date', { ascending: false });
    setDocuments(data || []);
  }, [user]);

  // ─── Fetch Automation ───
  const fetchAutomation = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('shop_automation')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setAutomation(data);
  }, [user]);

  // ─── Save Automation ───
  const saveAutomation = useCallback(async (updates) => {
    if (!user) return null;
    const payload = { user_id: user.id, ...updates, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('shop_automation')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) { console.error('[ShopContext] saveAutomation:', error); return null; }
    setAutomation(data);
    return data;
  }, [user]);

  // ─── Initial Load ───
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetchShopSettings(),
      fetchPriceLists(),
      fetchCoupons(),
      fetchOrders(),
      fetchDocuments(),
      fetchAutomation(),
    ]).finally(() => setLoading(false));
  }, [user, fetchShopSettings, fetchPriceLists, fetchCoupons, fetchOrders, fetchDocuments, fetchAutomation]);

  const value = {
    loading,
    // Shop Settings
    shopSettings, saveShopSettings, fetchShopSettings,
    // Price Lists
    priceLists, fetchPriceLists, createPriceList, updatePriceListItem, deletePriceList,
    // Coupons
    coupons, fetchCoupons, createCoupon, updateCoupon, deleteCoupon,
    // Orders
    orders, fetchOrders,
    // Documents
    documents, fetchDocuments,
    // Automation
    automation, saveAutomation, fetchAutomation,
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export default ShopContext;
