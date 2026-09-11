# 📖 Bedienungshandbuch: Fotohahn Dashboard-App

> Stand: 19. März 2026 (v2 – mit Cloudflare Tunnel & SSL)

---

## Was ist das hier überhaupt?

Die **Fotohahn Dashboard-App** ist eine Web-App, mit der Fotografen ihre Galerien verwalten, Bilder hochladen und Kunden Zugang zu ihren Fotos geben können.

Die App läuft auf einem kleinen **virtuellen Computer** (Debian VM), der auf deiner **Synology NAS** (dem grossen Speichergerät namens "Canon_Drucker") installiert ist. Du greifst auf alles über deinen Browser zu — von überall, solange du mit **Tailscale** (dem VPN) verbunden bist.

---

## 1. Wie alles zusammenhängt

```
┌─────────────────── Internet ───────────────────┐
│                                                 │
│  Kunden/Browser                                 │
│       │                                         │
│       ▼                                         │
│  ┌─────────────────────────────────────────┐    │
│  │        Cloudflare (SSL + CDN)           │    │
│  │                                         │    │
│  │  galerie.fotohahn.ch  → Kundenansicht   │    │
│  │  admin.fotohahn.ch    → Admin Dashboard │    │
│  │  api.fotohahn.ch      → Upload-API      │    │
│  └──────────────┬──────────────────────────┘    │
│                 │ Cloudflare Tunnel (verschl.)  │
└─────────────────┼───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│          Synology NAS (Canon_Drucker)            │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │     Debian VM (virtueller Computer)      │     │
│  │                                          │     │
│  │  Traefik (:80)   ← Cloudflare Tunnel     │     │
│  │     ├─ Dashboard-App (Nginx)              │     │
│  │     ├─ Upload-API (Node.js :3200)         │     │
│  │     └─ Supabase (Kong :3100, Studio :3101)│     │
│  │                                          │     │
│  │  Coolify (:8000) ← Nur via Tailscale     │     │
│  └─────────────────────────────────────────┘     │
│                       │                          │
│  ┌────────────────────▼────────────────────┐     │
│  │  Festplatte: App_Onlinegalerie (18 TB)   │     │
│  │  Hier werden alle Galerie-Fotos gespeich.│     │
│  └─────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
```

**Einfach erklärt:**
- **Cloudflare Tunnel** = Verschlüsselte Verbindung vom Internet zum Server (SSL inklusive)
- **Traefik** = Der Proxy, der Anfragen an die richtige App weiterleitet
- **Coolify** = Der "App-Manager". Hier startest und aktualisierst du die Apps
- **Supabase** = Die Datenbank. Hier sind alle Galerie-Infos, Benutzer, Einstellungen gespeichert
- **Upload-API** = Der Dienst, der Bilder auf die Festplatte speichert und wieder abruft
- **App_Onlinegalerie** = Der Ordner auf der NAS, wo alle Fotos liegen (18 TB Platz)

---

## 2. Welches Programm für welchen Befehl?

| Befehl-Typ | Wo eingeben | Wie öffnen |
|------------|-------------|------------|
| **Bash-Befehle** (`ssh`, `git`, `cd` ...) | **Terminal** auf deinem Mac | Cmd + Leertaste → "Terminal" tippen → Enter |
| **SQL-Befehle** (`UPDATE`, `SELECT` ...) | **Supabase Studio → SQL Editor** | Im Browser öffnen (siehe unten) → links "SQL Editor" klicken |

> [!TIP]
> **Terminal** = das schwarze Fenster auf dem Mac, in das du Befehle tippst.
> **SQL Editor** = eine Webseite in Supabase Studio, wo du Datenbank-Befehle eingibst und auf "Laufen" klickst.

---

## 3. Wichtige Adressen (im Browser öffnen)

### 🌐 Öffentliche Domains (über Cloudflare Tunnel, SSL inklusive)

