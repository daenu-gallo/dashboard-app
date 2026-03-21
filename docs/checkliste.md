# Fotohahn Gallery Platform
### Projekt-Checkliste seit 16. März 2026

> Letzte Aktualisierung: 21. März 2026, 21:27 Uhr

---

## 🏗️ Infrastruktur & Deployment

| # | Status | Aufgabe | Ergebnis | Datum |
|:-:|:------:|---------|----------|:-----:|
| 1 | 🟢 | Coolify auf Debian VM | Supabase, Dashboard, Upload-API deployed | 15.03. |
| 2 | 🟢 | Supabase Kong repariert | Container-Konfiguration gefixt | 16.03. |
| 3 | 🟢 | Cloudflare Tunnel & DNS | `admin` · `api` · `galerie` · `db` aktiv mit SSL | 17.03. |
| 4 | 🟢 | Bad Gateway behoben | Port-Konfiguration in Coolify korrigiert | 18.03. |
| 5 | 🟢 | SSL/HTTPS aktiviert | HSTS, CSP, Cloudflare Tunnel | 20.03. |
| 6 | 🟢 | Login „Failed to fetch" gelöst | `.env.production` mit HTTPS-URLs | 20.03. |
| 7 | 🟢 | Coolify Env-Vars bereinigt | „Preview" → „Production", „Is Literal" ✅ | 20.03. |
| 8 | 🟢 | `supabase.fotohahn.ch` DNS | Löst korrekt auf, beide Domains funktionieren | 20.03. |
| 9 | 🟢 | Cloudflare Cache Auto-Purge | Automatisch bei jedem Redeploy + Admin-Endpoint | 20.03. |
| 10 | 🟢 | Supabase Studio Zugang | Credentials gefunden | 20.03. |
| 11 | 🟢 | Kong-Config persistent | Volume gemountet, übersteht Redeploy | 20.03. |
| 12 | 🟢 | Deploy-Buttons (Admin) | `COOLIFY_BASE_URL=http://coolify:8000` + IPv4 fix | 20.03. |
| 13 | 🟢 | Supabase RLS Policies | Public SELECT + Auth CRUD für alle Tabellen | 20.03. |

---

## 📸 Bild-Upload & Galerie

| # | Status | Aufgabe | Ergebnis | Datum |
|:-:|:------:|---------|----------|:-----:|
| 14 | 🟢 | Upload-API Auth gefixt | Service Role Key synchronisiert | 18.03. |
| 15 | 🟢 | Upload-API Redirect Loop | Code-Deployment korrigiert | 20.03. |
| 16 | 🟢 | Bild-Upload funktioniert! | SUPABASE_URL auf LAN-IP umgestellt | 20.03. |
| 17 | 🟢 | Thumbnails laden | CORP-Header `same-site` in helmet | 20.03. |
| 18 | 🟢 | Thumbnail-Qualität | 1200px breit, JPEG 90% | 20.03. |
| 19 | 🟢 | Design-Tab Vorschau | `frame-ancestors 'self'`, iframe erlaubt | 20.03. |
| 20 | 🟢 | Kundenansicht Bilder | Routing gefixt, `galerie.fotohahn.ch/:slug` funktioniert | 20.03. |
| 21 | 🟢 | Bilder löschen | Bild + Thumbnail werden auf NAS gelöscht | 20.03. |
| 22 | 🟢 | NAS-Bilder absichern | Signierte URLs / Auth-Proxy eingerichtet | 20.03. |
| 23 | 🟢 | Lightbox Bildansicht | Vergrösserung beim Klick funktioniert | 20.03. |
| 24 | 🟢 | React Error #300 behoben | Password-Gate Return vor Hooks → verschoben | 20.03. |
| 25 | 🟢 | Passwort-Gate funktioniert | Lock-Icon + Eingabe auf `galerie.fotohahn.ch` | 20.03. |
| 26 | 🟢 | Kundenansicht URL gefixt | Öffnet `galerie.fotohahn.ch/{slug}` statt Admin | 20.03. |
| 27 | 🟢 | Hero Slider sanfter | 5s Intervall, 1.8s Fade-Transition | 20.03. |
| 28 | 🟢 | Drag & Drop Bilder Upload | Bilder aus Finder auf Album ziehen → Upload | 20.03. |

---

## 🔒 Security

| # | Status | Aufgabe | Ergebnis | Datum |
|:-:|:------:|---------|----------|:-----:|
| 29 | 🟢 | Helmet + CORS + Rate Limiting | Upload-API abgesichert | 19.03. |
| 30 | 🟢 | Nginx Security Headers | CSP, XSS, Referrer-Policy | 19.03. |
| 31 | 🟢 | Secrets aus Dockerfile entfernt | Coolify Production Env-Vars | 20.03. |
| 32 | 🟢 | Sicherheitstopologie | Bewertung ~55% | 19.03. |
| 33 | 🟢 | Sicherheit ≥80% | Magic Bytes, MIME Whitelist, 25MB Limit, Audit Log | 20.03. |

---

## 🎨 Design & UX

