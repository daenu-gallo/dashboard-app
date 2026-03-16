import React, { useState, useRef } from 'react';
import { HelpCircle, Edit3, Trash2, Plus, ImageIcon, Search, Check, Circle, X, Upload } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import './Settings.css';

const settingsTabs = [
  { id: 'marken', label: 'Marken & Wasserzeichen' },
  { id: 'voreinstellungen', label: 'Galerie Voreinstellungen' },
  { id: 'steuer', label: 'Steuerinformationen' },
  { id: 'mitteilungen', label: 'Mitteilungen' },
  { id: 'domains', label: 'Eigene Domains' },
  { id: 'sprache', label: 'Sprache' },
];

/* ——— Shared Modal Styles ——— */
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const greenHeader = { background: '#5a8a5c', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 600 };
const modalBody = { background: '#fff', borderRadius: '0 0 10px 10px', padding: '1.5rem' };
const modalWrap = { borderRadius: 10, overflow: 'hidden', minWidth: 500, maxWidth: 820, width: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' };
const greenBtn = { padding: '0.5rem 1.5rem', background: '#5a8a5c', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' };

/* ——— Positionen Grid ——— */
const positionLabels = [
  ['oben-links','oben-mitte','oben-rechts'],
  ['mitte-links','mitte','mitte-rechts'],
  ['unten-links','unten-mitte','unten-rechts'],
];

const PositionGrid = ({ value, onChange }) => (
  <div>
    <div style={{ fontWeight: 600, marginBottom: 6 }}>Positionen</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 32px)', gap: 2 }}>
      {positionLabels.flat().map(pos => (
        <div key={pos} onClick={() => onChange(pos)} style={{
          width: 32, height: 32, background: value === pos ? '#5a8a5c' : '#e5e7eb',
          borderRadius: 3, cursor: 'pointer', transition: 'background 0.15s',
        }} />
      ))}
    </div>
  </div>
);

/* ——— Tab: Marken & Wasserzeichen ——— */
/* ── Brand Settings Modal (Kontaktinformationen / Logos / Social Media) ── */
const BrandSettingsModal = ({ brand, onClose, onSave, setBrands }) => {
  const [activeSubTab, setActiveSubTab] = useState('kontakt');
  const [globalSettings, setGlobalSettings] = usePersistedState('global_brand_settings', {
    firmenname: 'Fotohahn',
    webseite: 'https://www.fotohahn.ch',
    email: 'info@fotohahn.ch',
    telefon: '+41796662009',
    logoDark: null,
    logoDarkName: '',
    logoLight: null,
    logoLightName: '',
    teamBild: null,
    teamBildName: '',
    facebook: 'https://www.facebook.com/Fotohahn.ch',
    instagram: 'https://www.instagram.com/Hochzeitsfotograf_fotohahn.ch/',
    twitter: 'https://twitter.com/fotohahnc',
    pinterest: 'https://www.pinterest.ch/Hochzeitsfotograf_Fotohahn/fotohahn',
    youtube: 'https://www.youtube.com/watch?v=p2wE2qW_dIg',
  });

  const logoDarkRef = useRef(null);
  const logoLightRef = useRef(null);
  const teamBildRef = useRef(null);

  const handleImageUpload = (field, nameField, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setGlobalSettings(prev => ({ ...prev, [field]: ev.target.result, [nameField]: file.name }));
    reader.readAsDataURL(file);
  };

  const deleteImage = (field, nameField) => {
    setGlobalSettings(prev => ({ ...prev, [field]: null, [nameField]: '' }));
  };

  const update = (field, val) => setGlobalSettings(prev => ({ ...prev, [field]: val }));

  // Sync brand name to settings_brands when saving
  const handleSave = () => {
    if (setBrands && globalSettings.firmenname) {
      setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, name: globalSettings.firmenname } : b));
    }
    onSave();
  };

  const subTabs = [
    { id: 'kontakt', label: 'Kontaktinformationen' },
    { id: 'logos', label: 'Logos' },
    { id: 'social', label: 'Social Media' },
  ];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalWrap, maxWidth: 820 }} onClick={e => e.stopPropagation()}>
        <div style={greenHeader}>
          <span>Markeneinstellungen</span>
          <X size={20} style={{ cursor: 'pointer' }} onClick={onClose} />
        </div>
        <div style={modalBody}>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
            {subTabs.map(t => (
              <button key={t.id}
                onClick={() => setActiveSubTab(t.id)}
                style={{
                  padding: '0.4rem 0.75rem', fontSize: '0.85rem', fontWeight: activeSubTab === t.id ? 600 : 400,
                  border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeSubTab === t.id ? '2px solid #333' : '2px solid transparent',
                  color: activeSubTab === t.id ? '#333' : '#888',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Kontaktinformationen */}
          {activeSubTab === 'kontakt' && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                Hier kannst du Standardwerte für deine Kontaktinformationen setzen. Diese werden dann automatisch in deine Galerien & Apps eingefügt.
              </p>
              <div className="form-group-st"><label style={{ fontWeight: 600 }}>Dein Firmenname</label>
                <input className="form-input-st" value={globalSettings.firmenname} onChange={e => update('firmenname', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Deine Webseite</label>
                <input className="form-input-st" value={globalSettings.webseite} onChange={e => update('webseite', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>E-Mail-Adresse für Kundenanfragen</label>
                <input className="form-input-st" value={globalSettings.email} onChange={e => update('email', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Telefonnummer für Kunden (mit Ländervorwahl)</label>
                <input className="form-input-st" value={globalSettings.telefon} onChange={e => update('telefon', e.target.value)} /></div>
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}>Speichern</button>
            </div>
          )}

          {/* Logos */}
          {activeSubTab === 'logos' && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                Hier kannst du deine Logos hochladen. Diese werden dann an den entsprechenden Stellen in deine Galerien & Apps eingefügt.
              </p>
              {/* Logo (dunkel) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Logo (dunkel)</div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Ein Logo, das auf einem hellem Hintergrund gut erkennbar ist. Am besten sind PNG Dateien mit transparentem Hintergrund. Die Abmessung des Bildes spielt keine Rolle.
                </p>
                <input ref={logoDarkRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload('logoDark', 'logoDarkName', e)} />
                <button className="file-upload-btn" onClick={() => logoDarkRef.current?.click()} style={{ width: '100%' }}>
                  📧 Datei auswählen...
                </button>
                {globalSettings.logoDarkName && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e8f5e9', borderRadius: 6, padding: '0.45rem 0.75rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                    <span>Hochgeladenes Bild: {globalSettings.logoDarkName}</span>
                    <button onClick={() => deleteImage('logoDark', 'logoDarkName')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              {/* Logo (hell) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Logo (hell)</div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Ein Logo, das auf einem dunklen Hintergrund gut erkennbar ist. Am besten sind PNG Dateien mit transparentem Hintergrund. Die Abmessung des Bildes spielt keine Rolle.
                </p>
                <input ref={logoLightRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload('logoLight', 'logoLightName', e)} />
                <button className="file-upload-btn" onClick={() => logoLightRef.current?.click()} style={{ width: '100%' }}>
                  📧 Datei auswählen...
                </button>
                {globalSettings.logoLightName && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e8f5e9', borderRadius: 6, padding: '0.45rem 0.75rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                    <span>Hochgeladenes Bild: {globalSettings.logoLightName}</span>
                    <button onClick={() => deleteImage('logoLight', 'logoLightName')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              {/* Teambild */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Teambild / Studiobild / Dein Portrait</div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Einfach ein Bild von dir, deinem Studio oder deinem Team. Hier solltest du ein quadratisches JPG Bild verwenden.
                </p>
                <input ref={teamBildRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleImageUpload('teamBild', 'teamBildName', e)} />
                <button className="file-upload-btn" onClick={() => teamBildRef.current?.click()} style={{ width: '100%' }}>
                  📧 Datei auswählen...
                </button>
                {globalSettings.teamBildName && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#e8f5e9', borderRadius: 6, padding: '0.45rem 0.75rem', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                    <span>Hochgeladenes Bild: {globalSettings.teamBildName}</span>
                    <button onClick={() => deleteImage('teamBild', 'teamBildName')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', padding: '0.65rem' }}>Speichern</button>
            </div>
          )}

          {/* Social Media */}
          {activeSubTab === 'social' && (
            <div>
              <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '1rem' }}>
                Hier kannst du deine Social Media Kanäle eintragen, damit deine Kunden dich auch dort finden können.
              </p>
              <div className="form-group-st"><label style={{ fontWeight: 600 }}>Dein Facebook Account</label>
                <input className="form-input-st" value={globalSettings.facebook} onChange={e => update('facebook', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Dein Instagram Account</label>
                <input className="form-input-st" value={globalSettings.instagram} onChange={e => update('instagram', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Dein Twitter Account</label>
                <input className="form-input-st" value={globalSettings.twitter} onChange={e => update('twitter', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Dein Pinterest Account</label>
                <input className="form-input-st" value={globalSettings.pinterest} onChange={e => update('pinterest', e.target.value)} /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}><label style={{ fontWeight: 600 }}>Dein Youtube Account</label>
                <input className="form-input-st" value={globalSettings.youtube} onChange={e => update('youtube', e.target.value)} /></div>
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}>Speichern</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ——— Tab: Marken & Wasserzeichen ——— */
const MarkenTab = () => {
  const [brands, setBrands] = usePersistedState('settings_brands', [
    { id: 1, name: 'Fotohahn', active: true, logo: null },
  ]);
  const [watermarks, setWatermarks] = usePersistedState('settings_watermarks_v2', [
    { id: 1, name: 'Standard', wmType: 'image', image: null, scale: 100, transparency: 50, position: 'mitte' },
    { id: 2, name: 'Wasserzeichen Hochzeitsfotograf', wmType: 'text', image: null, text: 'Hochzeitsfotograf Fotohahn', font: 'Open Sans, 64px, weiß', scale: 100, transparency: 50, position: 'mitte' },
    { id: 3, name: 'Fotohahn.ch', wmType: 'image', image: null, scale: 100, transparency: 50, position: 'mitte' },
  ]);

  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [brandSettingsBrand, setBrandSettingsBrand] = useState(null);
  const [globalBrand] = usePersistedState('global_brand_settings', {});
  const brandFileRef = useRef({});
  const wmFileRef = useRef({});
  const modalFileRef = useRef(null);

  // ── Brand handlers ──
  const toggleBrand = (id) => setBrands(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  const deleteBrand = (id) => setBrands(prev => prev.filter(b => b.id !== id));
  const handleBrandLogoUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setBrands(prev => prev.map(b => b.id === id ? { ...b, logo: ev.target.result } : b));
    reader.readAsDataURL(file);
  };

  // ── Watermark handlers ──
  const deleteWatermark = (id) => setWatermarks(prev => prev.filter(w => w.id !== id));
  const handleWmImageUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setWatermarks(prev => prev.map(w => w.id === id ? { ...w, image: ev.target.result } : w));
    reader.readAsDataURL(file);
  };

  // ── Modal image upload ──
  const handleModalImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setModalData(prev => ({ ...prev, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  // ── Open modals ──
  const openAddBrand = () => { setModalType('add-brand'); setModalData({ name: '', image: null }); };
  const openEditBrand = (b) => { setBrandSettingsBrand(b); };
  const openAddWm = () => { setModalType('add-wm-chooser'); setModalData({}); };
  const openEditWm = (wm) => { setModalType('edit-wm'); setModalData({ ...wm }); };

  // ── Save brand ──
  const saveBrand = () => {
    if (!modalData.name?.trim()) return;
    if (modalType === 'add-brand') {
      setBrands(prev => [...prev, { id: Date.now(), name: modalData.name.trim(), active: true, logo: modalData.image }]);
    } else {
      setBrands(prev => prev.map(b => b.id === modalData.id ? { ...b, name: modalData.name, logo: modalData.image } : b));
    }
    setModalType(null);
  };

  // ── Save watermark ──
  const saveWatermark = () => {
    if (!modalData.name?.trim()) return;
    const wmData = {
      name: modalData.name.trim(),
      wmType: modalData.wmType || 'image',
      image: modalData.image || null,
      text: modalData.text || '',
      font: modalData.font || 'Open Sans, 64px, weiß',
      scale: modalData.scale ?? 100,
      transparency: modalData.transparency ?? 50,
      position: modalData.position || 'mitte',
    };
    if (modalType === 'add-wm-image' || modalType === 'add-wm-text') {
      wmData.wmType = modalType === 'add-wm-image' ? 'image' : 'text';
      setWatermarks(prev => [...prev, { id: Date.now(), ...wmData }]);
    } else {
      setWatermarks(prev => prev.map(w => w.id === modalData.id ? { ...w, ...wmData } : w));
    }
    setModalType(null);
  };

  const closeModal = () => setModalType(null);

  return (
    <div className="settings-two-col">
      {/* ── Meine Marken ── */}
      <div>
        <div className="settings-section-header"><h3>Meine Marken</h3></div>
        <div className="cards-grid">
          {brands.map(brand => (
            <div className="brand-card" key={brand.id}>
              <div className="brand-logo-area">
                {(brand.logo || globalBrand.logoDark) ? (
                  <img src={brand.logo || globalBrand.logoDark} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                ) : (
                  <div className="brand-logo-circle"><ImageIcon size={24} style={{ color: '#aaa' }} /></div>
                )}
              </div>
              <div className="brand-card-footer">
                <span>{globalBrand.firmenname || brand.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className={`toggle-wrapper ${brand.active ? 'on' : ''}`} onClick={() => toggleBrand(brand.id)} />
                  <button className="icon-btn" onClick={() => openEditBrand(brand)} title="Bearbeiten"><Edit3 size={14} /></button>
                  <button className="icon-btn" onClick={() => deleteBrand(brand.id)} title="Löschen"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="brand-card add-card" onClick={openAddBrand} style={{ cursor: 'pointer' }}>
              <div className="add-card-icon"><ImageIcon size={32} style={{ color: '#aaa' }} /></div>
              <div className="brand-card-footer"><span>Marke hinzufügen</span><Plus size={16} /></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Meine Wasserzeichen ── */}
      <div>
        <div className="settings-section-header"><h3>Meine Wasserzeichen</h3></div>
        <div className="cards-grid">
          {watermarks.map(wm => (
            <div className="watermark-card" key={wm.id}>
              <div className="watermark-preview" style={{ cursor: 'pointer' }}
                onClick={() => { if (!wmFileRef.current[wm.id]) { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange = (e) => handleWmImageUpload(wm.id, e); wmFileRef.current[wm.id] = inp; } wmFileRef.current[wm.id].click(); }}>
                {wm.image ? (
                  <img src={wm.image} alt={wm.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : wm.wmType === 'text' ? (
                  <span className="watermark-label" style={{ fontSize: 13, textAlign: 'center' }}>{wm.text || wm.name}</span>
                ) : (
                  <span className="watermark-text">©opyright</span>
                )}
              </div>
              <div className="watermark-card-footer">
                <span>{wm.name}</span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button className="icon-btn" onClick={() => openEditWm(wm)} title="Bearbeiten"><Edit3 size={14} /></button>
                  <button className="icon-btn" onClick={() => deleteWatermark(wm.id)} title="Löschen"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="brand-card add-card" onClick={openAddWm} style={{ cursor: 'pointer' }}>
            <div className="add-card-icon"><ImageIcon size={32} style={{ color: '#aaa' }} /><Plus size={14} style={{ position: 'absolute', bottom: '-2px', right: '-2px', color: '#aaa' }} /></div>
            <div className="brand-card-footer"><span>Wasserzeichen hinzufügen</span><Plus size={16} /></div>
          </div>
        </div>
      </div>

      {/* ══════ MODALS ══════ */}
      <input ref={modalFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleModalImageUpload} />

      {/* ── Wasserzeichen hinzufügen: Chooser ── */}
      {modalType === 'add-wm-chooser' && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={modalWrap} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>Wasserzeichen hinzufügen</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={{ ...modalBody, padding: '1.5rem 2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                <button onClick={() => { setModalType('add-wm-image'); setModalData({ name: '', wmType: 'image', image: null, scale: 100, transparency: 50, position: 'mitte' }); }}
                  style={{ ...greenBtn, flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}>
                  Erstelle Wasserzeichen-Bild
                </button>
                <button onClick={() => { setModalType('add-wm-text'); setModalData({ name: '', wmType: 'text', text: '', font: 'Open Sans, 64px, weiß', scale: 100, transparency: 50, position: 'mitte' }); }}
                  style={{ ...greenBtn, flex: 1, padding: '0.75rem', fontSize: '0.95rem' }}>
                  Erstelle Wasserzeichen-Text
                </button>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Beispiel:</div>
                  <img src="/watermark-bild-example.png" alt="Bild Beispiel" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Beispiel:</div>
                  <img src="/watermark-text-example.png" alt="Text Beispiel" style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Modal (Add) ── */}
      {modalType === 'add-brand' && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={{ ...modalWrap, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>{modalType === 'add-brand' ? 'Neue Marke' : 'Marke bearbeiten'}</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={modalBody}>
              <div className="form-group-st"><label style={{ fontWeight: 600 }}>Name</label><input className="form-input-st" value={modalData.name || ''} onChange={e => setModalData(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600 }}>Logo</label>
                {modalData.image && <div style={{ marginBottom: 8, textAlign: 'center', background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}><img src={modalData.image} alt="" style={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain' }} /></div>}
                <button className="file-upload-btn" onClick={() => modalFileRef.current?.click()} style={{ width: '100%' }}>Bild hochladen <ImageIcon size={14} /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={saveBrand} style={greenBtn}>Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Watermark Image Modal (Add/Edit) ── */}
      {((modalType === 'edit-wm' && modalData.wmType === 'image') || modalType === 'add-wm-image') && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={{ ...modalWrap, maxWidth: 750 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>Wasserzeichen bearbeiten</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={{ ...modalBody, display: 'flex', gap: '2rem' }}>
              {/* Left: Preview with overlay */}
              <div style={{ flex: '0 0 300px' }}>
                <div style={{ width: 300, height: 220, borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative', background: '#f5f5f5' }}>
                  {/* Background sample photo */}
                  <img src="/watermark-sample-bg.png" alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Watermark overlay */}
                  {modalData.image && (() => {
                    const pos = modalData.position || 'mitte';
                    const posMap = {
                      'oben-links': { top: '8%', left: '8%' },
                      'oben-mitte': { top: '8%', left: '50%', transform: 'translateX(-50%)' },
                      'oben-rechts': { top: '8%', right: '8%' },
                      'mitte-links': { top: '50%', left: '8%', transform: 'translateY(-50%)' },
                      'mitte': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
                      'mitte-rechts': { top: '50%', right: '8%', transform: 'translateY(-50%)' },
                      'unten-links': { bottom: '8%', left: '8%' },
                      'unten-mitte': { bottom: '8%', left: '50%', transform: 'translateX(-50%)' },
                      'unten-rechts': { bottom: '8%', right: '8%' },
                    };
                    const scaleVal = (modalData.scale ?? 100) / 100;
                    const opacityVal = 1 - (modalData.transparency ?? 50) / 100;
                    return (
                      <img src={modalData.image} alt="Wasserzeichen" style={{
                        position: 'absolute',
                        maxWidth: '40%', maxHeight: '40%', objectFit: 'contain',
                        opacity: opacityVal,
                        transform: (posMap[pos]?.transform || '') + ` scale(${scaleVal})`,
                        transition: 'all 0.15s',
                        ...posMap[pos],
                      }} />
                    );
                  })()}
                </div>
                <button className="file-upload-btn" onClick={() => modalFileRef.current?.click()} style={{ width: '100%', marginTop: '0.5rem' }}>
                  Wasserzeichen-Bild hochladen <ImageIcon size={14} />
                </button>
              </div>
              {/* Right: Controls */}
              <div style={{ flex: 1 }}>
                <div className="form-group-st"><label style={{ fontWeight: 600 }}>Name</label><input className="form-input-st" value={modalData.name || ''} onChange={e => setModalData(p => ({ ...p, name: e.target.value }))} /></div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Skalierung</span><span>{modalData.scale ?? 100}%</span></div>
                  <input type="range" min="10" max="100" value={modalData.scale ?? 100} onChange={e => setModalData(p => ({ ...p, scale: +e.target.value }))} style={{ width: '100%', accentColor: '#5a8a5c' }} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Transparenz</span><span>{modalData.transparency ?? 50}%</span></div>
                  <input type="range" min="0" max="100" value={modalData.transparency ?? 50} onChange={e => setModalData(p => ({ ...p, transparency: +e.target.value }))} style={{ width: '100%', accentColor: '#5a8a5c' }} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <PositionGrid value={modalData.position || 'mitte'} onChange={pos => setModalData(p => ({ ...p, position: pos }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button onClick={saveWatermark} style={greenBtn}>Speichern</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Watermark Text Modal (Add/Edit) ── */}
      {((modalType === 'edit-wm' && modalData.wmType === 'text') || modalType === 'add-wm-text') && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={{ ...modalWrap, maxWidth: 750 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>Wasserzeichen bearbeiten</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={{ ...modalBody, display: 'flex', gap: '2rem' }}>
              {/* Left: Preview */}
              <div style={{ flex: '0 0 280px' }}>
                <div style={{ width: 280, height: 200, background: '#444', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {modalData.image && <img src={modalData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />}
                  <span style={{ position: 'relative', color: 'rgba(255,255,255,0.75)', fontSize: 20, fontWeight: 700, textAlign: 'center', padding: '0 1rem', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                    {modalData.text || 'Mein Wasserzeichen'}
                  </span>
                </div>
              </div>
              {/* Right: Controls */}
              <div style={{ flex: 1 }}>
                <div className="form-group-st"><label style={{ fontWeight: 600 }}>Name</label><input className="form-input-st" value={modalData.name || ''} onChange={e => setModalData(p => ({ ...p, name: e.target.value }))} /></div>
                <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontWeight: 600 }}>Wasserzeichen Text</label>
                  <input className="form-input-st" value={modalData.text || ''} onChange={e => setModalData(p => ({ ...p, text: e.target.value }))} />
                </div>
                <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                  <label style={{ fontWeight: 600 }}>Schrift</label>
                  <select className="form-input-st" value={modalData.font || 'Open Sans, 64px, weiß'} onChange={e => setModalData(p => ({ ...p, font: e.target.value }))}>
                    <option>Open Sans, 64px, weiß</option>
                    <option>Open Sans, 48px, weiß</option>
                    <option>Open Sans, 32px, weiß</option>
                    <option>Roboto, 64px, weiß</option>
                    <option>Roboto, 48px, weiß</option>
                    <option>Georgia, 64px, weiß</option>
                  </select>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <PositionGrid value={modalData.position || 'mitte'} onChange={pos => setModalData(p => ({ ...p, position: pos }))} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button onClick={saveWatermark} style={greenBtn}>Speichern</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Settings Modal (Kontaktinformationen / Logos / Social Media) ── */}
      {brandSettingsBrand && (
        <BrandSettingsModal
          brand={brandSettingsBrand}
          onClose={() => setBrandSettingsBrand(null)}
          onSave={() => setBrandSettingsBrand(null)}
          setBrands={setBrands}
        />
      )}
    </div>
  );
};

/* ——— Tab: Galerie Voreinstellungen ——— */
const defaultPresets = [
  { name: 'Online Galerie', standard: false },
  { name: 'Hochzeiten – by fotohahn', standard: false },
  { name: 'Auswahlgalerie – by fotohahn', standard: false },
  { name: 'Portrait / Familie / Baby / Tiere – by fotohahn', standard: false },
  { name: 'Kita / Schulen – by fotohahn', standard: false },
  { name: 'Events (Reitturniere / Abibälle etc.) – by fotohahn', standard: false },
  { name: 'Standard – by fotohahn', standard: false },
  { name: 'Optimale Einstellungen – by fotohahn', standard: false },
  { name: 'Optimale Einstellungen – by fotohahn', standard: true },
];

const VoreinstellungenTab = () => {
  const [presets, setPresets] = usePersistedState('settings_presets', defaultPresets);
  const [globalBrand] = usePersistedState('global_brand_settings', {});
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const handleDelete = (idx) => setPresets(prev => prev.filter((_, i) => i !== idx));
  const handleSetStandard = (idx) => setPresets(prev => prev.map((p, i) => ({ ...p, standard: i === idx })));

  const openEdit = (idx) => {
    const p = presets[idx];
    setDetailModal({
      idx, activeTab: 'einstellungen',
      name: p.name, marke: p.marke || '', domain: p.domain || 'app.fotohahn.ch',
      wasserzeichen: p.wasserzeichen || '', sprache: p.sprache || 'Deutsch',
      mitteilung: p.mitteilung || '', sortierung: p.sortierung || 'Uploaddatum',
      ablauf: p.ablauf || '', tags: p.tags || '',
      download: p.download !== false, downloadPin: p.downloadPin || false,
      appHinweis: p.appHinweis !== false, teilen: p.teilen !== false,
      kommentar: p.kommentar !== false, zeigeDateinamen: p.zeigeDateinamen || false,
      gesichtserkennung: p.gesichtserkennung || false,
      // Design
      vorlage: p.vorlage || '', schriftart: p.schriftart || '', primaerfarbe: p.primaerfarbe || '',
      sekundaerfarbe: p.sekundaerfarbe || '', bildabstand: p.bildabstand || '', bilddarstellung: p.bilddarstellung || 'Standard',
      dekorativ: p.dekorativ !== false, fotografenhinweis: p.fotografenhinweis || false,
      // Tracking
      gaCode: p.gaCode || '', gtmId: p.gtmId || '', fbPixel: p.fbPixel || '',
      // Alben
      alben: p.alben || [],
    });
  };

  const openAdd = () => setModal({ type: 'add', name: '' });

  const handleAddSave = () => {
    if (!modal || !modal.name.trim()) return;
    setPresets(prev => [...prev, { name: modal.name.trim(), standard: false }]);
    setModal(null);
  };

  const handleDetailSave = () => {
    if (!detailModal) return;
    const { idx, activeTab, ...data } = detailModal;
    setPresets(prev => prev.map((p, i) => i === idx ? { ...p, ...data } : p));
    setDetailModal(null);
  };

  const ud = (field, val) => setDetailModal(prev => ({ ...prev, [field]: val }));
  const displayName = (name) => name.replace(/fotohahn/gi, globalBrand.firmenname || 'fotohahn');

  const detailTabs = [
    { id: 'einstellungen', label: 'Einstellungen' },
    { id: 'design', label: 'Design' },
    { id: 'alben', label: 'Alben' },
    { id: 'tracking', label: 'Tracking' },
  ];
  const ts = (on) => ({ width: 36, height: 20, borderRadius: 10, background: on ? '#4a7c59' : '#ccc', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', display: 'inline-block', flexShrink: 0 });
  const tk = (on) => ({ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: on ? 18 : 2, transition: 'left 0.2s' });
  const labelSt = { fontWeight: 600, fontSize: '0.8rem', marginBottom: 4, display: 'block' };
  const resetIcon = { color: '#888', cursor: 'pointer', flexShrink: 0 };

  return (
    <div className="settings-section">
      <div className="settings-section-header"><h3>Galerie Voreinstellungen</h3></div>
      <div className="search-box-sm"><Search size={14} /><input placeholder="Suche" /></div>
      <table className="settings-table">
        <thead><tr><th>Name</th><th>Standard</th><th>Aktion</th></tr></thead>
        <tbody>
          {presets.map((p, i) => (
            <tr key={i}>
              <td>{displayName(p.name)}</td>
              <td>{p.standard ? 'Ja' : 'Nein'}</td>
              <td className="preset-actions">
                <button className="icon-btn green" onClick={() => openEdit(i)} title="Bearbeiten"><Edit3 size={14} /></button>
                <button className="icon-btn green" onClick={() => handleDelete(i)} title="Löschen"><Trash2 size={14} /></button>
                {p.standard ? <span className="preset-check active"><Check size={14} /></span> : <Circle size={14} style={{ color: '#ccc', cursor: 'pointer' }} onClick={() => handleSetStandard(i)} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="add-link" onClick={openAdd}><Plus size={14} /> Neue Voreinstellung anlegen</button>
      <div className="pagination-row"><span>Ergebnisse pro Seite</span><select className="form-select-sm"><option>10</option><option>20</option><option>50</option><option>100</option></select></div>

      {/* ── Modal: Neue Voreinstellung (Name) ── */}
      {modal && (
        <div style={overlayStyle} onClick={() => setModal(null)}>
          <div style={{ ...modalWrap, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}>
              <span><Edit3 size={16} style={{ marginRight: 8 }} />Neue Galerie Voreinstellung erstellen</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setModal(null)} />
            </div>
            <div style={modalBody}>
              <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>Trage einen Namen für deine neue Galerie Voreinstellung ein</p>
              <div style={{ position: 'relative' }}>
                <input className="form-input-st" placeholder="Galerie Voreinstellung Name" value={modal.name} onChange={e => setModal(prev => ({ ...prev, name: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') handleAddSave(); }} autoFocus />
                <HelpCircle size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59' }} />
              </div>
              <button onClick={handleAddSave} disabled={!modal.name.trim()} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem', opacity: modal.name.trim() ? 1 : 0.5, cursor: modal.name.trim() ? 'pointer' : 'not-allowed' }}>Erstellen</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal: Preset Konfiguration (4 Tabs) ── */}
      {detailModal && (
        <div style={overlayStyle} onClick={() => setDetailModal(null)}>
          <div style={{ ...modalWrap, maxWidth: 820, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Edit3 size={16} />{displayName(detailModal.name)}</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setDetailModal(null)} />
            </div>
            <div style={modalBody}>
              {/* Tab Nav */}
              <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid #eee', marginBottom: '1.25rem', paddingBottom: '0.5rem' }}>
                {detailTabs.map(t => (
                  <span key={t.id} onClick={() => ud('activeTab', t.id)}
                    style={{ cursor: 'pointer', fontSize: '0.85rem', fontWeight: detailModal.activeTab === t.id ? 600 : 400, color: detailModal.activeTab === t.id ? '#4a7c59' : '#888', borderBottom: detailModal.activeTab === t.id ? '2px solid #4a7c59' : 'none', paddingBottom: 4 }}>
                    {t.label}
                  </span>
                ))}
              </div>

              {/* ── Tab: Einstellungen ── */}
              {detailModal.activeTab === 'einstellungen' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 2rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standard Marke</label>
                      <select className="form-input-st" value={detailModal.marke} onChange={e => ud('marke', e.target.value)}>
                        <option value="">Wähle eine Standard Marke</option><option>{globalBrand.firmenname || 'Fotohahn'}</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standard Domain</label>
                      <select className="form-input-st" value={detailModal.domain} onChange={e => ud('domain', e.target.value)}>
                        <option>app.fotohahn.ch</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle ein Standard Wasserzeichen</label>
                      <select className="form-input-st" value={detailModal.wasserzeichen} onChange={e => ud('wasserzeichen', e.target.value)}>
                        <option value="">Wähle ein Standard Wasserzeichen</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standard Sprache</label>
                      <select className="form-input-st" value={detailModal.sprache} onChange={e => ud('sprache', e.target.value)}>
                        <option>Deutsch</option><option>Englisch</option><option>Französisch</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Mitteilung</label>
                      <select className="form-input-st" value={detailModal.mitteilung} onChange={e => ud('mitteilung', e.target.value)}>
                        <option value="">Bitte auswählen</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standardsortierung für Alben</label>
                      <select className="form-input-st" value={detailModal.sortierung} onChange={e => ud('sortierung', e.target.value)}>
                        <option>Uploaddatum</option><option>Dateiname</option><option>Aufnahmedatum</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Läuft ab am</label>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input className="form-input-st" type="number" value={detailModal.ablauf} onChange={e => ud('ablauf', e.target.value)} style={{ flex: 1 }} />
                        <HelpCircle size={14} style={{ color: '#4a7c59' }} /><span style={{ fontSize: '0.8rem', color: '#666', whiteSpace: 'nowrap' }}>Tage(n)</span>
                      </div></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Tags</label>
                      <div style={{ position: 'relative' }}>
                        <input className="form-input-st" placeholder="Tag eintragen..." value={detailModal.tags} onChange={e => ud('tags', e.target.value)} />
                        <HelpCircle size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59' }} />
                      </div></div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.25rem' }}>
                    {[
                      { key: 'download', label: 'Download' }, { key: 'downloadPin', label: 'Download PIN' },
                      { key: 'appHinweis', label: 'App-Hinweis' }, { key: 'teilen', label: 'Teilen' },
                      { key: 'kommentar', label: 'Kommentarfunktion' }, { key: 'zeigeDateinamen', label: 'Zeige Dateinamen' },
                      { key: 'gesichtserkennung', label: 'Gesichtserkennung', help: true },
                    ].map(t => (
                      <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={ts(detailModal[t.key])} onClick={() => ud(t.key, !detailModal[t.key])}><div style={tk(detailModal[t.key])} /></div>
                        <span style={{ fontSize: '0.8rem' }}>{t.label}{t.help && <HelpCircle size={12} style={{ marginLeft: 4, color: '#4a7c59' }} />}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Design ── */}
              {detailModal.activeTab === 'design' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Vorlagen</label>
                    <select className="form-input-st" value={detailModal.vorlage} onChange={e => ud('vorlage', e.target.value)}>
                      <option value="">Vorlage wählen</option><option>Simple Filigree</option><option>Atelier</option><option>Scrappbook 2.0 Dark</option><option>Vicky Baumann Fineart</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', overflowX: 'auto', padding: '0.25rem 0' }}>
                    {['Simple Filigree', 'Atelier', 'Scrappbook 2.0 Dark', 'Vicky Baumann Fineart'].map(t => (
                      <div key={t} onClick={() => ud('vorlage', t)} style={{ flex: '0 0 140px', height: 80, border: detailModal.vorlage === t ? '2px solid #4a7c59' : '1px solid #ddd', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: t.includes('Dark') ? '#333' : '#f8f8f8', color: t.includes('Dark') ? '#fff' : '#333', fontSize: '0.65rem', fontWeight: 600, textAlign: 'center', padding: '0.5rem', textTransform: 'uppercase' }}>
                        {t}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><label style={{ ...labelSt, flex: 1, marginBottom: 0 }}>Schriftart</label><span style={resetIcon} title="Zurücksetzen">↺</span>
                    <select className="form-input-st" style={{ flex: 3 }} value={detailModal.schriftart} onChange={e => ud('schriftart', e.target.value)}>
                      <option value="">Schriftart wählen</option><option>Open Sans</option><option>Roboto</option><option>Playfair Display</option><option>Montserrat</option>
                    </select></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div><label style={labelSt}>Primärfarbe <span style={resetIcon}>↺</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="color" value={detailModal.primaerfarbe || '#000000'} onChange={e => ud('primaerfarbe', e.target.value)} style={{ width: 32, height: 32, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                        <input className="form-input-st" placeholder="Primärfarbe auswählen" value={detailModal.primaerfarbe} onChange={e => ud('primaerfarbe', e.target.value)} style={{ flex: 1 }} />
                        <Edit3 size={14} style={{ color: '#4a7c59', cursor: 'pointer' }} />
                      </div></div>
                    <div><label style={labelSt}>Sekundärfarbe <span style={resetIcon}>↺</span></label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input type="color" value={detailModal.sekundaerfarbe || '#000000'} onChange={e => ud('sekundaerfarbe', e.target.value)} style={{ width: 32, height: 32, border: 'none', borderRadius: '50%', cursor: 'pointer', padding: 0 }} />
                        <input className="form-input-st" placeholder="Sekundärfarbe auswählen" value={detailModal.sekundaerfarbe} onChange={e => ud('sekundaerfarbe', e.target.value)} style={{ flex: 1 }} />
                        <Edit3 size={14} style={{ color: '#4a7c59', cursor: 'pointer' }} />
                      </div></div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Bildabstand <span style={resetIcon}>↺</span></label>
                    <select className="form-input-st" value={detailModal.bildabstand} onChange={e => ud('bildabstand', e.target.value)}>
                      <option value="">Bildabstand wählen</option><option>Kein Abstand</option><option>Klein</option><option>Mittel</option><option>Gross</option>
                    </select></div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Bilddarstellung <span style={resetIcon}>↺</span></label>
                    <select className="form-input-st" value={detailModal.bilddarstellung} onChange={e => ud('bilddarstellung', e.target.value)}>
                      <option>Standard</option><option>Vollbild</option><option>Masonry</option>
                    </select></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={ts(detailModal.dekorativ)} onClick={() => ud('dekorativ', !detailModal.dekorativ)}><div style={tk(detailModal.dekorativ)} /></div>
                      <span style={{ fontSize: '0.8rem' }}>Zeige dekorative Elemente <HelpCircle size={12} style={{ marginLeft: 2, color: '#4a7c59' }} /></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={ts(detailModal.fotografenhinweis)} onClick={() => ud('fotografenhinweis', !detailModal.fotografenhinweis)}><div style={tk(detailModal.fotografenhinweis)} /></div>
                      <span style={{ fontSize: '0.8rem' }}>Zeige Fotografenhinweis im Titelbild <HelpCircle size={12} style={{ marginLeft: 2, color: '#4a7c59' }} /></span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tab: Alben ── */}
              {detailModal.activeTab === 'alben' && (
                <div>
                  <div onClick={() => { const name = prompt('Album-Name eingeben:'); if (name && name.trim()) ud('alben', [...(detailModal.alben || []), name.trim()]); }} style={{ border: '2px dashed #4a7c59', borderRadius: 8, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', color: '#4a7c59', fontSize: '0.9rem', fontWeight: 500 }}>
                    <Plus size={16} style={{ marginRight: 6 }} />Album hinzufügen
                  </div>
                  {(detailModal.alben || []).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      {detailModal.alben.map((a, i) => (
                        <div key={i} style={{ padding: '0.5rem', border: '1px solid #eee', borderRadius: 6, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem' }}>{a}</span>
                          <Trash2 size={14} style={{ color: '#888', cursor: 'pointer' }} onClick={() => ud('alben', detailModal.alben.filter((_, j) => j !== i))} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Tracking ── */}
              {detailModal.activeTab === 'tracking' && (
                <div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Google Analytics Code</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input-st" placeholder="Google Analytics Code" value={detailModal.gaCode} onChange={e => ud('gaCode', e.target.value)} />
                      <HelpCircle size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59' }} />
                    </div></div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Google Tag Manager ID</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input-st" placeholder="Google Tag Manager ID" value={detailModal.gtmId} onChange={e => ud('gtmId', e.target.value)} />
                      <HelpCircle size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59' }} />
                    </div></div>
                  <div style={{ marginBottom: '1rem' }}><label style={labelSt}>Facebook Pixel ID</label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-input-st" placeholder="Facebook Pixel ID" value={detailModal.fbPixel} onChange={e => ud('fbPixel', e.target.value)} />
                      <HelpCircle size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59' }} />
                    </div></div>
                </div>
              )}

              <button onClick={handleDetailSave} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ——— Tab: Steuerinformationen ——— */
const SteuerTab = () => {
  const [steuerData, setSteuerData] = usePersistedState('settings_steuer', {
    kleinunternehmer: true,
    waehrung: 'Schweizer Franken',
    umsatzsteuerId: '-',
    steuernummer: '-',
    handelsregisternummer: '-',
    handelsregister: '-',
  });

  const updateField = (field, value) => {
    setSteuerData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="settings-section" style={{ maxWidth: 700 }}>
      <h3>Steuerinformationen</h3>
      <label className="checkbox-row" style={{ marginBottom: '1rem' }}>
        <input type="checkbox" checked={steuerData.kleinunternehmer} onChange={() => updateField('kleinunternehmer', !steuerData.kleinunternehmer)} />
        <span>Ich bin Kleinunternehmer</span>
      </label>
      <div className="info-banner">
        Der Umsatzsteuersatz + KU-Regelung kann nur einmal im Jahr angepasst werden. Bitte wende dich an unseren Support, wenn du deine Steuerregelung dennoch anpassen möchtest.
      </div>
      <div className="form-group-st">
        <label>Account Währung <HelpCircle size={13} className="help-icon" /></label>
        <select className="form-input-st" value={steuerData.waehrung} onChange={e => updateField('waehrung', e.target.value)}><option>Schweizer Franken</option><option>Euro</option></select>
      </div>
      <div className="form-group-st">
        <label>Umsatzsteuer-ID <HelpCircle size={13} className="help-icon" /></label>
        <input className="form-input-st" value={steuerData.umsatzsteuerId} onChange={e => updateField('umsatzsteuerId', e.target.value)} />
      </div>
      <div className="form-group-st">
        <label>Steuernummer <HelpCircle size={13} className="help-icon" /></label>
        <input className="form-input-st" value={steuerData.steuernummer} onChange={e => updateField('steuernummer', e.target.value)} />
      </div>
      <div className="form-group-st">
        <label>Handelsregisternummer <HelpCircle size={13} className="help-icon" /></label>
        <input className="form-input-st" value={steuerData.handelsregisternummer} onChange={e => updateField('handelsregisternummer', e.target.value)} />
      </div>
      <div className="form-group-st">
        <label>Handelsregister <HelpCircle size={13} className="help-icon" /></label>
        <input className="form-input-st" value={steuerData.handelsregister} onChange={e => updateField('handelsregister', e.target.value)} />
      </div>
      <button className="btn-save">Speichern</button>
    </div>
  );
};

/* ——— Tab: Mitteilungen ——— */
const MitteilungenTab = () => {
  const [mittData, setMittData] = usePersistedState('settings_mitteilungen', {
    titel: 'Fotoshooting',
    mitteilung: '15% Rabatt auf Familienshooting',
    bild: null,
    bildName: '',
    buttontext: 'Jetzt buchen',
    buttonaktion: 'www.fotohahn.ch',
    werSoll: 'Alle',
    wannAnzeigen: '0',
    wieOftAnzeigen: '1',
    anzeigenBis: '',
  });
  const bildInputRef = useRef(null);

  const updateField = (field, value) => {
    setMittData(prev => ({ ...prev, [field]: value }));
  };

  const handleBildUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMittData(prev => ({ ...prev, bild: ev.target.result, bildName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="settings-two-col">
      <div className="settings-section">
        <div className="settings-section-header">
          <h3>Mitteilungen</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary-sm">Neu</button>
            <button className="icon-btn"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="form-group-st"><label>Titel</label><input className="form-input-st" value={mittData.titel} onChange={e => updateField('titel', e.target.value)} /></div>
        <div className="form-group-st"><label>Mitteilung</label><input className="form-input-st" value={mittData.mitteilung} onChange={e => updateField('mitteilung', e.target.value)} /></div>
        <div className="form-group-st">
          <label>Bild</label>
          <input ref={bildInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBildUpload} />
          <button className="file-upload-btn" onClick={() => bildInputRef.current?.click()}>
            {mittData.bildName || 'Datei auswählen...'} <ImageIcon size={14} />
          </button>
        </div>
        <div className="form-group-st"><label>Buttontext</label><input className="form-input-st" value={mittData.buttontext} onChange={e => updateField('buttontext', e.target.value)} /></div>
        <div className="form-group-st">
          <label>Buttonaktion</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="badge-warn">Bitte auswählen ▾</span>
            <span className="text-muted text-sm">https://</span>
            <input className="form-input-st" value={mittData.buttonaktion} onChange={e => updateField('buttonaktion', e.target.value)} style={{ flex: 1 }} />
          </div>
        </div>
        <div className="form-group-st">
          <label>Wer soll die Mitteilung sehen?</label>
          <select className="form-input-st" value={mittData.werSoll} onChange={e => updateField('werSoll', e.target.value)}><option>Alle</option></select>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div className="form-group-st" style={{ flex: 1 }}>
            <label>Wann anzeigen?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input className="form-input-st" value={mittData.wannAnzeigen} onChange={e => updateField('wannAnzeigen', e.target.value)} style={{ width: 50 }} />
              <span className="badge-outline">Galerieaufrufen</span>
            </div>
          </div>
          <div className="form-group-st" style={{ flex: 1 }}>
            <label>Wie oft anzeigen?</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input className="form-input-st" value={mittData.wieOftAnzeigen} onChange={e => updateField('wieOftAnzeigen', e.target.value)} style={{ width: 50 }} />
              <span className="badge-outline">Mal</span>
            </div>
          </div>
        </div>
        <div className="form-group-st">
          <label>Mitteilung anzeigen bis</label>
          <div style={{ position: 'relative' }}>
            <input className="form-input-st" placeholder="Bitte Datum auswählen" type="date" value={mittData.anzeigenBis} onChange={e => updateField('anzeigenBis', e.target.value)} />
          </div>
        </div>
        <button className="btn-save">Mitteilung aktivieren</button>
      </div>
      <div>
        <div className="settings-section-header">
          <h3>Vorschau</h3>
        </div>
        <div className="phone-preview">
          <div className="phone-frame">
            <div className="phone-notch" />
            <div className="phone-screen">
              <div className="phone-banner">
                <h4>{mittData.titel}</h4>
                <p>{mittData.mitteilung}</p>
                {mittData.bild && <img src={mittData.bild} alt="Mitteilung" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
                <button className="phone-btn-dark">{mittData.buttontext}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ——— Tab: Eigene Domains ——— */
const DomainsTab = () => {
  const [domains, setDomains] = usePersistedState('settings_domains', [
    { id: 1, domain: 'app.fotohahn.ch', target: 'horizontal-pheasant-40jnz8finut07rqvhi1o1svy.herokudns.com', impressum: 'AGB', datenschutz: 'AGB' },
  ]);
  const [impressumList, setImpressumList] = usePersistedState('settings_impressum_v2', [
    { id: 1, name: 'AGB', url: 'https://fotohahn.ch/agb-fotohahn-hochzeitsfotograf/', content: 'https://fotohahn.ch/impressum/' },
  ]);
  const [datenschutzList, setDatenschutzList] = usePersistedState('settings_datenschutz_v2', [
    { id: 1, name: 'AGB', url: 'https://fotohahn.ch/agb-fotohahn-hochzeitsfotograf/', content: 'https://fotohahn.ch/datenschutzerklaerung-von-fotohahn-ch/' },
  ]);
  const [legalModal, setLegalModal] = useState(null); // { type: 'impressum'|'datenschutz', mode: 'add'|'edit', data: {...} }

  const [domainModal, setDomainModal] = useState(null); // { name: '' }

  const addDomain = () => {
    setDomainModal({ name: '' });
  };
  const handleDomainSave = () => {
    if (!domainModal || !domainModal.name.trim()) return;
    setDomains(prev => [...prev, { id: Date.now(), domain: domainModal.name.trim(), target: '', impressum: 'AGB', datenschutz: 'AGB' }]);
    setDomainModal(null);
  };
  const deleteDomain = (id) => setDomains(prev => prev.filter(d => d.id !== id));

  const openLegalEdit = (type, item) => {
    setLegalModal({ type, mode: 'edit', data: { ...item } });
  };
  const openLegalAdd = (type) => {
    setLegalModal({ type, mode: 'add', data: { id: null, name: '', url: '', content: '' } });
  };

  const saveLegal = () => {
    if (!legalModal || !legalModal.data.name?.trim()) return;
    const setList = legalModal.type === 'impressum' ? setImpressumList : setDatenschutzList;
    if (legalModal.mode === 'add') {
      setList(prev => [...prev, { ...legalModal.data, id: Date.now(), name: legalModal.data.name.trim() }]);
    } else {
      setList(prev => prev.map(i => i.id === legalModal.data.id ? { ...legalModal.data } : i));
    }
    setLegalModal(null);
  };

  const deleteLegal = () => {
    if (!legalModal || legalModal.mode === 'add') { setLegalModal(null); return; }
    const setList = legalModal.type === 'impressum' ? setImpressumList : setDatenschutzList;
    setList(prev => prev.filter(i => i.id !== legalModal.data.id));
    setLegalModal(null);
  };

  const deleteItem = (setList, id) => setList(prev => prev.filter(i => i.id !== id));

  const typeLabel = legalModal?.type === 'impressum' ? 'Impressum' : 'Datenschutzerklärung';
  const generatorLabel = legalModal?.type === 'impressum' ? 'Impressumsgenerator' : 'Datenschutzgenerator';

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-header"><h3>Eigene Domains</h3></div>
        <table className="settings-table">
          <thead>
            <tr><th>Deine Domain</th><th>Ziel Domain</th><th>Impressum</th><th>Datenschutz</th><th>Aktion</th></tr>
          </thead>
          <tbody>
            {domains.map(d => (
              <tr key={d.id}>
                <td>{d.domain}</td>
                <td className="text-sm text-muted">{d.target}</td>
                <td><select className="form-select-sm" value={d.impressum} onChange={e => setDomains(prev => prev.map(x => x.id === d.id ? { ...x, impressum: e.target.value } : x))}>{impressumList.map(i => <option key={i.id}>{i.name}</option>)}</select></td>
                <td><select className="form-select-sm" value={d.datenschutz} onChange={e => setDomains(prev => prev.map(x => x.id === d.id ? { ...x, datenschutz: e.target.value } : x))}>{datenschutzList.map(i => <option key={i.id}>{i.name}</option>)}</select></td>
                <td><button className="icon-btn green" onClick={() => deleteDomain(d.id)} title="Löschen"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="add-link" onClick={addDomain}><Plus size={14} /> Neue Subdomain</button>
      </div>
      <div className="settings-two-col" style={{ marginTop: '1.5rem' }}>
        <div className="settings-section">
          <h3>Impressum</h3>
          {impressumList.map(item => (
            <div className="legal-row" key={item.id}>
              <span>{item.name}</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="icon-btn green" onClick={() => openLegalEdit('impressum', item)} title="Bearbeiten"><Edit3 size={14} /></button>
                <button className="icon-btn green" onClick={() => deleteItem(setImpressumList, item.id)} title="Löschen"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button className="add-link" onClick={() => openLegalAdd('impressum')}><Plus size={14} /> Neue Impressum</button>
        </div>
        <div className="settings-section">
          <h3>Datenschutz</h3>
          {datenschutzList.map(item => (
            <div className="legal-row" key={item.id}>
              <span>{item.name}</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="icon-btn green" onClick={() => openLegalEdit('datenschutz', item)} title="Bearbeiten"><Edit3 size={14} /></button>
                <button className="icon-btn green" onClick={() => deleteItem(setDatenschutzList, item.id)} title="Löschen"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          <button className="add-link" onClick={() => openLegalAdd('datenschutz')}><Plus size={14} /> Neue Datenschutz</button>
        </div>
      </div>

      {/* ── Impressum / Datenschutz Modal ── */}
      {legalModal && (
        <div style={overlayStyle} onClick={() => setLegalModal(null)}>
          <div style={{ ...modalWrap, maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}>
              <span>{legalModal.mode === 'add' ? (legalModal.type === 'impressum' ? 'Impressum hinzufügen' : 'Datenschutz hinzufügen') : (typeLabel + ' bearbeiten')}</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setLegalModal(null)} />
            </div>
            <div style={modalBody}>
              <div className="form-group-st">
                <label style={{ fontWeight: 600 }}>Beschreibung <HelpCircle size={13} style={{ color: '#aaa' }} /></label>
                <input className="form-input-st" value={legalModal.data.name} onChange={e => setLegalModal(prev => ({ ...prev, data: { ...prev.data, name: e.target.value } }))} />
              </div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600 }}>Internetaddresse <HelpCircle size={13} style={{ color: '#aaa' }} /></label>
                <input className="form-input-st" placeholder={legalModal.type === 'impressum' ? 'https://fotohahn.ch/agb-fotohahn-hochzeitsfotograf/' : 'https://fotohahn.ch/agb-fotohahn-hochzeitsfotograf/'} value={legalModal.data.url} onChange={e => setLegalModal(prev => ({ ...prev, data: { ...prev.data, url: e.target.value } }))} />
              </div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600 }}>{legalModal.type === 'impressum' ? 'Impressum' : 'Datenschutz'} <HelpCircle size={13} style={{ color: '#aaa' }} /></label>
                <textarea className="form-input-st" rows={3} placeholder={legalModal.type === 'impressum' ? 'https://fotohahn.ch/impressum/' : 'https://fotohahn.ch/datenschutzerklaerung-von-fotohahn-ch/'} value={legalModal.data.content} onChange={e => setLegalModal(prev => ({ ...prev, data: { ...prev.data, content: e.target.value } }))} style={{ resize: 'vertical' }} />
              </div>
              <button onClick={saveLegal} style={{ ...greenBtn, width: '100%', marginTop: '1rem', padding: '0.65rem' }}>
                {typeLabel} bearbeiten
              </button>
              <div style={{ marginTop: '0.35rem', fontSize: 13, color: '#5a8a5c', cursor: 'pointer' }}>{generatorLabel}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                {legalModal.mode === 'edit' && (
                  <span style={{ fontSize: 13, color: '#888', cursor: 'pointer' }} onClick={deleteLegal}>
                    {legalModal.type === 'impressum' ? 'Impressum löschen' : 'Datenschutz löschen'}
                  </span>
                )}
                <button onClick={() => setLegalModal(null)} style={{ padding: '0.4rem 1rem', background: '#6b7280', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.85rem', cursor: 'pointer' }}>Abbrechen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Domain Modal ── */}
      {domainModal && (
        <div style={overlayStyle} onClick={() => setDomainModal(null)}>
          <div style={{ ...modalWrap, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}>
              <span>Eigene Domain hinzufügen</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setDomainModal(null)} />
            </div>
            <div style={modalBody}>
              <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '1rem' }}>
                Trage deine Subdomain ein
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input-st"
                  placeholder="z.B. app.meinedomain.ch"
                  value={domainModal.name}
                  onChange={e => setDomainModal(prev => ({ ...prev, name: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') handleDomainSave(); }}
                  autoFocus
                />
                <HelpCircle size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#4a7c59', cursor: 'pointer' }} />
              </div>
              <button
                onClick={handleDomainSave}
                disabled={!domainModal.name.trim()}
                style={{
                  ...greenBtn,
                  width: '100%',
                  marginTop: '1.25rem',
                  padding: '0.65rem',
                  opacity: domainModal.name.trim() ? 1 : 0.5,
                  cursor: domainModal.name.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ——— Tab: Sprache ——— */
const SpracheTab = () => {
  const [sprache, setSprache] = usePersistedState('settings_sprache', 'Deutsch');
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    setSprache(e.target.value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-section" style={{ maxWidth: 500 }}>
      <h3>Sprache</h3>
      <div className="form-group-st">
        <label>Standardsprache</label>
        <select className="form-input-st" value={sprache} onChange={handleChange}>
          <option value="Deutsch">Deutsch</option>
          <option value="English">English</option>
          <option value="Français">Français</option>
          <option value="Italiano">Italiano</option>
        </select>
      </div>
      {saved && <div style={{ color: '#5a8a5c', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>✓ Gespeichert</div>}
    </div>
  );
};

/* ——— Main Settings Page ——— */
const SettingsPage = () => {
  const [activeTab, setActiveTab] = usePersistedState('settings_active_tab', 'marken');

  const renderTab = () => {
    switch (activeTab) {
      case 'marken': return <MarkenTab />;
      case 'voreinstellungen': return <VoreinstellungenTab />;
      case 'steuer': return <SteuerTab />;
      case 'mitteilungen': return <MitteilungenTab />;
      case 'domains': return <DomainsTab />;
      case 'sprache': return <SpracheTab />;
      default: return <MarkenTab />;
    }
  };

  return (
    <div className="settings-page">
      <h1 className="text-h1">Einstellungen</h1>
      <nav className="settings-tabs">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="settings-content">
        {renderTab()}
      </div>
    </div>
  );
};

export default SettingsPage;
