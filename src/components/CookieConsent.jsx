import React, { useState, useEffect } from 'react';
import { Shield, X, ChevronDown, ChevronUp, Cookie } from 'lucide-react';
import './CookieConsent.css';

const CONSENT_KEY = 'cookie_consent_v1';

const CATEGORIES = [
  {
    id: 'necessary',
    label: 'Notwendig',
    description: 'Diese Cookies sind für die Grundfunktionen der Website erforderlich (Login, Sicherheit, Einstellungen). Sie können nicht deaktiviert werden.',
    required: true,
    defaultEnabled: true,
    cookies: ['session', 'auth_token', 'csrf_token', 'cookie_consent'],
  },
  {
    id: 'statistics',
    label: 'Statistik',
    description: 'Helfen uns zu verstehen, wie Besucher die Website nutzen. Alle Daten werden anonym erfasst.',
    required: false,
    defaultEnabled: false,
    cookies: ['Google Analytics', 'Google Tag Manager'],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Werden verwendet, um Besuchern relevante Werbung und Kampagnen anzuzeigen.',
    required: false,
    defaultEnabled: false,
    cookies: ['Facebook Pixel', 'Google Ads'],
  },
];

/**
 * Get the current consent state from localStorage.
 * Returns null if no consent has been given yet.
 */
export const getConsent = () => {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

/**
 * Check if a specific category is consented to.
 */
export const hasConsent = (category) => {
  const consent = getConsent();
  if (!consent) return false;
  return !!consent.categories?.[category];
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [categories, setCategories] = useState(() =>
    CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: cat.defaultEnabled || cat.required,
    }), {})
  );

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (cats) => {
    const consent = {
      categories: cats,
      timestamp: new Date().toISOString(),
      version: 1,
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('cookie-consent-update', { detail: consent }));
  };

  const acceptAll = () => {
    const all = CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {});
    saveConsent(all);
  };

  const acceptSelected = () => {
    saveConsent(categories);
  };

  const rejectAll = () => {
    const onlyRequired = CATEGORIES.reduce((acc, cat) => ({
      ...acc,
      [cat.id]: cat.required,
    }), {});
    saveConsent(onlyRequired);
  };

  const toggleCategory = (id) => {
    const cat = CATEGORIES.find(c => c.id === id);
    if (cat?.required) return;
    setCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!visible) return null;

  return (
    <div className="cookie-overlay">
      <div className="cookie-banner">
        {/* Header */}
        <div className="cookie-header">
          <div className="cookie-header-icon">
            <Shield size={20} />
          </div>
          <div>
            <h3 className="cookie-title">Datenschutz-Einstellungen</h3>
            <p className="cookie-subtitle">Wir respektieren deine Privatsphäre</p>
          </div>
        </div>

        {/* Description */}
        <p className="cookie-description">
          Wir verwenden Cookies und ähnliche Technologien, um dir ein optimales Erlebnis zu bieten. 
          Du kannst wählen, welche Kategorien du zulassen möchtest. 
          Weitere Informationen findest du in unserer{' '}
          <a href="/datenschutz" className="cookie-link">Datenschutzerklärung</a>.
        </p>

        {/* Category toggles (collapsed by default) */}
        <button
          className="cookie-details-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showDetails ? 'Weniger anzeigen' : 'Cookie-Einstellungen anpassen'}
        </button>

        {showDetails && (
          <div className="cookie-categories">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="cookie-category">
                <div className="cookie-category-header">
                  <div className="cookie-category-info">
                    <span className="cookie-category-name">{cat.label}</span>
                    {cat.required && (
                      <span className="cookie-category-badge">Erforderlich</span>
                    )}
                  </div>
                  <div
                    className={`cookie-toggle ${categories[cat.id] ? 'on' : ''} ${cat.required ? 'locked' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                  />
                </div>
                <p className="cookie-category-desc">{cat.description}</p>
                <div className="cookie-category-cookies">
                  {cat.cookies.map(c => (
                    <span key={c} className="cookie-chip">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="cookie-actions">
          <button className="cookie-btn cookie-btn-reject" onClick={rejectAll}>
            Ablehnen
          </button>
          {showDetails && (
            <button className="cookie-btn cookie-btn-select" onClick={acceptSelected}>
              Auswahl speichern
            </button>
          )}
          <button className="cookie-btn cookie-btn-accept" onClick={acceptAll}>
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