| Domain | Zweck | Wer nutzt es |
|--------|-------|-------------|
| `https://galerie.fotohahn.ch` | **Kundenansicht** — Kunden sehen ihre Foto-Galerien | Deine Kunden |
| `https://admin.fotohahn.ch` | **Admin-Dashboard** — Galerien verwalten, Bilder hochladen | Du (produktiv) |
| `https://api.fotohahn.ch` | **Upload-API** — Wird automatisch vom Dashboard aufgerufen | Automatisch |

### 🔧 Wartungs-Adressen (nur über Tailscale VPN)

> [!IMPORTANT]
> Diese Seiten funktionieren **nur**, wenn du mit **Tailscale VPN** verbunden bist!

| Was | Adresse | Wofür |
|-----|---------|-------|
| 🌐 **Dashboard-App** | `http://debian.orca-mirfak.ts.net` | Admin-Bereich (Wartung) |
| 🔧 **Coolify** | `http://debian.orca-mirfak.ts.net:8000` | Apps verwalten, deployen, neustarten |
| 📊 **Supabase Studio** | `http://debian.orca-mirfak.ts.net:3101` | Datenbank ansehen, Benutzer verwalten, SQL ausführen |
| 🖼️ **Upload-API Health** | `https://api.fotohahn.ch/api/health` | Prüfen ob der Bilder-Dienst läuft |
| ⚠️ **Supabase API** | `http://debian.orca-mirfak.ts.net:3100` | Zeigt "Kong Error" — **das ist normal!** |

> [!NOTE]
> Wenn du `:3100` im Browser öffnest und ein "Kong Error" siehst, ist das **kein Fehler**. Das ist der API-Gateway — er antwortet nur auf Anfragen von der App, nicht auf Browser-Besuche.

---

## 4. Zugangsdaten

### Coolify (App-Verwaltung)
- **Adresse**: `http://debian.orca-mirfak.ts.net:8000`
- **Login**: Die Zugangsdaten, die du beim ersten Einrichten erstellt hast

### Supabase Studio (Datenbank)
- **Adresse**: `http://debian.orca-mirfak.ts.net:3101`
- **Login**: Kein Login nötig — einfach öffnen

### SSH (Terminal-Zugang zum Server)
Falls du per Terminal auf den Server musst:
1. Öffne das **Mac Terminal**: **Cmd + Leertaste** → "Terminal" tippen → Enter
2. Tippe ein:
```
ssh daniel@debian.orca-mirfak.ts.net
```
- **Benutzername**: `daniel`
- Für Docker-Befehle immer `sudo` davor schreiben

### Dashboard-App Benutzer verwalten

> [!IMPORTANT]
> **Die Selbst-Registrierung ist deaktiviert.** Neue Benutzer können sich NICHT selbst registrieren. Du musst sie manuell erstellen.

#### Neuen Benutzer (Kunden) erstellen
1. Öffne **Supabase Studio**: `http://debian.orca-mirfak.ts.net:3101`
2. Klicke links auf **Authentication** (Schloss-Symbol)
3. Klicke auf **Users**
4. Klicke oben rechts auf **Add User** → **Create New User**
5. Fülle aus:
   - **E-Mail**: Die E-Mail-Adresse des Kunden
   - **Passwort**: Ein sicheres Passwort
6. Klicke auf **Create User**
7. Teile dem Kunden seine Zugangsdaten mit (E-Mail + Passwort)

#### Alle Benutzer anzeigen
1. **Supabase Studio** → **Authentication** → **Users**
2. Dort siehst du eine Liste aller Benutzer mit E-Mail, letztes Login, etc.

#### Benutzer löschen
1. **Supabase Studio** → **Authentication** → **Users**
2. Klicke auf den Benutzer, den du löschen willst
3. Scrolle nach unten → **Delete User**

> [!NOTE]
> Wenn du einen Benutzer löschst, bleiben seine Galerien und Bilder bestehen. Sie sind dann aber niemandem mehr zugeordnet.

#### Passwort zurücksetzen
Falls ein Kunde sein Passwort vergessen hat:
1. **Supabase Studio** → **Authentication** → **Users**
2. Klicke auf den Benutzer
3. Du kannst dort das Passwort manuell ändern

