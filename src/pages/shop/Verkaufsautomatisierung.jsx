import React, { useState, useEffect } from 'react';
import { HelpCircle, BookOpen } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';

const Verkaufsautomatisierung = () => {
  const { automation, saveAutomation, priceLists, coupons } = useShop();
  const [innerTab, setInnerTab] = useState('global');
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    price_list_id: '',
    email_package: 'standard',
    coupon_marketing: false,
    coupon_marketing_code: '',
    coupon_marketing_frequency: 10,
    coupon_marketing_start: '',
    coupon_marketing_end: '',
    cart_reminder: false,
    product_recommendation: false,
    free_shipping: false,
    free_shipping_threshold: 99,
    post_purchase_coupon: false,
    post_purchase_coupon_code: '',
    included_tags: '',
    excluded_galleries: '',
    email_order_subject: 'Vielen Dank für deine Bestellung!',
    email_shipping_subject: 'Deine Bestellung wurde versendet!',
    email_cart_subject: 'Du hast Fotos im Warenkorb vergessen!',
    email_sender_name: '',
    email_reply_to: '',
  });

  // Sync from DB
  useEffect(() => {
    if (automation) {
      setSettings((prev) => ({
        ...prev,
        ...automation,
        included_tags: Array.isArray(automation.included_tags) ? automation.included_tags.join(', ') : (automation.included_tags || ''),
        excluded_galleries: Array.isArray(automation.excluded_galleries) ? automation.excluded_galleries.join(', ') : (automation.excluded_galleries || ''),
        coupon_marketing_start: automation.coupon_marketing_start || '',
        coupon_marketing_end: automation.coupon_marketing_end || '',
      }));
    }
  }, [automation]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      ...settings,
      included_tags: settings.included_tags ? settings.included_tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      excluded_galleries: settings.excluded_galleries ? settings.excluded_galleries.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };
    // Remove non-DB fields
    delete payload.id;
    delete payload.user_id;
    delete payload.created_at;
    delete payload.updated_at;
    await saveAutomation(payload);
    setSaving(false);
  };

  return (
    <div className="shop-content">
      {/* Inner Tabs */}
      <nav className="shop-inner-tabs" style={{ marginBottom: '1rem' }}>
        <button className={`shop-inner-tab ${innerTab === 'global' ? 'active' : ''}`} onClick={() => setInnerTab('global')}>
          Globale Einstellungen
        </button>
        <button className={`shop-inner-tab ${innerTab === 'email' ? 'active' : ''}`} onClick={() => setInnerTab('email')}>
          E-Mail Einstellungen
        </button>
      </nav>

      {innerTab === 'global' && (
        <div className="automation-page">
          <h2 className="shop-section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Verkaufsautomatisierung
            <a className="shop-help-link" href="#"><BookOpen size={13} /> Hilfeartikel anzeigen</a>
          </h2>

          {/* Warning Banner */}
          <div className="automation-warning">
            Änderungen die du hier vornimmst werden auf alle Galerien angewendet bei denen der
            Print Shop aktiv ist. Im Feld "Galerien ausschließen" kannst du Galerien ausschließen.
            Bitte beachte, dass gespeicherte Einstellung nicht rückgängig gemacht werden können.
          </div>

          {/* Preisliste */}
          <div className="automation-field">
            <label>Preisliste</label>
            <select value={settings.price_list_id || ''} onChange={(e) => updateSetting('price_list_id', e.target.value)}>
              <option value="">Standard</option>
              {priceLists.map((pl) => (
                <option key={pl.id} value={pl.id}>{pl.name}</option>
              ))}
            </select>
          </div>

          {/* E-Mail Paket */}
          <div className="automation-field">
            <label>E-Mail Paket</label>
            <select value={settings.email_package} onChange={(e) => updateSetting('email_package', e.target.value)}>
              <option value="standard">Standardpaket</option>
            </select>
          </div>

          {/* Toggle: Gutschein Code vermarkten */}
          <div className="automation-toggle-row">
            <div
              className={`toggle-wrapper ${settings.coupon_marketing ? 'on' : ''}`}
              onClick={() => updateSetting('coupon_marketing', !settings.coupon_marketing)}
            />
            <div className="automation-toggle-content">
              <div className="automation-toggle-label">
                Gutschein Code vermarkten <HelpCircle size={12} style={{ color: '#7fb5ff' }} />
              </div>
              {settings.coupon_marketing && (
                <>
                  <div className="automation-toggle-fields">
                    <div className="field-group">
                      <label>Gutschein</label>
                      <select value={settings.coupon_marketing_code} onChange={(e) => updateSetting('coupon_marketing_code', e.target.value)}>
                        <option value="">Gutscheincode auswählen</option>
                        {coupons.map((c) => (
                          <option key={c.id} value={c.code}>{c.code} – {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group">
                      <label>Häufigkeit <HelpCircle size={10} style={{ color: '#7fb5ff' }} /></label>
                      <input type="number" value={settings.coupon_marketing_frequency} onChange={(e) => updateSetting('coupon_marketing_frequency', parseInt(e.target.value) || 0)} style={{ width: 60 }} />
                    </div>
                  </div>
                  <div className="automation-toggle-fields" style={{ marginTop: '0.5rem' }}>
                    <div className="field-group">
                      <label>Startet am</label>
                      <input type="date" value={settings.coupon_marketing_start} onChange={(e) => updateSetting('coupon_marketing_start', e.target.value)} />
                    </div>
                    <div className="field-group">
                      <label>Endet nach</label>
                      <input type="date" value={settings.coupon_marketing_end} onChange={(e) => updateSetting('coupon_marketing_end', e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Toggle: Abgebrochener Warenkorb Erinnerung */}
          <div className="automation-toggle-row">
            <div className={`toggle-wrapper ${settings.cart_reminder ? 'on' : ''}`} onClick={() => updateSetting('cart_reminder', !settings.cart_reminder)} />
            <div className="automation-toggle-content">
              <div className="automation-toggle-label">Abgebrochener Warenkorb Erinnerung <HelpCircle size={12} style={{ color: '#7fb5ff' }} /></div>
            </div>
          </div>

          {/* Toggle: Leerer Warenkorb Produktempfehlung */}
          <div className="automation-toggle-row">
            <div className={`toggle-wrapper ${settings.product_recommendation ? 'on' : ''}`} onClick={() => updateSetting('product_recommendation', !settings.product_recommendation)} />
            <div className="automation-toggle-content">
              <div className="automation-toggle-label">Leerer Warenkorb Produktempfehlung <HelpCircle size={12} style={{ color: '#7fb5ff' }} /></div>
            </div>
          </div>

          {/* Toggle: Kostenloser Versand ab */}
          <div className="automation-toggle-row">
            <div className={`toggle-wrapper ${settings.free_shipping ? 'on' : ''}`} onClick={() => updateSetting('free_shipping', !settings.free_shipping)} />
            <div className="automation-toggle-content">
              <div className="automation-toggle-label" style={{ marginBottom: 0 }}>
                <div className="free-shipping-row">
                  Kostenloser Versand ab
                  <input type="number" className="price-input" value={settings.free_shipping_threshold} onChange={(e) => updateSetting('free_shipping_threshold', parseFloat(e.target.value) || 0)} style={{ width: 60 }} />
                  <span className="currency-badge">CHF</span>
                  <HelpCircle size={12} style={{ color: '#7fb5ff' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Toggle: Gutschein Code nach Kauf */}
          <div className="automation-toggle-row">
            <div className={`toggle-wrapper ${settings.post_purchase_coupon ? 'on' : ''}`} onClick={() => updateSetting('post_purchase_coupon', !settings.post_purchase_coupon)} />
            <div className="automation-toggle-content">
              <div className="automation-toggle-label">Gutschein Code nach Kauf <HelpCircle size={12} style={{ color: '#7fb5ff' }} /></div>
              {settings.post_purchase_coupon && (
                <div className="automation-toggle-fields">
                  <div className="field-group">
                    <label>Gutschein</label>
                    <select value={settings.post_purchase_coupon_code} onChange={(e) => updateSetting('post_purchase_coupon_code', e.target.value)}>
                      <option value="">Gutscheincode auswählen</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.code}>{c.code} – {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Galerie Tags */}
          <div style={{ marginTop: '1.5rem' }}>
            <div className="automation-field">
              <label>Galerie Tags einschließen</label>
              <div className="tags-input-wrapper">
                <input type="text" placeholder="Tag eintragen..." value={settings.included_tags} onChange={(e) => updateSetting('included_tags', e.target.value)} />
                <span className="info-icon"><HelpCircle size={14} /></span>
              </div>
            </div>
          </div>

          {/* Galerien ausschliessen */}
          <div className="automation-field">
            <label>Galerien ausschließen</label>
            <div className="exclude-search">
              <input type="text" placeholder="Galerietitel oder Namen eingeben..." value={settings.excluded_galleries} onChange={(e) => updateSetting('excluded_galleries', e.target.value)} />
            </div>
          </div>

          <button className="btn-save-activate" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern & Aktivieren'}
          </button>
        </div>
      )}

      {innerTab === 'email' && (
        <div className="automation-page">
          <h2 className="shop-section-title">E-Mail Einstellungen</h2>
          <p className="shop-section-desc">
            Hier kannst du die E-Mail-Vorlagen anpassen, die bei Shop-Käufen und Automatisierungen
            an deine Kunden versendet werden.
          </p>

          <div className="automation-field">
            <label>Betreff – Bestellbestätigung</label>
            <input type="text" value={settings.email_order_subject} onChange={(e) => updateSetting('email_order_subject', e.target.value)} />
          </div>
          <div className="automation-field">
            <label>Betreff – Versandbestätigung</label>
            <input type="text" value={settings.email_shipping_subject} onChange={(e) => updateSetting('email_shipping_subject', e.target.value)} />
          </div>
          <div className="automation-field">
            <label>Betreff – Warenkorb Erinnerung</label>
            <input type="text" value={settings.email_cart_subject} onChange={(e) => updateSetting('email_cart_subject', e.target.value)} />
          </div>
          <div className="automation-field">
            <label>Absender-Name</label>
            <input type="text" value={settings.email_sender_name} onChange={(e) => updateSetting('email_sender_name', e.target.value)} placeholder="z.B. Fotohahn" />
          </div>
          <div className="automation-field">
            <label>Antwort-E-Mail</label>
            <input type="email" value={settings.email_reply_to} onChange={(e) => updateSetting('email_reply_to', e.target.value)} placeholder="info@fotohahn.ch" />
          </div>

          <button className="btn-save-activate" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Verkaufsautomatisierung;
