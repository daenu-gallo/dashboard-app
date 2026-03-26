import React, { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle, Edit3, Trash2, Plus, ImageIcon, Search, Check, Circle, X, Upload, RotateCcw, GripVertical } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import { useSupabaseSetting } from '../hooks/useSupabaseSetting';
import { useWatermarks } from '../hooks/useWatermarks';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
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
  const { globalBrand: globalSettings, setGlobalBrand: setGlobalSettings } = useBrand();

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

  // Save feedback state
  const [saveConfirm, setSaveConfirm] = useState(false);

  // Sync brand name to settings_brands when saving
  const handleSave = () => {
    if (setBrands && globalSettings.firmenname) {
      setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, name: globalSettings.firmenname } : b));
    }
    // Show save confirmation (don't close modal)
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 2000);
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
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}>{saveConfirm ? '✓ Gespeichert' : 'Speichern'}</button>
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
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', padding: '0.65rem' }}>{saveConfirm ? '✓ Gespeichert' : 'Speichern'}</button>
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
              <button onClick={handleSave} style={{ ...greenBtn, width: '100%', marginTop: '1.25rem', padding: '0.65rem' }}>{saveConfirm ? '✓ Gespeichert' : 'Speichern'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ——— Tab: Marken & Wasserzeichen ——— */
const MarkenTab = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState([]);
  const [watermarks, setWatermarks] = useState([]);

  // ── Load from Supabase on mount ──
  const loadedRef = useRef(false);
  const brandLoadedFromDb = useRef(false);
  const wmLoadedFromDb = useRef(false);
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    (async () => {
      const { data: dbBrands } = await supabase.from('brands').select('*').eq('user_id', user.id);
      if (dbBrands?.length > 0) {
        const mapped = dbBrands.map(b => ({ id: b.id, name: b.name, active: b.active, logo: b.logo || null, website: b.website || '' }));
        brandLoadedFromDb.current = true;
        queueMicrotask(() => setBrands(mapped));
      }
      const { data: dbWm } = await supabase.from('watermarks').select('*').eq('user_id', user.id);
      if (dbWm?.length > 0) {
        const mapped = dbWm.map(w => ({ id: w.id, name: w.name, wmType: w.wm_type, image: w.image || null, text: w.text || '', font: w.font || '', scale: w.scale ?? 100, transparency: w.transparency ?? 50, position: w.position || 'mitte', tileSpacing: w.tile_spacing ?? 120, tileSize: w.tile_size ?? 60 }));
        wmLoadedFromDb.current = true;
        queueMicrotask(() => setWatermarks(mapped));
      }
    })();
  }, [user]);

  // ── Sync brands to Supabase (debounced) ──
  const brandSyncTimer = useRef(null);
  const brandSyncSkip = useRef(true);
  const prevBrandWebsites = useRef({});
  useEffect(() => {
    if (brandSyncSkip.current) { brandSyncSkip.current = false; return; }
    if (!user) return;
    if (brandSyncTimer.current) clearTimeout(brandSyncTimer.current);
    brandSyncTimer.current = setTimeout(async () => {
      try {
        // Detect domain changes before sync
        for (const b of brands) {
          const oldWebsite = prevBrandWebsites.current[b.name] || '';
          const newWebsite = b.website || '';
          if (newWebsite && newWebsite !== oldWebsite) {
            // Domain changed → notify admin
            try {
              await supabase.from('domain_notifications').insert({
                user_id: user.id,
                user_email: user.email,
                brand_name: b.name,
                old_domain: oldWebsite || null,
                new_domain: newWebsite,
              });
              console.log(`[Domain] Notification sent: ${b.name} → ${newWebsite}`);
            } catch (notifyErr) {
              console.warn('[Domain] Notification insert failed:', notifyErr);
            }
          }
        }
        // Update prev websites cache
        prevBrandWebsites.current = brands.reduce((acc, b) => ({ ...acc, [b.name]: b.website || '' }), {});

        await supabase.from('brands').delete().eq('user_id', user.id);
        if (brands.length > 0) {
          await supabase.from('brands').insert(brands.map(b => ({
            user_id: user.id, name: b.name, active: b.active !== false,
            logo: b.logo || null, website: b.website || null,
          })));
        }
      } catch (err) { console.error('[Settings] Brand sync error:', err); }
    }, 1500);
  }, [brands]);

  // ── Sync watermarks to Supabase (debounced) ──
  const wmSyncTimer = useRef(null);
  const wmSyncSkip = useRef(true);
  useEffect(() => {
    if (wmSyncSkip.current) { wmSyncSkip.current = false; return; }
    if (!user) return;
    if (wmSyncTimer.current) clearTimeout(wmSyncTimer.current);
    wmSyncTimer.current = setTimeout(async () => {
      try {
        await supabase.from('watermarks').delete().eq('user_id', user.id);
        if (watermarks.length > 0) {
          await supabase.from('watermarks').insert(watermarks.map(w => ({
            user_id: user.id, name: w.name, wm_type: w.wmType || 'image',
            position: w.position || 'mitte',
            image: w.image || null, text: w.text || '', font: w.font || '',
            scale: w.scale ?? 100, transparency: w.transparency ?? 50,
            tile_spacing: w.tileSpacing ?? 120, tile_size: w.tileSize ?? 60,
          })));
        }
      } catch (err) { console.error('[Settings] Watermark sync error:', err); }
    }, 1500);
  }, [watermarks]);

  const [modalType, setModalType] = useState(null);
  const [modalData, setModalData] = useState({});
  const [brandSettingsBrand, setBrandSettingsBrand] = useState(null);
  const { globalBrand } = useBrand();
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
  const openAddBrand = () => { setModalType('add-brand'); setModalData({ name: '', image: null, website: '' }); };
  const openEditBrand = (b) => { setBrandSettingsBrand(b); };
  const openAddWm = () => { setModalType('add-wm-chooser'); setModalData({}); };
  const openEditWm = (wm) => { setModalType('edit-wm'); setModalData({ ...wm }); };

  const saveBrand = () => {
    if (!modalData.name?.trim()) return;
    if (modalType === 'add-brand') {
      const newBrand = { id: Date.now(), name: modalData.name.trim(), active: true, logo: null, website: modalData.website?.trim() || '' };
      setBrands(prev => [...prev, newBrand]);
      setModalType(null);
      // Auto-open Markeneinstellungen after creating
      setTimeout(() => setBrandSettingsBrand(newBrand), 100);
    } else {
      setBrands(prev => prev.map(b => b.id === modalData.id ? { ...b, name: modalData.name, website: modalData.website?.trim() || '' } : b));
      setModalType(null);
    }
  };

  // ── Save watermark ──
  const saveWatermark = () => {
    if (!modalData.name?.trim()) return;
    const trimmedName = modalData.name.trim();
    // Prevent duplicate names
    const isNew = modalType === 'add-wm-image' || modalType === 'add-wm-text' || modalType === 'add-wm-tile';
    const duplicate = watermarks.find(w => w.name === trimmedName && (isNew || w.id !== modalData.id));
    if (duplicate) {
      alert(`Ein Wasserzeichen mit dem Namen "${trimmedName}" existiert bereits. Bitte wähle einen anderen Namen.`);
      return;
    }
    const wmData = {
      name: trimmedName,
      wmType: modalData.wmType || 'image',
      image: modalData.image || null,
      text: modalData.text || '',
      font: modalData.font || 'Open Sans, 64px, weiß',
      scale: modalData.scale ?? 100,
      transparency: modalData.transparency ?? 50,
      position: modalData.position || 'mitte',
      tileSpacing: modalData.tileSpacing ?? 120,
      tileSize: modalData.tileSize ?? 60,
    };
    if (isNew) {
      wmData.wmType = modalType === 'add-wm-image' ? 'image' : modalType === 'add-wm-tile' ? 'tile' : 'text';
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
                {wm.wmType === 'tile' && wm.image ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#f0f0f0', overflow: 'hidden' }}>
                    {[...Array(9)].map((_, i) => (
                      <img key={i} src={wm.image} alt="" style={{ width: 22, height: 22, objectFit: 'contain', position: 'absolute', opacity: 0.5, top: `${Math.floor(i / 3) * 35 + (i % 2 ? 12 : 0)}%`, left: `${(i % 3) * 35 + (Math.floor(i / 3) % 2 ? 12 : 0)}%` }} />
                    ))}
                  </div>
                ) : wm.image ? (
                  <img src={wm.image} alt={wm.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : wm.wmType === 'text' ? (
                  <span className="watermark-label" style={{ fontSize: 13, textAlign: 'center' }}>{wm.text || wm.name}</span>
                ) : wm.wmType === 'tile' ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa', gap: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '12px 12px 12px', gap: 6, opacity: 0.4 }}>
                      {[...Array(9)].map((_, i) => <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: '#666' }} />)}
                    </div>
                    <span style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Kachel</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
                    <ImageIcon size={28} style={{ color: '#bbb' }} />
                    <span style={{ fontSize: 10, color: '#999', marginTop: 4 }}>Bild hochladen</span>
                  </div>
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
          <div style={{ ...modalWrap, maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>Wasserzeichen hinzufügen</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={{ ...modalBody, padding: '2rem' }}>
              <p style={{ color: '#666', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Wähle den Wasserzeichen-Typ:</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                {/* Bild-Wasserzeichen Card */}
                <div
                  onClick={() => { setModalType('add-wm-image'); setModalData({ name: '', wmType: 'image', image: null, scale: 100, transparency: 50, position: 'mitte' }); }}
                  style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb', transition: 'all 0.2s', background: '#fff' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#528c68'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(82,140,104,0.15)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #2d3436, #636e72)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <ImageIcon size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <div style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 10, color: '#fff', backdropFilter: 'blur(4px)' }}>PNG / SVG</div>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>Bild</div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>Logo oder Grafik</div>
                  </div>
                </div>
                {/* Text-Wasserzeichen Card */}
                <div
                  onClick={() => { setModalType('add-wm-text'); setModalData({ name: '', wmType: 'text', text: '', font: 'Open Sans, 64px, weiß', scale: 100, transparency: 50, position: 'mitte' }); }}
                  style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb', transition: 'all 0.2s', background: '#fff' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#528c68'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(82,140,104,0.15)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #2d3436, #636e72)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, fontWeight: 700, fontFamily: "'Open Sans', sans-serif", letterSpacing: 2, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>© WATERMARK</span>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>Text</div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>Eigener Schriftzug</div>
                  </div>
                </div>
                {/* Kachel-Wasserzeichen Card */}
                <div
                  onClick={() => { setModalType('add-wm-tile'); setModalData({ name: '', wmType: 'tile', image: null, scale: 60, transparency: 50, tileSpacing: 120, tileSize: 60 }); }}
                  style={{ cursor: 'pointer', borderRadius: 12, overflow: 'hidden', border: '2px solid #e5e7eb', transition: 'all 0.2s', background: '#fff' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#528c68'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(82,140,104,0.15)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ height: 140, background: 'linear-gradient(135deg, #2d3436, #636e72)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {[...Array(12)].map((_, i) => (
                      <span key={i} style={{ position: 'absolute', fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, transform: 'rotate(-25deg)', top: `${Math.floor(i / 4) * 38 + (i % 2 ? 18 : 0)}%`, left: `${(i % 4) * 28 + (Math.floor(i / 4) % 2 ? 14 : 0)}%` }}>©</span>
                    ))}
                  </div>
                  <div style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1f2937' }}>Kachel-Muster</div>
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 2 }}>Wiederholendes Muster</div>
                  </div>
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
                <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  Website / Domain
                  <span title="Trage hier deine Firmen-Website ein (z.B. muellerfoto.ch).&#10;Daraus wird automatisch deine Galerie-Domain abgeleitet: galerie.muellerfoto.ch&#10;&#10;DNS-Anleitung:&#10;Setze bei deinem Domain-Anbieter einen CNAME-Eintrag:&#10;galerie.deinedomain.ch → CNAME → galerie.fotohahn.ch" style={{ cursor: 'help', color: '#aaa' }}><HelpCircle size={13} /></span>
                </label>
                <input className="form-input-st" placeholder="z.B. muellerfoto.ch" value={modalData.website || ''} onChange={e => setModalData(p => ({ ...p, website: e.target.value }))} />
                {modalData.website && (
                  <p style={{ fontSize: '0.8rem', color: '#528c68', marginTop: '0.35rem' }}>🌐 Galerie-Domain: <strong>galerie.{modalData.website.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '')}</strong></p>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem', fontStyle: 'italic' }}>Nach dem Speichern kannst du Logos, Kontaktdaten und Social Media in den Markeneinstellungen ergänzen.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={saveBrand} style={greenBtn}>Speichern & Einrichten</button>
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
                    const opacityVal = (modalData.transparency ?? 50) / 100;
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Deckkraft</span><span>{modalData.transparency ?? 50}%</span></div>
                  <input type="range" min="5" max="100" value={modalData.transparency ?? 50} onChange={e => setModalData(p => ({ ...p, transparency: +e.target.value }))} style={{ width: '100%', accentColor: '#5a8a5c' }} />
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

      {/* ── Watermark Tile/Pattern Modal (Add/Edit) ── */}
      {((modalType === 'edit-wm' && modalData.wmType === 'tile') || modalType === 'add-wm-tile') && (
        <div style={overlayStyle} onClick={closeModal}>
          <div style={{ ...modalWrap, maxWidth: 750 }} onClick={e => e.stopPropagation()}>
            <div style={greenHeader}><span>Kachel-Wasserzeichen bearbeiten</span><X size={20} style={{ cursor: 'pointer' }} onClick={closeModal} /></div>
            <div style={{ ...modalBody, display: 'flex', gap: '2rem' }}>
              {/* Left: Tile Preview */}
              <div style={{ flex: '0 0 300px' }}>
                <div style={{ width: 300, height: 220, borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', position: 'relative', background: '#f5f5f5' }}>
                  <img src="/watermark-sample-bg.png" alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Tile pattern overlay */}
                  {modalData.image && (() => {
                    const spacing = modalData.tileSpacing ?? 120;
                    const size = modalData.tileSize ?? 60;
                    const opacityVal = (modalData.transparency ?? 50) / 100;
                    const tiles = [];
                    for (let row = -1; row < Math.ceil(220 / spacing) + 1; row++) {
                      for (let col = -1; col < Math.ceil(300 / spacing) + 1; col++) {
                        const x = col * spacing + (row % 2 ? spacing / 2 : 0);
                        const y = row * spacing;
                        tiles.push(
                          <img key={`${row}-${col}`} src={modalData.image} alt="" style={{ position: 'absolute', width: size, height: size, objectFit: 'contain', left: x, top: y, opacity: opacityVal, transform: 'rotate(-15deg)' }} />
                        );
                      }
                    }
                    return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{tiles}</div>;
                  })()}
                </div>
                <button className="file-upload-btn" onClick={() => modalFileRef.current?.click()} style={{ width: '100%', marginTop: '0.5rem' }}>
                  Emblem / Logo hochladen <ImageIcon size={14} />
                </button>
              </div>
              {/* Right: Controls */}
              <div style={{ flex: 1 }}>
                <div className="form-group-st"><label style={{ fontWeight: 600 }}>Name</label><input className="form-input-st" value={modalData.name || ''} onChange={e => setModalData(p => ({ ...p, name: e.target.value }))} /></div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Emblem-Grösse</span><span>{modalData.tileSize ?? 60}px</span></div>
                  <input type="range" min="20" max="120" value={modalData.tileSize ?? 60} onChange={e => setModalData(p => ({ ...p, tileSize: +e.target.value }))} style={{ width: '100%', accentColor: '#4a7c9b' }} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Abstand</span><span>{modalData.tileSpacing ?? 120}px</span></div>
                  <input type="range" min="40" max="200" value={modalData.tileSpacing ?? 120} onChange={e => setModalData(p => ({ ...p, tileSpacing: +e.target.value }))} style={{ width: '100%', accentColor: '#4a7c9b' }} />
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Deckkraft</span><span>{modalData.transparency ?? 50}%</span></div>
                  <input type="range" min="5" max="100" value={modalData.transparency ?? 50} onChange={e => setModalData(p => ({ ...p, transparency: +e.target.value }))} style={{ width: '100%', accentColor: '#4a7c9b' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button onClick={saveWatermark} style={{ ...greenBtn, background: 'linear-gradient(135deg, #4a7c9b, #3a6a87)' }}>Speichern</button>
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
                <div style={{ width: 280, height: 200, background: '#444', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                  {modalData.image && <img src={modalData.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />}
                  {(() => {
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
                    const fontStr = modalData.font || 'Open Sans, 64px, weiß';
                    const [fontName, fontSizeStr] = fontStr.split(',').map(s => s.trim());
                    const fontPx = parseInt(fontSizeStr) || 64;
                    // Scale: 64px → 20px, 48px → 15px, 32px → 10px in preview
                    const previewFontSize = Math.round(fontPx * 0.31);
                    const fontColor = fontStr.includes('schwarz') ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
                    return (
                      <span style={{ position: 'absolute', color: fontColor, fontFamily: `'${fontName}', sans-serif`, fontSize: previewFontSize, fontWeight: 700, textAlign: 'center', textShadow: '0 2px 8px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', opacity: (modalData.transparency ?? 50) / 100, transition: 'all 0.15s', ...posMap[pos] }}>
                        {modalData.text || 'Mein Wasserzeichen'}
                      </span>
                    );
                  })()}
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
                <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span>Deckkraft</span><span>{modalData.transparency ?? 50}%</span></div>
                  <input type="range" min={5} max={100} value={modalData.transparency ?? 50} onChange={e => setModalData(p => ({ ...p, transparency: Number(e.target.value) }))} style={{ width: '100%', accentColor: '#5a8a5c' }} />
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
          onSave={() => { /* save handled inside modal, don't close */ }}
          setBrands={setBrands}
        />
      )}
    </div>
  );
};

// No default presets - start fresh
const defaultPresets = [];


const VoreinstellungenTab = () => {
  const { user } = useAuth();
  const [presets, setPresets] = useState(defaultPresets);
  const { globalBrand, brands } = useBrand();
  const [watermarks] = useWatermarks();
  const [mitteilungen] = useSupabaseSetting('settings_mitteilungen', []);
  const mittList = Array.isArray(mitteilungen) ? mitteilungen : [];

  // ── Load presets from Supabase on mount ──
  const presetsLoadedRef = useRef(false);
  useEffect(() => {
    if (!user || presetsLoadedRef.current) return;
    presetsLoadedRef.current = true;
    (async () => {
      const { data: dbPresets } = await supabase.from('presets').select('*').eq('user_id', user.id);
      if (dbPresets?.length > 0) {
        setPresets(dbPresets.map(p => ({
          id: p.id, name: p.name, standard: p.is_default,
          ...(p.settings || {}), ...(p.design || {}), ...(p.tracking || {}),
          alben: p.albums || [],
        })));
      }
    })();
  }, [user]);

  // ── Sync presets to Supabase (debounced) ──
  const presetSyncTimer = useRef(null);
  const presetSyncSkip = useRef(true);
  useEffect(() => {
    if (presetSyncSkip.current) { presetSyncSkip.current = false; return; }
    if (!user) return;
    if (presetSyncTimer.current) clearTimeout(presetSyncTimer.current);
    presetSyncTimer.current = setTimeout(async () => {
      try {
        await supabase.from('presets').delete().eq('user_id', user.id);
        if (presets.length > 0) {
          await supabase.from('presets').insert(presets.map(p => ({
            user_id: user.id, name: p.name, is_default: p.standard || false,
            settings: { marke: p.marke, domain: p.domain, wasserzeichen: p.wasserzeichen, sprache: p.sprache, mitteilung: p.mitteilung, sortierung: p.sortierung, ablauf: p.ablauf, tags: p.tags, download: p.download, downloadPin: p.downloadPin, appHinweis: p.appHinweis, teilen: p.teilen, kommentar: p.kommentar, zeigeDateinamen: p.zeigeDateinamen },
            design: { vorlage: p.vorlage, schriftart: p.schriftart, primaerfarbe: p.primaerfarbe, sekundaerfarbe: p.sekundaerfarbe, bildabstand: p.bildabstand, bilddarstellung: p.bilddarstellung },
            tracking: { gaCode: p.gaCode, gtmId: p.gtmId, fbPixel: p.fbPixel },
            albums: p.alben || [],
          })));
        }
      } catch (err) { console.error('[Settings] Preset sync error:', err); }
    }, 1500);
  }, [presets]);
  const [modal, setModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);

  const handleDelete = (idx) => setPresets(prev => prev.filter((_, i) => i !== idx));
  const handleSetStandard = (idx) => setPresets(prev => prev.map((p, i) => ({ ...p, standard: i === idx ? !p.standard : false })));

  const openEdit = (idx) => {
    const p = presets[idx];
    setDetailModal({
      idx, activeTab: 'einstellungen',
      name: p.name, marke: p.marke || '', domain: p.domain || '',
      wasserzeichen: p.wasserzeichen || '', sprache: p.sprache || 'Deutsch',
      mitteilung: p.mitteilung || '', sortierung: p.sortierung || 'Uploaddatum',
      ablauf: p.ablauf || '', tags: p.tags || '',
      download: p.download !== false, downloadPin: p.downloadPin || false,
      appHinweis: p.appHinweis !== false, teilen: p.teilen !== false,
      kommentar: p.kommentar !== false, zeigeDateinamen: p.zeigeDateinamen || false,

      // Design
      vorlage: p.vorlage || 'Atelier', schriftart: p.schriftart || 'Inter', primaerfarbe: p.primaerfarbe || '#f0f0f4',
      sekundaerfarbe: p.sekundaerfarbe || '#1a1a1a', bildabstand: p.bildabstand || 'Klein', bilddarstellung: p.bilddarstellung || 'Standard',

      // Tracking
      gaCode: p.gaCode || '', gtmId: p.gtmId || '', fbPixel: p.fbPixel || '',
      // Alben
      alben: p.alben || [],
    });
  };

  const openAdd = () => setModal({ type: 'add', name: '' });

  const handleAddSave = () => {
    if (!modal || !modal.name.trim()) return;
    const nameExists = presets.some(p => p.name.toLowerCase() === modal.name.trim().toLowerCase());
    if (nameExists) { alert('Eine Voreinstellung mit diesem Namen existiert bereits.'); return; }
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
  const displayName = (name) => globalBrand.firmenname ? name.replace(/fotohahn/gi, globalBrand.firmenname) : name;

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
                {p.standard ? <span className="preset-check active" style={{ cursor: 'pointer' }} onClick={() => handleSetStandard(i)}><Check size={14} /></span> : <Circle size={14} style={{ color: '#ccc', cursor: 'pointer' }} onClick={() => handleSetStandard(i)} />}
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
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <Edit3 size={16} style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => {
                  const input = document.getElementById('preset-name-input');
                  if (input) { input.style.display = 'inline-block'; input.focus(); input.select(); }
                }} title="Name ändern" />
                <span style={{ fontWeight: 500 }}>{displayName(detailModal.name)}</span>
                <input
                  id="preset-name-input"
                  style={{ display: 'none', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, color: '#fff', padding: '2px 8px', fontSize: '0.9rem', fontWeight: 500, width: '60%' }}
                  defaultValue={detailModal.name}
                  onBlur={e => { const v = e.target.value.trim(); if (v) ud('name', v); e.target.style.display = 'none'; }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.target.style.display = 'none'; } }}
                />
              </span>
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
                        <option value="">Wähle eine Standard Marke</option>
                        {brands.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                        {brands.length === 0 && <option value="">Keine Marken vorhanden</option>}
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standard Domain</label>
                      <select className="form-input-st" value={detailModal.domain} onChange={e => ud('domain', e.target.value)}>
                        <option value="">Domain wählen</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle ein Standard Wasserzeichen</label>
                      <select className="form-input-st" value={detailModal.wasserzeichen} onChange={e => ud('wasserzeichen', e.target.value)}>
                        <option value="">Wähle ein Standard Wasserzeichen</option>
                        {watermarks.map((w, i) => <option key={i} value={w.name}>{w.name}</option>)}
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Wähle eine Standard Sprache</label>
                      <select className="form-input-st" value={detailModal.sprache} onChange={e => ud('sprache', e.target.value)}>
                        <option>Deutsch</option><option>English</option><option>Français</option><option>Italiano</option>
                      </select></div>
                    <div style={{ marginBottom: '0.75rem' }}><label style={labelSt}>Mitteilung</label>
                      <select className="form-input-st" value={detailModal.mitteilung} onChange={e => ud('mitteilung', e.target.value)}>
                        <option value="">Keine Mitteilung</option>
                        {mittList.map((m, i) => <option key={i} value={m.titel}>{m.titel}</option>)}
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
              {detailModal.activeTab === 'design' && (() => {
                const PRESET_TEMPLATES = [
                  { id: 'atelier', name: 'Atelier', primaryColor: '#f0f0f4', secondaryColor: '#1a1a1a', font: 'Inter', spacing: 'Klein', display: 'Standard' },
                  { id: 'dark-shark', name: 'Dark Shark', primaryColor: '#1a1a2e', secondaryColor: '#e8d5b7', font: 'Josefin Sans', spacing: 'Klein', display: 'Standard' },
                  { id: 'lazy-r', name: 'Lazy R', primaryColor: '#f5f0eb', secondaryColor: '#2d4a3e', font: 'Playfair Display', spacing: 'Mittel', display: 'Standard' },
                  { id: 'luminance', name: 'Luminance', primaryColor: '#1a0a10', secondaryColor: '#d4a0a0', font: 'Cormorant Garamond', spacing: 'Klein', display: 'Standard' },
                  { id: 'noir-classique', name: 'Noir Classique', primaryColor: '#111111', secondaryColor: '#ffffff', font: 'Montserrat', spacing: 'Mittel', display: 'Kacheln' },
                ];
                const PRESET_FONTS = ['Inter', 'Josefin Sans', 'Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Lora', 'Raleway', 'Outfit', 'DM Serif Display', 'Libre Baskerville'];
                const applyPresetTemplate = (name) => {
                  const tmpl = PRESET_TEMPLATES.find(t => t.name === name);
                  if (!tmpl) { ud('vorlage', name); return; }
                  ud('vorlage', name);
                  ud('primaerfarbe', tmpl.primaryColor);
                  ud('sekundaerfarbe', tmpl.secondaryColor);
                  ud('schriftart', tmpl.font);
                  ud('bildabstand', tmpl.spacing);
                  ud('bilddarstellung', tmpl.display);
                };
                const resetPresetField = (field) => {
                  const tmpl = PRESET_TEMPLATES.find(t => t.name === detailModal.vorlage) || PRESET_TEMPLATES[0];
                  if (field === 'primaerfarbe') ud('primaerfarbe', tmpl.primaryColor);
                  if (field === 'sekundaerfarbe') ud('sekundaerfarbe', tmpl.secondaryColor);
                  if (field === 'schriftart') ud('schriftart', tmpl.font);
                  if (field === 'bildabstand') ud('bildabstand', tmpl.spacing);
                  if (field === 'bilddarstellung') ud('bilddarstellung', tmpl.display);
                };
                return (
                <div className="design-controls">
                  <div className="form-group">
                    <div className="form-label">Vorlagen</div>
                    <select className="form-select" style={{ background: '#fff', color: '#333' }} value={detailModal.vorlage} onChange={e => applyPresetTemplate(e.target.value)}>
                      {PRESET_TEMPLATES.map(t => (
                        <option key={t.id} value={t.name} style={{ background: '#fff', color: '#333' }}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="template-carousel">
                    <button className="carousel-arrow" onClick={() => { const vp = document.querySelector('.template-carousel-viewport'); if (vp) vp.scrollBy({ left: -180, behavior: 'smooth' }); }}>‹</button>
                    <div className="template-carousel-viewport">
                      <div className="template-carousel-track">
                        {PRESET_TEMPLATES.map((t) => (
                          <div
                            key={t.id}
                            className={`template-thumb ${detailModal.vorlage === t.name ? 'active' : ''}`}
                            onClick={() => applyPresetTemplate(t.name)}
                            style={{ background: t.primaryColor, color: t.secondaryColor, border: detailModal.vorlage === t.name ? '2px solid var(--color-primary)' : '2px solid transparent' }}
                          >
                            <span className="template-thumb-label">{t.name.toUpperCase()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button className="carousel-arrow" onClick={() => { const vp = document.querySelector('.template-carousel-viewport'); if (vp) vp.scrollBy({ left: 180, behavior: 'smooth' }); }}>›</button>
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      Schriftart
                      <RotateCcw size={12} className="settings-icon reset-btn" onClick={() => resetPresetField('schriftart')} title="Zurücksetzen" />
                    </div>
                    <select className="form-select" value={detailModal.schriftart} onChange={e => ud('schriftart', e.target.value)} style={{ fontFamily: detailModal.schriftart }}>
                      {PRESET_FONTS.map(f => (
                        <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="color-picker-row">
                    <div className="color-field">
                      <label>
                        Primärfarbe
                        <RotateCcw size={10} className="reset-btn" onClick={() => resetPresetField('primaerfarbe')} title="Zurücksetzen" />
                      </label>
                      <div className="color-input-row">
                        <div className="color-swatch-wrapper">
                          <input type="color" value={detailModal.primaerfarbe || '#f0f0f4'} onChange={e => ud('primaerfarbe', e.target.value)} className="color-native-picker" />
                          <div className="color-swatch" style={{ background: detailModal.primaerfarbe || '#f0f0f4' }} />
                        </div>
                        <input className="form-input" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} value={detailModal.primaerfarbe || ''} onChange={e => ud('primaerfarbe', e.target.value)} />
                        <Edit3 size={12} className="settings-icon" />
                      </div>
                    </div>
                    <div className="color-field">
                      <label>
                        Sekundärfarbe
                        <RotateCcw size={10} className="reset-btn" onClick={() => resetPresetField('sekundaerfarbe')} title="Zurücksetzen" />
                      </label>
                      <div className="color-input-row">
                        <div className="color-swatch-wrapper">
                          <input type="color" value={detailModal.sekundaerfarbe || '#1a1a1a'} onChange={e => ud('sekundaerfarbe', e.target.value)} className="color-native-picker" />
                          <div className="color-swatch" style={{ background: detailModal.sekundaerfarbe || '#1a1a1a' }} />
                        </div>
                        <input className="form-input" style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }} value={detailModal.sekundaerfarbe || ''} onChange={e => ud('sekundaerfarbe', e.target.value)} />
                        <Edit3 size={12} className="settings-icon" />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <div className="form-label">
                      Bildabstand
                      <RotateCcw size={12} className="settings-icon reset-btn" onClick={() => resetPresetField('bildabstand')} title="Zurücksetzen" />
                    </div>
                    <select className="form-select" value={detailModal.bildabstand} onChange={e => ud('bildabstand', e.target.value)}>
                      <option value="Klein">Klein</option>
                      <option value="Mittel">Mittel</option>
                      <option value="Gross">Groß</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <div className="form-label">Bilddarstellung</div>
                    <select className="form-select" value={detailModal.bilddarstellung} onChange={e => ud('bilddarstellung', e.target.value)}>
                      <option value="Standard">Standard</option>
                      <option value="Kacheln">Kacheln</option>
                    </select>
                  </div>
                </div>
                );
              })()}

              {/* ── Tab: Alben ── */}
              {detailModal.activeTab === 'alben' && (
                <div>
                  <div onClick={() => { const name = prompt('Album-Name eingeben:'); if (name && name.trim()) ud('alben', [...(detailModal.alben || []), name.trim()]); }} style={{ border: '2px dashed #4a7c59', borderRadius: 8, padding: '1.5rem', textAlign: 'center', cursor: 'pointer', color: '#4a7c59', fontSize: '0.9rem', fontWeight: 500 }}>
                    <Plus size={16} style={{ marginRight: 6 }} />Album hinzufügen
                  </div>
                  {(detailModal.alben || []).length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      {detailModal.alben.map((a, i) => (
                        <div key={i}
                          draggable
                          onDragStart={e => { e.dataTransfer.setData('albumIdx', String(i)); e.currentTarget.style.opacity = '0.5'; }}
                          onDragEnd={e => { e.currentTarget.style.opacity = '1'; }}
                          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#4a7c59'; }}
                          onDragLeave={e => { e.currentTarget.style.borderColor = '#eee'; }}
                          onDrop={e => {
                            e.preventDefault();
                            e.currentTarget.style.borderColor = '#eee';
                            const from = Number(e.dataTransfer.getData('albumIdx'));
                            if (from === i) return;
                            const arr = [...(detailModal.alben || [])];
                            const [moved] = arr.splice(from, 1);
                            arr.splice(i, 0, moved);
                            ud('alben', arr);
                          }}
                          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eee', borderRadius: 6, marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab', transition: 'border-color 0.2s' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <GripVertical size={14} style={{ color: '#bbb', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.85rem' }}>{a}</span>
                          </div>
                          <Trash2 size={14} style={{ color: '#888', cursor: 'pointer', flexShrink: 0 }} onClick={() => ud('alben', detailModal.alben.filter((_, j) => j !== i))} />
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
  const [steuerData, setSteuerData] = useSupabaseSetting('settings_steuer', {
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
const EMPTY_MITTEILUNG = { titel: '', mitteilung: '', bild: null, bildName: '', buttontext: '', buttonaktion: '', werSoll: 'Alle', wannAnzeigen: '0', wieOftAnzeigen: '1', anzeigenBis: '', aktiv: false };

const MitteilungenTab = () => {
  const [mittList, setMittList] = useSupabaseSetting('settings_mitteilungen', []);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const bildInputRef = useRef(null);

  // Auto-migrate old single-object format → array
  useEffect(() => {
    if (mittList && !Array.isArray(mittList) && typeof mittList === 'object' && mittList.titel !== undefined) {
      setMittList([mittList]);
    }
  }, [mittList, setMittList]);

  const list = Array.isArray(mittList) ? mittList : [];
  const current = list[selectedIdx] || EMPTY_MITTEILUNG;

  const updateField = (field, value) => {
    setMittList(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      if (!arr[selectedIdx]) return prev;
      arr[selectedIdx] = { ...arr[selectedIdx], [field]: value };
      return arr;
    });
  };

  const addNew = () => {
    setMittList(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      return [...arr, { ...EMPTY_MITTEILUNG, titel: `Mitteilung ${arr.length + 1}` }];
    });
    setTimeout(() => setSelectedIdx(list.length), 50);
  };

  const deleteCurrent = () => {
    if (list.length === 0) return;
    setMittList(prev => {
      const arr = Array.isArray(prev) ? [...prev] : [];
      return arr.filter((_, i) => i !== selectedIdx);
    });
    setSelectedIdx(Math.max(0, selectedIdx - 1));
  };

  const handleBildUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateField('bild', ev.target.result);
        updateField('bildName', file.name);
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
            <button className="btn-primary-sm" onClick={addNew}>Neu</button>
            <button className="icon-btn" onClick={deleteCurrent} disabled={list.length === 0}><Trash2 size={14} /></button>
          </div>
        </div>
        {list.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem' }}>
            {list.map((m, i) => (
              <button key={i} className={i === selectedIdx ? 'btn-primary-sm' : 'btn-outline-sm'} onClick={() => setSelectedIdx(i)} style={{ fontSize: '0.8rem' }}>
                {m.titel || `#${i + 1}`}
              </button>
            ))}
          </div>
        )}
        {list.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Noch keine Mitteilungen erstellt.</p>
            <button className="btn-primary-sm" onClick={addNew}>Erste Mitteilung erstellen</button>
          </div>
        ) : (
          <>
            <div className="form-group-st"><label>Titel</label><input className="form-input-st" value={current.titel} onChange={e => updateField('titel', e.target.value)} /></div>
            <div className="form-group-st"><label>Mitteilung</label><input className="form-input-st" value={current.mitteilung} onChange={e => updateField('mitteilung', e.target.value)} /></div>
            <div className="form-group-st">
              <label>Bild</label>
              <input ref={bildInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBildUpload} />
              <button className="file-upload-btn" onClick={() => bildInputRef.current?.click()}>
                {current.bildName || 'Datei auswählen...'} <ImageIcon size={14} />
              </button>
            </div>
            <div className="form-group-st"><label>Buttontext</label><input className="form-input-st" value={current.buttontext} onChange={e => updateField('buttontext', e.target.value)} /></div>
            <div className="form-group-st">
              <label>Buttonaktion</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="text-muted text-sm">https://</span>
                <input className="form-input-st" value={current.buttonaktion} onChange={e => updateField('buttonaktion', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group-st">
              <label>Wer soll die Mitteilung sehen?</label>
              <select className="form-input-st" value={current.werSoll} onChange={e => updateField('werSoll', e.target.value)}><option>Alle</option><option>Hauptkunde</option></select>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <div className="form-group-st" style={{ flex: 1 }}>
                <label>Wann anzeigen?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input className="form-input-st" value={current.wannAnzeigen} onChange={e => updateField('wannAnzeigen', e.target.value)} style={{ width: 50 }} />
                  <span className="badge-outline">Galerieaufrufen</span>
                </div>
              </div>
              <div className="form-group-st" style={{ flex: 1 }}>
                <label>Wie oft anzeigen?</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input className="form-input-st" value={current.wieOftAnzeigen} onChange={e => updateField('wieOftAnzeigen', e.target.value)} style={{ width: 50 }} />
                  <span className="badge-outline">Mal</span>
                </div>
              </div>
            </div>
            <div className="form-group-st">
              <label>Mitteilung anzeigen bis</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input-st" placeholder="Bitte Datum auswählen" type="date" value={current.anzeigenBis} onChange={e => updateField('anzeigenBis', e.target.value)} />
              </div>
            </div>
            <button
              onClick={() => updateField('aktiv', !current.aktiv)}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                padding: '0.75rem',
                border: 'none',
                borderRadius: 8,
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: current.aktiv ? '#dc3545' : '#528c68',
                color: '#fff',
                transition: 'background 0.2s',
              }}
            >
              {current.aktiv ? 'Mitteilung deaktivieren' : 'Mitteilung aktivieren'}
            </button>
          </>
        )}
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
                <p>{current.mitteilung}</p>
                {current.bild && <img src={current.bild} alt="Mitteilung" style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />}
                {current.buttontext && <button className="phone-btn-dark">{current.buttontext}</button>}
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
  const { brands } = useBrand();
  const [impressumList, setImpressumList] = useSupabaseSetting('settings_impressum_v2', []);
  const [datenschutzList, setDatenschutzList] = useSupabaseSetting('settings_datenschutz_v2', []);
  const [legalModal, setLegalModal] = useState(null); // { type: 'impressum'|'datenschutz', mode: 'add'|'edit', data: {...} }

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

  // Derive domains from ALL brands with a website
  const { globalBrand } = useBrand();
  const derivedDomains = (brands || [])
    .map(b => {
      const rawWebsite = b.website || globalBrand?.webseite || '';
      const cleanHost = rawWebsite.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '');
      return cleanHost ? { brandName: b.name, domain: `galerie.${cleanHost}` } : null;
    })
    .filter(Boolean);

  return (
    <div>
      <div className="settings-section">
        <div className="settings-section-header"><h3>Eigene Domains</h3></div>
        <div style={{ padding: '1rem 0' }}>
          {derivedDomains.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {derivedDomains.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 1rem', background: '#f9f9f9', borderRadius: 8, border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>🌐 {d.domain}</span>
                    <span style={{ fontSize: '0.75rem', color: '#888', background: '#f0f0f0', padding: '2px 8px', borderRadius: 4 }}>Marke: {d.brandName}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#666', lineHeight: 1.6 }}>
                    <strong>DNS-Eintrag:</strong>{' '}
                    <code style={{ background: '#e8e8e8', padding: '2px 6px', borderRadius: 3, fontSize: '0.8rem' }}>
                      {d.domain} → CNAME → galerie.fotohahn.ch
                    </code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#999', fontStyle: 'italic' }}>Bitte trage zuerst eine Website bei deiner Marke ein (Tab "Marken &amp; Wasserzeichen").</p>
          )}
        </div>
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
                <input className="form-input-st" placeholder="https://example.com/agb" value={legalModal.data.url} onChange={e => setLegalModal(prev => ({ ...prev, data: { ...prev.data, url: e.target.value } }))} />
              </div>
              <div className="form-group-st" style={{ marginTop: '0.75rem' }}>
                <label style={{ fontWeight: 600 }}>{legalModal.type === 'impressum' ? 'Impressum' : 'Datenschutz'} <HelpCircle size={13} style={{ color: '#aaa' }} /></label>
                <textarea className="form-input-st" rows={3} placeholder={legalModal.type === 'impressum' ? 'https://example.com/impressum' : 'https://example.com/datenschutz'} value={legalModal.data.content} onChange={e => setLegalModal(prev => ({ ...prev, data: { ...prev.data, content: e.target.value } }))} style={{ resize: 'vertical' }} />
              </div>
              <button onClick={saveLegal} style={{ ...greenBtn, width: '100%', marginTop: '1rem', padding: '0.65rem' }}>
                {typeLabel} bearbeiten
              </button>

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
    </div>
  );
};


/* ——— Tab: Sprache ——— */
const SpracheTab = () => {
  const [sprache, setSprache] = useSupabaseSetting('settings_sprache', 'Deutsch');
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
  const [activeTab, setActiveTab] = useState('marken');

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
