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
        heading: 'Kontakt-Adresse',
        content: `**Fotohahn**
Blümlisalpstrasse 62
3627 Heimberg
Schweiz

**Vertretungsberechtigte Person:** Daniel Gallo

**Kontakt:**
E-Mail: info@fotohahn.ch
Telefon: +41 79 666 20 09`,
      },
      {
        heading: 'Haftungsausschluss',
        content: `Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen.

Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen.

Alle Angebote sind unverbindlich. Der Autor behält es sich ausdrücklich vor, Teile der Seiten oder das gesamte Angebot ohne besondere Ankündigung zu verändern, zu ergänzen, zu löschen oder die Veröffentlichung zeitweise oder endgültig einzustellen.`,
      },
      {
        heading: 'Urheberrechte',
        content: `Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen Dateien auf dieser Website gehören ausschliesslich Fotohahn oder den speziell genannten Rechteinhabern. Für die Reproduktion jeglicher Elemente ist die schriftliche Zustimmung des Urheberrechtsträgers im Voraus einzuholen.`,
      },
      {
        heading: 'Haftungsausschluss für Links',
        content: `Verweise und Links auf Webseiten Dritter liegen ausserhalb unseres Verantwortungsbereichs. Es wird jegliche Verantwortung für solche Webseiten abgelehnt. Der Zugriff und die Nutzung solcher Webseiten erfolgen auf eigene Gefahr des jeweiligen Nutzers.`,
      },
    ],
  },
  datenschutz: {
    title: 'Datenschutzerklärung',
    icon: Shield,
    sections: [
      {
        heading: 'Verantwortliche Stelle',
        content: `Verantwortlich für die Datenbearbeitungen, die wir hier beschreiben, ist:

**Fotohahn**
Blümlisalpstrasse 62
3627 Heimberg
Schweiz

**E-Mail:** info@fotohahn.ch
**Telefon:** +41 79 666 20 09

**Vertreter nach Art. 27 DSGVO:** Daniel Gallo`,
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
        content: `Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung der Galerie-Plattform von Fotohahn (Blümlisalpstrasse 62, 3627 Heimberg). Mit der Registrierung akzeptieren Sie diese AGB.`,
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
        content: `Fotohahn haftet nicht für:
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
        content: `Es gilt Schweizer Recht. Gerichtsstand ist Thun, Kanton Bern, Schweiz.`,
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