| # | Status | Aufgabe | Ergebnis | Datum |
|:-:|:------:|---------|----------|:-----:|
| 34 | 🟢 | Customer View Styling | An Fotohahn.ch Referenz angepasst | 13.–14.03. |
| 35 | 🟢 | Custom Domain Code | Code für Kunden-Domains vorhanden | 19.03. |
| 36 | 🟢 | Dashboard Markenname | Begrüssung mit Markenname statt E-Mail | 20.03. |
| 37 | 🟢 | Speichern ohne Modal-Schliessen | Button zeigt „✓ Gespeichert" statt zu schliessen | 20.03. |
| 38 | 🟢 | Firmenlogo in Markenkarte | `useBrand()` statt leeres `useState({})` | 20.03. |
| 39 | 🟢 | Revisionsmeldungen funktionieren | `app_config` UNIQUE constraint + RLS Policies | 20.03. |
| 40 | 🟢 | Brand-Daten in Kundengalerie | `ownerBrandSettings` für anonyme Besucher | 20.03. |
| 41 | 🟢 | Wasserzeichen aus Supabase | `useWatermarks` Hook lädt tileSpacing/tileSize, RLS für anon aktiv | 21.03. |
| 42 | 🟢 | Drag & Drop Alben-Reihenfolge | Grip-Handle statt Pfeil-Buttons, in Galerie + Voreinstellungen | 20.03. |
| 43 | 🟢 | Galerie-Name editierbar | Inline-Input im Modal-Header via Stift-Icon | 20.03. |
| 44 | 🟢 | Statische Landingpage | SaaS-Marketing auf fotogalerien.fotohahn.ch, Vergleichstabelle | 21.03. |

---

## 📈 Marketing & SEO

| # | Status | Aufgabe | Ergebnis | Datum |
|:-:|:------:|---------|----------|:-----:|
| 45 | 🟢 | SEO Blog-Posts | 36 Posts auf fotohahn.ch optimiert | 17.03. |
| 46 | 🟢 | Google Ads Optimierung | CPA 17.50 CHF, Keywords, Extensions | 17.03. |
| 47 | 🟢 | Performance Max Kampagne | Vorbereitet, Start nach Go-Live | 17.03. |

---

## 🐛 Offene Bugs

| # | Prio | Bug | Beschreibung | Status |
|:-:|:----:|-----|--------------|:------:|
| 48 | Niedrig | Mitteilungen-Dropdown hardcoded | Dynamisch aus Einstellungen → Vorlagenliste, Auto-Migration | 🟢 |
| 49 | Hoch | Wasserzeichen auf Kundengalerie | Fix: tileSpacing/tileSize in DB sync + RLS anon Policy | 🟢 |

---

## 🚀 Feature-Wünsche & Roadmap

| # | Prio | Feature | Beschreibung | Status |
|:-:|:----:|---------|--------------|:------:|
| 50 | Hoch | Eigene Domains | `app.firma.ch/de/com` — Tab vorhanden, noch einpflegen | 🟡 |
| 50 | Hoch | Multi-Tenant | Mehrere Fotografen, eigenes Branding & Subdomain | 🟡 |
| 51 | Hoch | E-Mail-Versand | Galerien per Mail an Kunden verschicken | 🟡 |
| 52 | Hoch | Backup-Strategie | Auto-Backups Supabase DB + NAS-Fotos | 🟡 |
| 53 | Hoch | Upload Fortschrittsbalken | Mehrfach-Upload mit Anzeige „3 von 5" | 🟡 |
| 54 | Mittel | Monitoring & Alerts | Uptime-Checks, Crash-Benachrichtigungen | 🟡 |
| 55 | Mittel | Design-Darstellung übernehmen | Design aus Galerieeinstellungen korrekt anwenden | 🟡 |
| 56 | Mittel | Text zu Bildern | Beschreibungstext bei Galerie-Bildern | 🟡 |
| 57 | Mittel | Bilderschutz | Kein Rechtsklick / Download verhindern | 🟡 |
| 58 | Niedrig | Video-Support | Videos in Galerien einbinden | 🟡 |

---

## 📖 Referenz

### Coolify-Regeln

| Regel | Details |
|-------|---------|
| Env-Vars | Immer unter **„Production"** eintragen, nicht „Preview" |
| Is Literal | **Immer ✅ aktivieren** — keine `${...}` Referenzen |
| Build-Args | Coolify leitet keine Docker Build-Args weiter → `.env.production` |
| Cache | Gleicher Commit SHA = Build übersprungen → neuer Commit nötig |

### Wichtige Adressen

| Dienst | URL |
|--------|-----|
| Dashboard | `https://admin.fotohahn.ch` |
| Upload-API | `https://api.fotohahn.ch` |
| Galerie | `https://galerie.fotohahn.ch` |
| Supabase (Frontend) | `https://db.fotohahn.ch` |
| Supabase (upload-api) | `http://192.168.249.79:3100` |
| Supabase Studio | `https://supabase.fotohahn.ch` |

### Technische Werte

| Schlüssel | Wert |
|-----------|------|
| JWT Secret | `Yr1KkOFlwtEMlvVMYIeqIfAsfVwKfTy1` |
| NAS Mount | `/mnt/nas/onlinegalerie` |
| NAS Struktur | `{user-uuid}/{gallery-slug}/{album-index}/original\|thumb/` |
| Thumbnails | 1200px breit, JPEG Qualität 90% |
| Coolify intern | `http://coolify:8000` (Docker-Netzwerk) |

---

### Fortschritt

```
🟢 Erledigt:  50 / 59  (85%)
🟡 In Arbeit:  9 / 59  (15%)
🔴 Offen:      0 / 59   (0%)
█████████████████████████████████░░░░░░  85%
```

> 🟢 Erledigt · 🟡 In Arbeit · 🔴 Offen