---

**Registrierung deaktivieren (einmalig in Coolify):**
1. Öffne **Coolify**: `http://debian.orca-mirfak.ts.net:8000`
2. Gehe zum **Supabase**-Service → klicke auf **Supabase Auth** Container
3. Scrolle zu **Environment Variables**
4. Füge hinzu: `GOTRUE_DISABLE_SIGNUP` = `true`
5. Klicke **Save** und dann den Container **neustarten**

### Geheime Schlüssel (API-Keys)

| Schlüssel | Wo gespeichert | Was macht er |
|-----------|----------------|--------------|
| `ANON_KEY` | `.env`-Datei im Code | Erlaubt der App, mit der Datenbank zu reden |
| `SERVICE_ROLE_KEY` | Coolify → Upload-API → Env Vars | Admin-Zugriff für die Upload-API |
| `JWT_SECRET` | Coolify → Upload-API → Env Vars | Prüft ob ein Benutzer eingeloggt ist |

> [!CAUTION]
> Den **SERVICE_ROLE_KEY** niemals öffentlich teilen! Er hat vollen Zugriff auf alle Daten.

---

## 5. NAS-Speicher (Fotos)

### Wo liegen die Fotos?
Die Fotos werden auf der Synology NAS gespeichert, im Ordner **App_Onlinegalerie** (Volume 5, 18 TB).

### Wie ist der Ordner aufgebaut?
```
App_Onlinegalerie/
  └── (Benutzer-ID)/
      └── (Galerie-Name)/
          └── (Album-Nummer)/
              ├── original/    ← Die Originalfotos (volle Qualität)
              └── thumb/       ← Kleine Vorschaubilder (automatisch erstellt)
```

### Netzwerk-Adressen

| Gerät | Lokale Adresse | Tailscale |
|-------|----------------|-----------|
| **Synology NAS** | `192.168.249.24` | — |
| **Debian VM** | `192.168.249.79` | `100.120.144.111` |

### Technische Details (NFS-Mount)
Der NAS-Ordner ist so auf den Server eingebunden (passiert automatisch beim Start):
```
192.168.249.24:/volume5/App_Onlinegalerie → /mnt/nas/onlinegalerie
```

### Coolify Persistent Storage
Der Upload-API Container hat Zugriff auf den NAS-Ordner:
- **Host-Pfad**: `/mnt/nas/onlinegalerie`
- **Container-Pfad**: `/mnt/nas/onlinegalerie`

---

## 6. Datenbank-Tabellen

In **Supabase Studio** → **Table Editor** findest du diese Tabellen:

| Tabelle | Was steht drin |
|---------|---------------|
| `profiles` | Benutzerprofile (Name, E-Mail) |
| `galleries` | Alle Galerien (Titel, Design, Einstellungen) |
| `albums` | Alben innerhalb einer Galerie |
| `images` | Infos zu den Fotos (Dateiname, Pfad auf der NAS) |
| `brands` | Marken-Einstellungen (Logo, Name) |
| `gallery_customers` | Hauptkunden pro Galerie |
| `gallery_views` | Wie oft eine Galerie angeschaut wurde |
| `portfolios` | Portfolio-Einträge |
| `user_settings` | Persönliche Einstellungen |
| `app_config` | App-Version und Ankündigungen |

---

## 7. App aktualisieren (Deployment)

Wenn du Änderungen am Code gemacht hast und diese live schalten willst:

### Schritt für Schritt:

1. **Mac Terminal öffnen** (Cmd + Leertaste → "Terminal" → Enter)

2. **Code speichern und hochladen**:
   ```bash
   cd ~/Documents/Antigravity/dashboard-app
   git add -A && git commit -m "Was ich geändert habe" && git push
   ```

3. **Coolify im Browser öffnen**: `http://debian.orca-mirfak.ts.net:8000`

4. Navigiere zu **Projekte → Fotohahn → Produktion**

