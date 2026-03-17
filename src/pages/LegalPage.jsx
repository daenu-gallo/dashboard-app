import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, FileText, Scale, ArrowLeft } from 'lucide-react';
import { useMetaTags } from '../hooks/useMetaTags';
import './LegalPage.css';

const legalContent = {
  impressum: {
    title: 'Impressum',
    icon: FileText,
    sections: [
      {
        heading: 'Angaben gemäss Schweizer Recht (OR Art. 959a)',
        content: `**Firmenname:** Fotohahn GmbH
**Handelsregisternummer:** CHE-XXX.XXX.XXX
**Geschäftsführer:** Daniel Gallo

**Adresse:**
Fotohahn GmbH
Musterstrasse 1
3600 Thun
Schweiz

**Kontakt:**
E-Mail: info@fotohahn.ch
Telefon: +41 XX XXX XX XX

**UID-Nummer:** CHE-XXX.XXX.XXX MWST`,
      },
      {
        heading: 'Haftungsausschluss',
        content: `Der Autor übernimmt keine Gewähr für die Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen.

Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, die aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.`,
      },
      {
        heading: 'Urheberrechte',
        content: `Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf dieser Website gehören ausschliesslich der Fotohahn GmbH oder den speziell genannten Rechteinhabern. Für die Reproduktion jeglicher Elemente ist die schriftliche Zustimmung des Urheberrechtsträgers im Voraus einzuholen.`,
      },
    ],
  },
  datenschutz: {
    title: 'Datenschutzerklärung',
    icon: Shield,
    sections: [
      {
        heading: 'Verantwortliche Stelle',
        content: `Verantwortlich für die Datenbearbeitung im Sinne der Datenschutzgesetzgebung ist:

**Fotohahn GmbH**
Musterstrasse 1
3600 Thun
Schweiz
info@fotohahn.ch`,
      },
      {
        heading: 'Datenerfassung auf unserer Website',
        content: `**Welche Daten erheben wir?**
- Bestandsdaten (Name, E-Mail-Adresse bei Registrierung)
- Nutzungsdaten (besuchte Seiten, Zeitpunkt des Zugriffs)
- Technische Daten (IP-Adresse, Browser-Typ, Betriebssystem)

**Wofür nutzen wir Ihre Daten?**
- Bereitstellung und Optimierung unserer Dienste
- Verwaltung Ihres Benutzerkontos
- Zustellung Ihrer Fotogalerien an Ihre Kunden

**Rechtsgrundlage:**
Die Verarbeitung erfolgt auf Basis des Schweizer Datenschutzgesetzes (DSG) und, soweit anwendbar, der EU-DSGVO.`,
      },
      {
        heading: 'Cookies',
        content: `Unsere Website verwendet Cookies. Dabei handelt es sich um kleine Textdateien, die auf Ihrem Endgerät gespeichert werden.

**Folgende Cookie-Kategorien verwenden wir:**
- **Notwendig:** Login-Session, Sicherheits-Token, Cookie-Consent
- **Statistik:** Google Analytics (nur mit Ihrer Zustimmung)
- **Marketing:** Facebook Pixel, Google Ads (nur mit Ihrer Zustimmung)

Sie können Ihre Cookie-Einstellungen jederzeit über den Cookie-Banner anpassen.`,
      },
      {
        heading: 'Datenspeicherung',
        content: `Ihre Daten werden auf Servern der Supabase Inc. gespeichert. Die Bilderdaten werden auf unserem eigenen NAS-Server in der Schweiz gespeichert.

Wir speichern Ihre Daten nur so lange, wie es für die Erfüllung der genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen.`,
      },
      {
        heading: 'Ihre Rechte',
        content: `Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:
- **Auskunftsrecht:** Sie können Auskunft über Ihre gespeicherten Daten verlangen
- **Berichtigungsrecht:** Sie können die Berichtigung unrichtiger Daten verlangen
- **Löschungsrecht:** Sie können die Löschung Ihrer Daten verlangen
- **Widerspruchsrecht:** Sie können der Datenverarbeitung widersprechen

Kontaktieren Sie uns unter info@fotohahn.ch für Anfragen zu Ihren Datenschutzrechten.`,
      },
    ],
  },
  agb: {
    title: 'Allgemeine Geschäftsbedingungen (AGB)',
    icon: Scale,
    sections: [
      {
        heading: '1. Geltungsbereich',
        content: `Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Galerie-Plattform von Fotohahn GmbH. Mit der Registrierung akzeptieren Sie diese AGB.`,
      },
      {
        heading: '2. Leistungsumfang',
        content: `Fotohahn Gallery bietet eine Plattform für professionelle Fotografen zur:
- Erstellung und Verwaltung von Online-Fotogalerien
- Bereitstellung von Kundenansichten mit Passwortschutz
- Download-Funktionalität für Kunden
- Wasserzeichen-Verwaltung
- Marken-Verwaltung`,
      },
      {
        heading: '3. Nutzungsbedingungen',
        content: `Der Nutzer verpflichtet sich:
- Keine rechtswidrigen Inhalte hochzuladen
- Die Urheberrechte Dritter zu respektieren
- Sein Passwort vertraulich zu behandeln
- Die Plattform nicht missbräuchlich zu nutzen`,
      },
      {
        heading: '4. Haftung',
        content: `Fotohahn GmbH haftet nicht für:
- Datenverlust durch höhere Gewalt oder technische Störungen
- Schäden durch Fehlbedienung des Nutzers
- Inhalte, die vom Nutzer hochgeladen werden

Die Haftung ist in jedem Fall auf den Betrag des bezahlten Abonnements beschränkt.`,
      },
      {
        heading: '5. Kündigung',
        content: `Das Abonnement kann jederzeit zum Ende des laufenden Abrechnungszeitraums gekündigt werden. Bei Kündigung werden Ihre Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen.`,
      },
      {
        heading: '6. Anwendbares Recht',
        content: `Es gilt Schweizer Recht. Gerichtsstand ist Thun, Schweiz.`,
      },
    ],
  },
};

const LegalPage = () => {
  const { type } = useParams();
  const page = legalContent[type] || legalContent.impressum;
  const Icon = page.icon;

  useMetaTags({
    title: `${page.title} | Fotohahn Gallery`,
    description: page.title,
  });

  // Simple markdown-like bold rendering
  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold: **text**
      const parts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} style={{ margin: line.trim() === '' ? '0.5rem 0' : '0.2rem 0' }}>
          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="legal-page">
      <div className="legal-container">
        <Link to="/login" className="legal-back">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="legal-header">
          <div className="legal-header-icon">
            <Icon size={24} />
          </div>
          <h1 className="legal-title">{page.title}</h1>
        </div>

        <div className="legal-meta">
          Stand: {new Date().toLocaleDateString('de-CH', { month: 'long', year: 'numeric' })}
        </div>

        {page.sections.map((section, i) => (
          <section key={i} className="legal-section">
            <h2 className="legal-section-heading">{section.heading}</h2>
            <div className="legal-section-content">
              {renderContent(section.content)}
            </div>
          </section>
        ))}

        <div className="legal-footer-nav">
          {Object.entries(legalContent)
            .filter(([key]) => key !== type)
            .map(([key, val]) => (
              <Link key={key} to={`/legal/${key}`} className="legal-footer-link">
                {val.title}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
};

export default LegalPage;
