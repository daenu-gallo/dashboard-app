import React from 'react';
import { Info, ChevronDown } from 'lucide-react';

const ShopTab = () => {
  return (
    <div className="shop-tab">
      {/* Left Column */}
      <div className="shop-section">
        <h3>Shop</h3>

        <div className="shop-toggle-row">
          <div className="toggle-wrapper on" />
          <span>Shop aktiv</span>
        </div>

        <a href="#" className="shop-link">Shop Produkte verwalten</a>

        <h3 style={{ marginTop: '0.5rem' }}>Shop Einstellungen</h3>

        <div className="shop-form-group">
          <label>Produkte in Galerie</label>
          <select className="form-select" style={{ width: '100%' }}>
            <option>Zeige Produkte nur nach dem vierten Album</option>
          </select>
        </div>
      </div>

      {/* Right Column - Automation */}
      <div className="automation-section">
        <h3>Verkaufsautomatisierung</h3>

        <div className="automation-warning">
          Es werden keine Verkaufsautomatisierungen ausgeführt, da dein Shop deaktiviert ist.
        </div>

        <div className="shop-form-group">
          <label>E-Mail Paket</label>
          <select className="form-select" style={{ width: '100%' }}>
            <option>Standardpaket</option>
          </select>
        </div>

        {/* Automation Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          <div className="automation-row">
            <div className="toggle-wrapper" />
            <div style={{ flex: 1 }}>
              <div className="form-label">Gutschein Code verwalten <Info size={12} /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Gutschein</span>
                  <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                    <option>10 Off</option>
                  </select>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Häufigkeit <Info size={10} /></span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input className="form-input" style={{ width: '40px', padding: '0.25rem', fontSize: '0.75rem' }} />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Startet am</span>
                  <input className="form-input" type="date" defaultValue="2022-03-28" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} />
                </div>
                <div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Endet nach</span>
                  <input className="form-input" type="date" defaultValue="2022-04-04" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <div style={{ flex: 1 }}>
              <div className="form-label">Gutscheincode zum Jubiläum <Info size={12} /></div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', alignItems: 'center' }}>
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Gutschein</span>
                  <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' }}>
                    <option>Gutscheincode auswählen</option>
                  </select>
                </div>
                <div>
                  <span className="form-label" style={{ fontSize: '0.75rem' }}>Häufigkeit <Info size={10} /></span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input className="form-input" style={{ width: '40px', padding: '0.25rem', fontSize: '0.75rem' }} />
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Jubiläumsdatum</span>
                <input className="form-input" type="date" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }} />
              </div>
            </div>
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <span className="form-label">Abgeschwächter Warenkorb Erinnerung <Info size={12} /></span>
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <span className="form-label">Leerer Warenkorb Produktempfehlung <Info size={12} /></span>
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <span className="form-label">Kostenloser Versand ab</span>
            <input className="form-input" style={{ width: '40px', padding: '0.25rem', fontSize: '0.75rem' }} defaultValue="0.0" />
            <span className="form-tag" style={{ background: 'var(--bg-main)', color: 'var(--text-primary)' }}>CHF</span>
            <Info size={12} />
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <div style={{ flex: 1 }}>
              <span className="form-label">Gutschein Code nach Kauf <Info size={12} /></span>
              <div style={{ marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Gutschein</span>
                <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                  <option>Gutscheincode auswählen</option>
                </select>
              </div>
            </div>
          </div>

          <div className="automation-row">
            <div className="toggle-wrapper" />
            <span className="form-label">Fotobuch verwalten <Info size={12} /></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopTab;