5. **Dashboard-App anklicken** (nicht die Upload-API!)

6. Klicke oben auf **"Wiederverlegen"** (grüner Button)

7. **Warten** bis in den Logs steht: "Bereitstellung ist **Fertig**"

> Die **Upload-API** wird genauso aktualisiert — einfach statt der Dashboard-App die Upload-API auswählen.

---

## 8. Ankündigungen an alle Benutzer senden

Du kannst ein **Banner** (farbiger Balken oben in der App) an alle eingeloggten Benutzer schicken.

### Ankündigung senden

1. Öffne **Supabase Studio** im Browser: `http://debian.orca-mirfak.ts.net:3101`
2. Klicke links auf **SQL Editor** (das Symbol mit `>_`)
3. Lösche alles im Editor-Feld
4. Füge folgenden Code ein:

```sql
UPDATE app_config
SET value = jsonb_set(
  jsonb_set(value::jsonb, '{announcement}', '"Deine Nachricht hier eingeben"'),
  '{announcement_at}', to_jsonb(now())
),
updated_at = now()
WHERE key = 'app_settings';
```

5. Klicke auf **"Laufen"** (grüner Button rechts)

→ Innerhalb von 60 Sekunden erscheint das Banner bei allen Benutzern.

### Was passiert wenn ein Benutzer das Banner schliesst?

- Der Benutzer klickt auf das **X** → Banner verschwindet
- Das Banner kommt **nicht** mehr zurück (auch nicht nach Seite neu laden)
- Erst wenn du eine **neue** Ankündigung sendest, erscheint es wieder

### Ankündigung wieder entfernen

Gleicher Weg: **Supabase Studio → SQL Editor** → diesen Code einfügen → **"Laufen"**:

```sql
UPDATE app_config
SET value = value::jsonb - 'announcement' - 'announcement_at',
    updated_at = now()
WHERE key = 'app_settings';
```

---

## 9. App-Version hochzählen (Auto-Reload)

Nach einem Deployment kannst du erzwingen, dass alle Benutzer die neue Version laden:

1. Öffne **Supabase Studio** im Browser → klicke links auf **SQL Editor**
2. Füge ein und klicke **"Laufen"**:

```sql
UPDATE app_config
SET value = jsonb_set(value::jsonb, '{current_version}', '"1.0.1"'),
    updated_at = now()
WHERE key = 'app_settings';
```

→ Alle offenen Browser-Tabs laden automatisch innerhalb von 60 Sekunden die neue Version.

> [!TIP]
> Zähle die Version bei jedem Deploy hoch (z.B. 1.0.1 → 1.0.2 → 1.0.3).

---

## 10. Problemlösung

| Problem | Was tun |
|---------|---------|
| **"Kong Error" im Browser** | Das ist normal auf Port 3100! Nutze stattdessen Port **3101** für Supabase Studio |
| **Supabase Studio lädt nicht** | Drücke **Cmd + Shift + R** (Hard Refresh). Dann neu versuchen |
| **Dashboard-App geht nicht** | Coolify öffnen → Prüfe ob der Container **grün** (Running) ist |
| **Bilder laden nicht** | Coolify → Upload-API → Logs prüfen. Läuft die API? Siehe auch Abschnitt 10.1 |
| **Upload gibt 401-Fehler** | Der Service Role Key stimmt nicht. Siehe **Abschnitt 10.1** |
| **"Permission denied" im Terminal** | Schreibe `sudo` vor den Befehl |
| **NAS-Speicher nicht erreichbar** | Im Mac Terminal eingeben: `ssh daniel@debian.orca-mirfak.ts.net` dann `sudo mount -a` |
| **"Invalid authentication credentials"** | Supabase-Auth Problem → Siehe **Abschnitt 10.2** |
| **Domains laden nicht (Timeout)** | Nameserver falsch → Siehe **Abschnitt 10.4** |

### Server-Status prüfen (im Mac Terminal)

