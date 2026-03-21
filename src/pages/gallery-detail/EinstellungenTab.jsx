import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, X, Check, Info, Eye, EyeOff } from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useWatermarks } from '../../hooks/useWatermarks';
import { useSupabaseSetting } from '../../hooks/useSupabaseSetting';
import { useBrand } from '../../contexts/BrandContext';

const EinstellungenTab = ({ gallery, supabaseGallery, updateGallery }) => {
  const galleryKey = gallery?.title || 'default';
  const { globalBrand, brands } = useBrand();
  const [watermarks] = useWatermarks();
  const [presets] = usePersistedState('settings_presets', []);
  const [mitteilungen] = useSupabaseSetting('settings_mitteilungen', []);
  const mittList = Array.isArray(mitteilungen) ? mitteilungen : [];

  // ── Initialize from Supabase data ──
  const sbToggles = supabaseGallery?.toggles || {};
  const [toggles, setToggles] = useState({
    appHinweis: sbToggles.appHinweis !== undefined ? sbToggles.appHinweis : true,
    teilen: sbToggles.teilen !== undefined ? sbToggles.teilen : true,
    kommentarfunktion: sbToggles.kommentarfunktion !== undefined ? sbToggles.kommentarfunktion : false,
    dateienamen: sbToggles.dateienamen || false,
    download: sbToggles.download !== undefined ? sbToggles.download : true,
    downloadPin: sbToggles.downloadPin || false,
    wasserzeichen: !!sbToggles.wasserzeichen,
    selectedWatermarkId: sbToggles.selectedWatermarkId || '',
  });

  // Album-level toggles (still localStorage until BilderTab migration)
  const [albumToggles, setAlbumToggles] = usePersistedState(`gallery_${galleryKey}_albumToggles`, {});

  // Save toast
  const [showSaveToast, setShowSaveToast] = useState(false);
  const saveToastTimer = useRef(null);

  // Info popup for "Läuft ab am"
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const infoPopupTimer = useRef(null);

  const triggerSaveToast = () => {
    setShowSaveToast(true);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 3000);
  };

  // Auto-generate password if gallery has none
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 8; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    return pw;
  };

  const [formData, setFormData] = useState({
    titel: supabaseGallery?.title || gallery?.title || '',
    interneBezeichnung: supabaseGallery?.internal_name || '',
    shootingdatum: supabaseGallery?.shooting_date || '',
    ablaufdatum: supabaseGallery?.expiry_date || '',
    passwort: supabaseGallery?.password || generatePassword(),
    marke: supabaseGallery?.brand || '',
    sprache: supabaseGallery?.language || 'Deutsch',
    domain: supabaseGallery?.domain || '',
    domainpfad: supabaseGallery?.domain_path || supabaseGallery?.slug || '',
    mitteilung: supabaseGallery?.message || '',
    mitteilungSichtbarkeit: supabaseGallery?.message_visibility || 'Alle',
    downloadPinCode: supabaseGallery?.download_pin_code || '',
  });

  // Tags from Supabase
  const [tags, setTags] = useState(supabaseGallery?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // ── Sync changes to Supabase (debounced) ──
  const syncTimer = useRef(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    // Skip initial mount to avoid overwriting DB with default/empty values
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!supabaseGallery?.id) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await updateGallery(supabaseGallery.id, {
          title: formData.titel || supabaseGallery.title,
          slug: (formData.domainpfad || supabaseGallery.slug),
          internal_name: formData.interneBezeichnung || null,
          shooting_date: formData.shootingdatum || null,
          expiry_date: formData.ablaufdatum || null,
          password: formData.passwort || null,
          brand: formData.marke || null,
          language: formData.sprache || 'Deutsch',
          domain: formData.domain || null,
          domain_path: formData.domainpfad || null,
          message: formData.mitteilung || null,
          toggles,
          tags,
        });
      } catch (err) {
        console.error('[EinstellungenTab] Supabase sync error:', err);
      }
    }, 2000); // 2s debounce
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [formData, toggles, tags]);

  // Hauptkunden persisted state
  const [hauptkunden, setHauptkunden] = usePersistedState(`gallery_${galleryKey}_hauptkunden`, [
    { email: '', vorname: '', nachname: '', emailMarketing: false }
  ]);

  const addHauptkunde = () => {
    setHauptkunden(prev => [...prev, { email: '', vorname: '', nachname: '', emailMarketing: false }]);
  };

  const updateHauptkunde = (idx, field, value) => {
    setHauptkunden(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  const removeHauptkunde = (idx) => {
    setHauptkunden(prev => prev.filter((_, i) => i !== idx));
    triggerSaveToast();
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      triggerSaveToast();
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
    triggerSaveToast();
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const generatePin = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pin = '';
    for (let i = 0; i < 4; i++) pin += chars[Math.floor(Math.random() * chars.length)];
    return pin;
  };

  const toggle = (key) => {
    const newValue = !toggles[key];
    setToggles(prev => ({ ...prev, [key]: newValue }));

    // Generate random PIN when downloadPin is turned ON
    if (key === 'downloadPin' && newValue) {
      const pin = generatePin();
      setFormData(prev => ({ ...prev, downloadPinCode: pin }));
    }

    // Sync global toggle to all album toggles (both ON and OFF)
    if (key === 'download' || key === 'wasserzeichen') {
      try {
        const albumsKey = `gallery_${galleryKey}_albums`;
        const stored = localStorage.getItem(albumsKey);
        if (stored) {
          const albumList = JSON.parse(stored);
          setAlbumToggles(prev => {
            const updated = { ...prev };
            const toggleKey = key === 'wasserzeichen' ? 'watermark' : 'download';
            albumList.forEach((_, idx) => {
              updated[idx] = { ...(updated[idx] || {}), [toggleKey]: newValue };
            });
            return updated;
          });
        }
      } catch (e) {}
    }

    triggerSaveToast();
  };

  // Title change handler – updates formData directly (no localStorage sync needed)
  const handleTitleChange = (value) => {
    updateField('titel', value);
  };

  const handleTitleBlur = () => {
    // No-op – Supabase sync handles persistence via debounce
  };

  const updateField = (field, value) => {
    const updates = { [field]: value };
    // Auto-generate domainpfad from titel
    if (field === 'titel') {
      // Sanitize for URL: umlauts, special chars, clean hyphens
      const sanitized = value
        .toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '')  // remove special characters
        .replace(/\s+/g, '-')          // spaces to hyphens
        .replace(/-+/g, '-')           // collapse multiple hyphens
        .replace(/^-|-$/g, '');        // trim leading/trailing hyphens
      updates.domainpfad = sanitized;
    }
    setFormData(prev => ({ ...prev, ...updates }));
    triggerSaveToast();
  };

  const toggleItems = [
    { key: 'appHinweis', label: 'App Hinweis' },
    { key: 'teilen', label: 'Teilen' },
    { key: 'kommentarfunktion', label: 'Kommentarfunktion' },
    { key: 'dateienamen', label: 'Zeige Dateinamen' },
    { key: 'download', label: 'Download' },
    { key: 'downloadPin', label: 'Download PIN' },
  ];

  return (
    <div className="einstellungen-tab">
      {/* Save Toast */}
      {showSaveToast && (
        <div className="save-toast">
          <Check size={18} className="save-toast-icon" />
          <div>
            <strong>Erfolgreich</strong>
            <p>Gespeichert!</p>
          </div>
        </div>
      )}

      {/* Left Column - Form */}
      <div className="form-section">
        <div className="form-group">
          <div className="form-label">Titel <Settings size={14} className="settings-icon" /></div>
          <input className="form-input" value={formData.titel} onChange={e => handleTitleChange(e.target.value)} onBlur={handleTitleBlur} />
        </div>

        <div className="form-group">
          <div className="form-label">Interne Bezeichnung (optional) <Settings size={14} className="settings-icon" /></div>
          <input className="form-input" value={formData.interneBezeichnung} onChange={e => updateField('interneBezeichnung', e.target.value)} />
        </div>

        <div className="form-group">
          <div className="form-label">Shootingdatum</div>
          <input className="form-input" placeholder="Datum des Shootings" type="date" value={formData.shootingdatum} onChange={e => updateField('shootingdatum', e.target.value)} />
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <div className="form-label">
            Läuft ab am{' '}
            <Info
              size={14}
              className="settings-icon"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setShowInfoPopup(true);
                if (infoPopupTimer.current) clearTimeout(infoPopupTimer.current);
                infoPopupTimer.current = setTimeout(() => setShowInfoPopup(false), 4000);
              }}
            />
          </div>
          {showInfoPopup && (
            <div className="info-popup-dark">
              An diesem Datum läuft die Galerie ab und der Kunde hat keinen Zugriff mehr. 30 Tage nach dem Ablaufdatum wird die Galerie endgültig gelöscht. Davor kannst du sie jederzeit deinem Kunden erneut freischalten.
            </div>
          )}
          <input className="form-input" placeholder="tt.mm.jjjj" type="date" value={formData.ablaufdatum} onChange={e => updateField('ablaufdatum', e.target.value)} />
        </div>

        <div className="form-group">
          <div className="form-label">Passwort <Settings size={14} className="settings-icon" /></div>
          <div style={{ position: 'relative', display: 'flex', gap: '0.5rem' }}>
            <input className="form-input" style={{ flex: 1, paddingRight: '2.5rem' }} type={showPassword ? 'text' : 'password'} value={formData.passwort} onChange={e => updateField('passwort', e.target.value)} />
            <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#888', padding: 4 }} title={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <div className="form-label">Meine Marken</div>
          <select className="form-select" value={formData.marke} onChange={e => updateField('marke', e.target.value)}>
            {brands.map(b => <option key={b.id} value={globalBrand.firmenname || b.name}>{globalBrand.firmenname || b.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <div className="form-label">Tags</div>
          <div className="tags-input-container">
            <div className="tags-pills">
              {tags.map((tag) => (
                <span key={tag} className="form-tag">
                  {tag} <button onClick={() => removeTag(tag)}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="tags-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="Tag eintragen..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) addTag(); }}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="form-label">Sprache auswählen</div>
          <select className="form-select" value={formData.sprache} onChange={e => updateField('sprache', e.target.value)}>
            <option>Deutsch</option>
            <option>English</option>
            <option>Français</option>
            <option>Italiano</option>
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div className="form-label">Eigene Domains</div>
            <select className="form-select" style={{ width: '100%' }} value={formData.domain} onChange={e => updateField('domain', e.target.value)}>
              <option value="">Domain wählen</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <div className="form-label">Domainpfad</div>
            <input className="form-input" value={formData.domainpfad} onChange={e => updateField('domainpfad', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <div className="form-label">Mitteilung</div>
          <select className="form-select" value={formData.mitteilung} onChange={e => updateField('mitteilung', e.target.value)}>
            <option value="">Keine Mitteilung</option>
            {mittList.map((m, i) => <option key={i} value={m.titel}>{m.titel}</option>)}
          </select>
          {formData.mitteilung && (
            <div style={{ marginTop: '0.5rem' }}>
              <div className="form-label" style={{ fontSize: '0.8rem' }}>Wer soll sehen?</div>
              <select className="form-select" value={formData.mitteilungSichtbarkeit || 'Alle'} onChange={e => updateField('mitteilungSichtbarkeit', e.target.value)}>
                <option value="Alle">Alle</option>
                <option value="Hauptkunde">Hauptkunde</option>
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {toggleItems.map((item) => (
            <React.Fragment key={item.key}>
              <div className="toggle-row">
                <span className="toggle-label">
                  {item.label}
                  {item.key === 'downloadPin' && toggles.downloadPin && formData.downloadPinCode && (
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      PIN: {formData.downloadPinCode}
                    </span>
                  )}
                </span>
                <div
                  className={`toggle-wrapper ${toggles[item.key] ? 'on' : ''}`}
                  onClick={() => toggle(item.key)}
                />
              </div>

            </React.Fragment>
          ))}

          {/* Wasserzeichen dropdown – always visible, controls wasserzeichen toggle automatically */}
          {watermarks.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <span className="toggle-label" style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>Wasserzeichen</span>
              <select
                className="form-select"
                style={{ fontSize: '0.85rem', padding: '0.35rem 0.5rem', width: '100%' }}
                value={toggles.selectedWatermarkId || ''}
                onChange={e => {
                  const val = e.target.value;
                  setToggles(prev => ({
                    ...prev,
                    selectedWatermarkId: val,
                    wasserzeichen: !!val, // auto ON/OFF
                  }));
                  triggerSaveToast();
                }}
              >
                <option value="">Kein Wasserzeichen</option>
                {watermarks.map(wm => (
                  <option key={wm.id} value={wm.id}>
                    {wm.name} ({wm.wmType === 'tile' ? 'Kachel' : wm.wmType === 'text' ? 'Text' : 'Bild'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Hauptkunden */}
      <div>
        <div className="hauptkunden-section">
          <h3>Hauptkunden</h3>

          {hauptkunden.map((kunde, idx) => (
            <div key={idx} className="hauptkunde-row">
              <div className="hauptkunde-fields">
                <div className="hauptkunde-field">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>E-Mail*</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="name@domain.de"
                    value={kunde.email}
                    onChange={e => updateHauptkunde(idx, 'email', e.target.value)}
                  />
                </div>
                <div className="hauptkunde-field">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Vorname</label>
                  <input
                    className="form-input"
                    placeholder="Vorname"
                    value={kunde.vorname}
                    onChange={e => updateHauptkunde(idx, 'vorname', e.target.value)}
                  />
                </div>
                <div className="hauptkunde-field">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nachname</label>
                  <input
                    className="form-input"
                    placeholder="Nachname"
                    value={kunde.nachname}
                    onChange={e => updateHauptkunde(idx, 'nachname', e.target.value)}
                  />
                </div>
                <button
                  className="hauptkunde-delete"
                  onClick={() => removeHauptkunde(idx)}
                  title="Entfernen"
                >
                  <X size={16} />
                </button>
              </div>
              <label className="hauptkunde-checkbox">
                <input
                  type="checkbox"
                  checked={kunde.emailMarketing || false}
                  onChange={e => updateHauptkunde(idx, 'emailMarketing', e.target.checked)}
                />
                E-Mail Marketing aktivieren
              </label>
            </div>
          ))}

          <button className="hauptkunden-add" onClick={addHauptkunde}>
            <Plus size={14} /> Weiteren Hauptkunden hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
};

export default EinstellungenTab;
