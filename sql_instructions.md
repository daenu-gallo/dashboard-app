Um die Kommentarfunktion und die Warenkorb-Erinnerungen zu nutzen, müssen diese zwei Tabellen in Supabase erstellt werden.
Führen Sie diesen SQL-Code im SQL-Editor von Supabase aus:

```sql
-- 1. Tabelle für Bilder-Kommentare
CREATE TABLE IF NOT EXISTS gallery_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_id integer REFERENCES galleries(id) ON DELETE CASCADE,
  photo_name text NOT NULL,
  photo_src text NOT NULL,
  customer_name text NOT NULL,
  customer_email text,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Tabelle für verlassene Warenkörbe (für E-Mail Erinnerungen)
CREATE TABLE IF NOT EXISTS abandoned_carts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  gallery_id integer REFERENCES galleries(id) ON DELETE CASCADE,
  customer_email text NOT NULL,
  cart_data jsonb NOT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  reminder_sent boolean DEFAULT false,
  converted boolean DEFAULT false,
  UNIQUE(gallery_id, customer_email)
);

-- RLS Policies (Optional aber empfohlen)
ALTER TABLE gallery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fotografen können Kommentare sehen" ON gallery_comments FOR ALL USING (
  gallery_id IN (SELECT id FROM galleries WHERE user_id = auth.uid())
);
CREATE POLICY "Jeder kann Kommentare lesen (für Frontend)" ON gallery_comments FOR SELECT USING (true);
CREATE POLICY "Jeder kann Kommentare erstellen (für Frontend)" ON gallery_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Fotografen können Carts sehen" ON abandoned_carts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Jeder kann Carts anlegen/updaten" ON abandoned_carts FOR INSERT WITH CHECK (true);
CREATE POLICY "Jeder kann Carts anlegen/updaten" ON abandoned_carts FOR UPDATE USING (true);
```