```bash
# Mit dem Server verbinden:
ssh daniel@debian.orca-mirfak.ts.net

# Alle laufenden Dienste anzeigen:
sudo docker ps | grep -i supa

# Prüfen ob die Festplatte verbunden ist:
df -h /mnt/nas/onlinegalerie

# Prüfen ob ALLE Container healthy sind:
sudo docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v healthy
```

### 10.1 Upload-API: Bilder werden nicht gespeichert (401-Fehler)

**Wann passiert das?**
Wenn du in der App Bilder hochladen willst, aber nichts passiert oder in den Logs `AuthApiError` / `status: 401` steht.

**Warum passiert das?**
Die Upload-API braucht einen "Schlüssel" (Service Role Key), um mit Supabase zu reden. Dieser Schlüssel ist ein spezieller Code, der mit einem Geheimnis (JWT Secret) unterschrieben ist. Wenn der Schlüssel nicht zum Geheimnis passt, wird er abgelehnt.

Es gibt **zwei Stellen**, die den Schlüssel kennen müssen:
- **Kong** (das Tor zu Supabase) → prüft: "Kenne ich diesen Schlüssel?"
- **GoTrue** (der Auth-Dienst) → prüft: "Ist die Unterschrift gültig?"

**Schritt 1: Prüfen ob das Problem wirklich am Key liegt**

Verbinde dich per SSH und teste:

```bash
ssh daniel@debian.orca-mirfak.ts.net

sudo docker exec -it $(sudo docker ps -q --filter "name=bhdfcb") node -e "
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = process.env.SUPABASE_URL;
fetch(url + '/auth/v1/admin/users?per_page=1', {
  headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
}).then(r => console.log('Status:', r.status)).catch(e => console.log('FAIL:', e.message));
"
```

- **Status 200** = Alles OK, Key stimmt! Problem ist woanders.
- **Status 401** = Key stimmt nicht → weiter mit Schritt 2.

**Schritt 2: Richtigen Key generieren**

Der Key muss mit dem JWT Secret signiert sein. Das Secret findest du so:

```bash
sudo docker exec -it $(sudo docker ps -q --filter "name=kong") printenv | grep -i JWT_SECRET
```

Dann den Key generieren (ersetze `DEIN_JWT_SECRET` mit dem echten Wert):

```bash
sudo docker exec -it $(sudo docker ps -q --filter "name=bhdfcb") node -e "
const crypto = require('crypto');
const h = Buffer.from(JSON.stringify({typ:'JWT',alg:'HS256'})).toString('base64url');
const p = Buffer.from(JSON.stringify({iss:'supabase',iat:1773697980,exp:4929371580,role:'service_role'})).toString('base64url');
const s = crypto.createHmac('sha256','DEIN_JWT_SECRET').update(h+'.'+p).digest('base64url');
console.log(h+'.'+p+'.'+s);
"
```

→ Kopiere den ausgegebenen Key (langer `eyJ...` String).

**Schritt 3: Key in Kong aktualisieren**

Erstelle einen Befehl, der den alten Key durch den neuen ersetzt. Dafür brauchst du die letzten ~40 Zeichen des alten UND des neuen Keys:

```bash
# Alten Key anzeigen:
sudo docker exec -it $(sudo docker ps -q --filter "name=kong") grep service_role -A2 /home/kong/kong.yml

# Key in Kong ersetzen (ersetze ALTER_KEY_ENDE und NEUER_KEY_ENDE):
sudo docker exec -it $(sudo docker ps -q --filter "name=kong") sh -c "
sed -i 's|ALTER_KEY_ENDE|NEUER_KEY_ENDE|' /home/kong/kong.yml
"

# Kong neu laden:
sudo docker exec -it $(sudo docker ps -q --filter "name=kong") kong reload
```

**Schritt 4: Key in Upload-API Dockerfile aktualisieren**

Auf dem **Mac** im Projekt-Ordner:

1. Öffne `upload-api/Dockerfile`
2. Ersetze den alten `SUPABASE_SERVICE_ROLE_KEY=eyJ...` mit dem neuen Key
3. Speichern, committen und pushen:

