# Shop-Integration – Fotohahn Galerie-Plattform

Umsetzung einer vollständigen Shop-Funktionalität nach dem Vorbild von scrappbook.de. Fotografen können digitale Downloads und physische Prints über ihre Galerien verkaufen.

## Referenz: Scrappbook.de Shop-Ansichten

````carousel
![Preislisten-Verwaltung – Produkte mit Einkaufspreis, Verkaufspreis und Brutto-Marge](/Users/daniel.gallo/.gemini/antigravity/brain/4b2222a3-c965-4570-9a99-12c4459e7d1a/scrappbook_preislisten_overview_1774603302091.png)
<!-- slide -->
![Gallery-Level Shop-Tab – Shop aktivieren, Preisliste zuweisen, Verkaufsautomatisierung](/Users/daniel.gallo/.gemini/antigravity/brain/4b2222a3-c965-4570-9a99-12c4459e7d1a/scrappbook_gallery_shop_details_1774603715510.png)
<!-- slide -->
![Kundenzahlung – PayPal/Banküberweisung, Abrechnungskonto](/Users/daniel.gallo/.gemini/antigravity/brain/4b2222a3-c965-4570-9a99-12c4459e7d1a/scrappbook_kundenzahlung_settings_1774603408904.png)
<!-- slide -->
![Verkaufsautomatisierung – Globale Einstellungen mit Gutschein-Marketing](/Users/daniel.gallo/.gemini/antigravity/brain/4b2222a3-c965-4570-9a99-12c4459e7d1a/scrappbook_sales_automation_global_settings_1774603458063.png)
<!-- slide -->
![E-Mail Templates – Editor mit Platzhaltern für automatisierte Shop-Emails](/Users/daniel.gallo/.gemini/antigravity/brain/4b2222a3-c965-4570-9a99-12c4459e7d1a/scrappbook_email_automation_editor_1774603547712.png)
````

## User Review Required

> [!IMPORTANT]
> **Zahlungsabwicklung**: Wie bei scrappbook.de wird KEINE direkte Zahlungsabwicklung (Stripe etc.) eingebaut. Stattdessen hinterlegt der Fotograf seine PayPal.me-Link oder Bankdaten. Der Kunde zahlt direkt an den Fotografen. Dies ist rechtlich einfacher und erfordert keine Payment-Provider-Integration.

> [!IMPORTANT]
> **Print-Labore**: In Phase 1 werden keine automatischen Labor-Anbindungen (nphoto, PICA NOVA etc.) implementiert. Physische Produkte werden als manuelle Bestellungen erfasst, die der Fotograf selbst weiterleitet.

---

## Geplante Änderungen

### Phase 1: Datenbank-Schema

#### [NEW] [008_shop.sql](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/supabase/migrations/008_shop.sql)

Neue Tabellen für das Shop-System:

- **`shop_price_lists`** – Preislisten des Fotografen (Name, Währung, user_id)
- **`shop_products`** – Produkte innerhalb einer Preisliste (Typ: `digital`/`print`, Name, Beschreibung, Einkaufspreis, Verkaufspreis, Optionen als JSONB)
- **`shop_coupons`** – Gutscheine (Code, Typ: Prozent/Betrag, Wert, Gültigkeitszeitraum, max. Einlösungen)
- **`shop_orders`** – Bestellungen (gallery_id, Kundeninfos, Produkte als JSONB, Status, Gesamtbetrag)
- **`shop_settings`** – Globale Shop-Einstellungen pro Fotograf (Zahlungsmethode, PayPal-Link, Bankdaten, Automatisierungs-Einstellungen)

RLS: Fotografen verwalten eigene Daten. Gallerie-Besucher können lesen (Produkte, Preislisten) und Bestellungen erstellen.

---

### Phase 2: Globale Shop-Verwaltung (`/shop` Seite)

#### [NEW] [ShopPage.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/ShopPage.jsx)
#### [NEW] [ShopPage.css](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/ShopPage.css)

Ersetzt den aktuellen Platzhalter (`Shop Funktionalität kommt bald...`). Aufbau mit 4 Tabs (wie bei scrappbook.de Sidebar-Untermenü):

**Tab 1: Preislisten**
- Liste aller Preislisten mit Dropdown-Auswahl
- Button „+ Neue Preisliste erstellen"
- Produkt-Tabelle: PRODUKT | LABOR | EINKAUFSPREIS | VERKAUFSPREIS | BRUTTO MARGE
- Zwei Produkttypen:
  - **Digitale Pakete**: Staffeln (Basic/Medium/Premium/Ultimate) mit Dateienanzahl und Preis
  - **Ausdrucke**: Formate (10×15, 20×30, 30×45 etc.) mit EK/VK und Laborauswahl

**Tab 2: Gutscheine**
- Gutschein-Tabelle: Code | Typ (Prozent/Fixbetrag) | Wert | Gültig bis | Einlösungen
- CRUD für Gutscheine

