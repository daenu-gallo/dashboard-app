-- ============================================
-- Shop Module — Supabase Tables
-- Run this in the Supabase SQL Editor
-- ============================================

-- 1. Shop Settings (billing address, settlement account, payment methods)
CREATE TABLE IF NOT EXISTS shop_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  billing_address JSONB DEFAULT '{}'::jsonb,
  settlement_account JSONB DEFAULT '{}'::jsonb,
  customer_payment JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Price Lists
CREATE TABLE IF NOT EXISTS price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Standard',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Price List Items
CREATE TABLE IF NOT EXISTS price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Ausdrucke',
  lab TEXT NOT NULL DEFAULT 'gelato',
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_id UUID REFERENCES galleries(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  invoice_numbers TEXT,
  provider TEXT NOT NULL DEFAULT 'gelato',
  customer_name TEXT,
  customer_email TEXT,
  customer_address JSONB DEFAULT '{}'::jsonb,
  total_gross NUMERIC(10,2) DEFAULT 0,
  total_production_cost NUMERIC(10,2) DEFAULT 0,
  total_shipping NUMERIC(10,2) DEFAULT 0,
  service_fee NUMERIC(10,2) DEFAULT 0,
  total_profit NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  coupon_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  production_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  options JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Shop Documents (invoices, payout statements)
CREATE TABLE IF NOT EXISTS shop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'invoice',
  info TEXT,
  status TEXT DEFAULT 'paid',
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Shop Automation Settings
CREATE TABLE IF NOT EXISTS shop_automation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_list_id UUID REFERENCES price_lists(id) ON DELETE SET NULL,
  email_package TEXT DEFAULT 'standard',
  coupon_marketing BOOLEAN DEFAULT false,
  coupon_marketing_code TEXT,
  coupon_marketing_frequency INTEGER DEFAULT 10,
  coupon_marketing_start DATE,
  coupon_marketing_end DATE,
  cart_reminder BOOLEAN DEFAULT false,
  product_recommendation BOOLEAN DEFAULT false,
  free_shipping BOOLEAN DEFAULT false,
  free_shipping_threshold NUMERIC(10,2) DEFAULT 99,
  post_purchase_coupon BOOLEAN DEFAULT false,
  post_purchase_coupon_code TEXT,
  included_tags TEXT[] DEFAULT '{}',
  excluded_galleries UUID[] DEFAULT '{}',
  email_order_subject TEXT DEFAULT 'Vielen Dank für deine Bestellung!',
  email_shipping_subject TEXT DEFAULT 'Deine Bestellung wurde versendet!',
  email_cart_subject TEXT DEFAULT 'Du hast Fotos im Warenkorb vergessen!',
  email_sender_name TEXT,
  email_reply_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_automation ENABLE ROW LEVEL SECURITY;

-- Shop Settings: owner only
CREATE POLICY "shop_settings_owner" ON shop_settings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price Lists: owner only
CREATE POLICY "price_lists_owner" ON price_lists
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Price List Items: owner via price_list
CREATE POLICY "price_list_items_owner" ON price_list_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM price_lists WHERE price_lists.id = price_list_items.price_list_id AND price_lists.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM price_lists WHERE price_lists.id = price_list_items.price_list_id AND price_lists.user_id = auth.uid())
  );

-- Coupons: owner only
CREATE POLICY "coupons_owner" ON coupons
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Orders: owner only
CREATE POLICY "orders_owner" ON orders
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Order Items: owner via order
CREATE POLICY "order_items_owner" ON order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Shop Documents: owner only
CREATE POLICY "shop_documents_owner" ON shop_documents
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Shop Automation: owner only
CREATE POLICY "shop_automation_owner" ON shop_automation
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_gallery_id ON orders(gallery_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_price_lists_user_id ON price_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_coupons_user_id ON coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_documents_user_id ON shop_documents(user_id);