```bash
cd ~/Documents/Antigravity/dashboard-app
git add upload-api/Dockerfile
git commit -m "fix: update service role key"
git push
```

4. In Coolify → upload-api → **Redeploy**

**Schritt 5: Nochmal testen**

Führe den Test aus Schritt 1 nochmal aus. Jetzt muss **Status 200** kommen.

> [!WARNING]
> Wenn der **Supabase-Service** in Coolify redeployed wird, wird Kong's Konfiguration zurückgesetzt. Dann musst du **Schritt 3** (Kong Key ersetzen) erneut ausführen.

### 10.2 Supabase: "Invalid authentication credentials" (500-Fehler)

**Wann passiert das?**
Nach einem Neustart der Datenbank (z.B. nach einem Stromausfall oder Server-Neustart). Die Auth-Tabelle hat dann `NULL`-Werte in Spalten, die Text erwarten.

**Wie erkennst du es?**
Die Service-Überwachung meldet: `Supabase: Invalid authentication credentials`. Die App zeigt Fehler beim Einloggen.

**So prüfst du es (SSH):**
```bash
ssh daniel@debian.orca-mirfak.ts.net
sudo docker logs --tail 10 supabase-auth-h59apn7qxp0c7oon8i06o7fj
```
→ Wenn du `Scan error on column ... converting NULL to string is unsupported` siehst, ist das der Fehler.

**So behebst du es:**
```bash
sudo docker exec -it supabase-db-h59apn7qxp0c7oon8i06o7fj psql -U supabase_admin -d postgres -c "
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '');
"
```

**Danach testen:**
```bash
sudo docker exec -it $(sudo docker ps -q --filter "name=bhdfcb") node -e "
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const url = process.env.SUPABASE_URL;
fetch(url + '/auth/v1/admin/users?per_page=1', {
  headers: { 'apikey': key, 'Authorization': 'Bearer ' + key }
}).then(r => console.log('Status:', r.status)).catch(e => console.log('FAIL:', e.message));
"
```
→ Muss **Status 200** zeigen.

### 10.3 PostgREST nicht "healthy"

**Wann passiert das?**
Wenn die Datenbank kurzzeitig nicht erreichbar war (z.B. bei einem Neustart). PostgREST verliert dann die Verbindung und erholt sich manchmal nicht automatisch.

**So prüfst du es:**
```bash
sudo docker ps --format "table {{.Names}}\t{{.Status}}" | grep rest
```
→ Wenn dort KEIN `(healthy)` steht, hat PostgREST ein Problem.

**So behebst du es:**
```bash
sudo docker restart supabase-rest-h59apn7qxp0c7oon8i06o7fj
```
Warte 30 Sekunden, dann nochmal prüfen. Es sollte jetzt `(healthy)` stehen.

### 10.4 Domains laden nicht (admin.fotohahn.ch, galerie.fotohahn.ch)

**Wann passiert das?**
Wenn die Nameserver bei Hostinger versehentlich geändert wurden (z.B. bei einer Domain-Verlängerung).

**So prüfst du es (Mac Terminal):**
```bash
dig fotohahn.ch NS +short
```
→ Es MUSS zeigen:
```
aspen.ns.cloudflare.com.
trace.ns.cloudflare.com.
```
→ Wenn dort etwas anderes steht (z.B. `dns-parking.com`), sind die Nameserver falsch!

**So behebst du es:**
1. Logge dich bei **Hostinger** ein → **Domains → fotohahn.ch → Nameserver**
2. Ändere die Nameserver auf:
   - `aspen.ns.cloudflare.com`
   - `trace.ns.cloudflare.com`
3. Speichern → warte 15-30 Minuten

**Schnelltest ob es wieder geht (Mac Terminal):**
```bash
curl -s -o /dev/null -w "%{http_code}" https://admin.fotohahn.ch
```
→ Muss **200** zeigen.

### 10.5 Fehler vorbeugen — Checkliste

> [!TIP]
> Diese Dinge kannst du regelmässig prüfen, um Ausfälle zu vermeiden.