**Tab 3: Shop-Abrechnung**
- Unter-Tabs: Rechnungsadresse | Kundenzahlung | Dokumente
- Kundenzahlung: PayPal.me-Link ODER Bankdaten (IBAN, BIC, Kontoinhaber)

**Tab 4: Verkaufsautomatisierung**
- Globale Einstellungen: Standard-Preisliste, E-Mail-Paket
- Automatisierungs-Toggles:
  - Gutschein Code vermarkten (mit Start/End-Datum, Häufigkeit)
  - Abgebrochener Warenkorb Erinnerung
  - Leerer Warenkorb Produktempfehlung
  - Kostenloser Versand ab X CHF
  - Gutschein Code nach Kauf
- E-Mail-Einstellungen: Templates für jede Automatisierung mit Platzhaltern

#### [MODIFY] [App.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/App.jsx)
- Route `/shop` mit neuem `ShopPage` statt Platzhalter-Text

---

### Phase 3: Gallery-Level Shop-Tab

#### [MODIFY] [ShopTab.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/gallery-detail/ShopTab.jsx)

Komplett überarbeiten – vom statischen Layout zu funktionaler Komponente mit Supabase-Anbindung:

**Linke Spalte (Shop-Einstellungen)**:
- Shop aktiv Toggle (speichert in `gallery.shop_settings`)
- Preisliste-Dropdown (aus `shop_price_lists`)
- „Bereits bezahltes Paket" Dropdown
- Link „Shop Preislisten verwalten" → `/shop`
- „Produkte in Galerie" Positionierung

**Rechte Spalte (Verkaufsautomatisierung pro Galerie)**:
- E-Mail-Paket Auswahl
- Gutschein Code vermarkten (Override der globalen Einstellungen)
- Gutscheincode zum Jubiläum
- Abgebrochener Warenkorb Erinnerung
- Leerer Warenkorb Produktempfehlung
- Kostenloser Versand ab X CHF
- Gutschein Code nach Kauf
- Fotobuch verwalten

#### [MODIFY] [GalleryDetailPage.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/gallery-detail/GalleryDetailPage.jsx)
- Shop-Tab in die Tab-Liste aufnehmen: `{ id: 'shop', label: 'Shop' }`
- Import und Rendering von `ShopTab` im `renderTab()` Switch
- Gallery-Objekt als Props an ShopTab weitergeben

#### [MODIFY] [GalleryDetail.css](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/gallery-detail/GalleryDetail.css)
- Bestehende `.shop-tab` Styles anpassen für neue Funktionalität

---

### Phase 4: Kundenansicht (Warenkorb)

#### [MODIFY] [CustomerView.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/gallery-detail/CustomerView.jsx)
- Warenkorb-Icon in der Sidebar/Navigation
- Produkt-Overlay nach dem letzten Album (oder an konfigurierter Position)
- „In den Warenkorb" Button bei Fotos
- Warenkorb-Drawer mit Artikelliste, Mengenauswahl, Gutschein-Eingabe
- Checkout-Seite: Kundendaten-Formular, Bestellzusammenfassung, Zahlungshinweis

#### [MODIFY] [CustomerView.css](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/gallery-detail/CustomerView.css)
- Styles für Warenkorb, Produkt-Karten, Checkout-Flow

---

### Phase 5: Bestellverwaltung

#### [MODIFY] [DashboardPage.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/DashboardPage.jsx)
- Bestellübersicht-Widget auf dem Dashboard (letzte Bestellungen, Umsatz)

#### [NEW] [ShopOrdersTab.jsx](file:///Users/daniel.gallo/Documents/Antigravity/dashboard-app/src/pages/ShopOrdersTab.jsx)
- Bestellliste mit Statusverwaltung (Neu/Bezahlt/Versendet/Abgeschlossen)
- Bestelldetails-Modal

---

## Verifizierungsplan

### Manuelle Verifikation

**Phase 2 – Globale Shop-Verwaltung**:
1. Admin-Dashboard öffnen → Shop-Icon in der Sidebar klicken
2. Neue Preisliste erstellen → Produkte hinzufügen (digital + print)
3. Gutschein erstellen und Gültigkeit prüfen
4. Zahlungsmethode konfigurieren (PayPal.me Link)

**Phase 3 – Gallery Shop-Tab**:
1. Galerie öffnen → Shop-Tab soll sichtbar sein
2. Shop aktivieren → Preisliste zuweisen
3. Einstellungen ändern → prüfen ob in Supabase gespeichert

**Phase 4 – Kundenansicht**:
1. Kundenansicht der Galerie öffnen
2. Produkte sollen nach dem letzten Album erscheinen
3. Foto auswählen → „In den Warenkorb" → Warenkorb prüfen
4. Checkout durchspielen → Bestellung prüfen

> [!TIP]
> **Vorgeschlagene Reihenfolge**: Phase 1 + 2 + 3 zuerst (Admin-Seite), dann Phase 4 (Kundenansicht), und Phase 5 (Bestellverwaltung) zuletzt. So kann jede Phase isoliert getestet werden.
