-- ============================================
-- 007: RLS for galleries and brands tables
-- Enable Row Level Security to ensure each
-- user can only manage their own data.
-- Anonymous users can read (for customer views).
-- ============================================

-- ── Galleries ──
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own galleries
CREATE POLICY "Users manage own galleries" ON galleries
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can read galleries (customer view, public access)
CREATE POLICY "Public read galleries" ON galleries
  FOR SELECT USING (true);

-- ── Brands ──
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own brands
CREATE POLICY "Users manage own brands" ON brands
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can read brands (for customer domain lookup, branding display)
CREATE POLICY "Public read brands" ON brands
  FOR SELECT USING (true);