**Monatlich (5 Minuten):**

| Prüfung | Befehl (Mac Terminal) | Erwartung |
|---------|-----------------------|-----------|
| Nameserver korrekt? | `dig fotohahn.ch NS +short` | `aspen.ns.cloudflare.com` + `trace.ns.cloudflare.com` |
| App erreichbar? | `curl -s -o /dev/null -w "%{http_code}" https://admin.fotohahn.ch` | `200` |
| API erreichbar? | `curl -s -o /dev/null -w "%{http_code}" https://api.fotohahn.ch/api/health` | `200` |

**Nach jedem Server-Neustart (SSH):**

| Prüfung | Befehl | Erwartung |
|---------|--------|-----------|
| Alle Container healthy? | `sudo docker ps --format "table {{.Names}}\t{{.Status}}" \| grep -v healthy` | Nur die Kopfzeile, sonst leer |
| NAS verbunden? | `df -h /mnt/nas/onlinegalerie` | Zeigt 18 TB Festplatte |
| Auth funktioniert? | Siehe Test-Befehl in Abschnitt 10.2 | `Status: 200` |

**Nie anfassen (ausser du weisst genau was du tust):**
- ❌ Nameserver bei Hostinger ändern
- ❌ Supabase-Service in Coolify redeployen (setzt Kong zurück!)
- ❌ JWT Secret ändern (alle Keys werden ungültig!)

---

## 11. Sicherheit

### SSL / Verschlüsselung
- **Alle öffentlichen Domains** (`galerie.`, `admin.`, `api.fotohahn.ch`) laufen über **Cloudflare Tunnel mit SSL**
- Cloudflare terminiert SSL am Edge → verschlüsselter Tunnel zum Server
- Kein unverschlüsselter Zugriff möglich (HTTPS erzwungen)
- **HSTS aktiv** (Strict-Transport-Security, 1 Jahr) — Browser erzwingen automatisch HTTPS
- **CSP mit `upgrade-insecure-requests`** — Mixed-Content wird automatisch auf HTTPS umgeschrieben
- **HTTP→HTTPS Redirect** auf Nginx- und Upload-API-Ebene (Defense-in-Depth)

### Zugriffsschutz
- **Wartungs-Tools** (Coolify, Supabase Studio) sind **nur über Tailscale VPN** erreichbar
- Ohne Tailscale-Verbindung hat niemand Zugriff auf die Verwaltung
- Jedes Gerät, das sich verbinden will, muss bei Tailscale autorisiert sein
- Die Datenbank hat **Row Level Security** — jeder Benutzer sieht nur seine eigenen Daten

### API-Sicherheit
- **Helmet** Security Headers auf der Upload-API
- **CORS** eingeschränkt auf eigene Domains
- **Rate Limiting** aktiv (100 Anfragen / 15 Min global, 20 Uploads / 15 Min)
- **JWT-Authentifizierung** für alle Upload-Anfragen

### API-Keys und Secrets
- **Keine Secrets im Git-Repository** — alle Secrets werden über Coolify Environment Variables gesetzt
- API-Keys (Anon Key, Service Role Key) werden mit dem **JWT Secret** signiert
- Die Keys werden **nicht automatisch rotiert** — sie bleiben gleich, solange das JWT Secret gleich bleibt
- Bei einem Supabase-Redeploy wird Kong's Config zurückgesetzt → dann müssen die Keys in Kong manuell neu eingetragen werden (siehe Abschnitt 10.1)

> [!WARNING]
> Wenn du in Zukunft das **JWT Secret** ändern willst, müssen **alle** Keys neu generiert und überall aktualisiert werden (Coolify Env Vars + Kong).

---

## 12. Code-Repository

| | |
|------|------|
| **Wo liegt der Code** | GitHub: `daenu-gallo/dashboard-app` |
| **Hauptbranch** | `main` |
| **Technik** | Vite + React (JavaScript) |
| **Upload-API** | Im gleichen Repo im Ordner `upload-api/` |
