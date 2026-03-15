import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, X, Check, Info } from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';

const EinstellungenTab = ({ gallery }) => {
  const galleryKey = gallery?.title || 'default';
  // Track the most recent title saved to the gallery list for reliable lookups
  const lastSavedTitle = useRef(galleryKey);
  const [brands] = usePersistedState('settings_brands', [{ id: 1, name: 'Fotohahn', active: true }]);
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const [toggles, setToggles] = usePersistedState(`gallery_${galleryKey}_toggles`, {
    appHinweis: true,
    teilen: true,
    kommentarfunktion: false,
    dateienamen: false,
    download: true,
    downloadPin: false,
    wasserzeichen: false,
  });

  // Album-level toggles for sync
  const [albumToggles, setAlbumToggles] = usePersistedState(`gallery_${galleryKey}_albumToggles`, {});

  // Save toast
  const [showSaveToast, setShowSaveToast] = useState(false);
  const saveToastTimer = useRef(null);

  // Info popup for "Läuft ab am"
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const infoPopupTimer = useRef(null);

  const triggerSaveToast = () => {
    setShowSaveToast(true);
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    saveToastTimer.current = setTimeout(() => setShowSaveToast(false), 3000);
  };

  const [formData, setFormData] = usePersistedState(`gallery_${galleryKey}_settings`, {
    titel: gallery?.title || '',
    interneBezeichnung: '',
    shootingdatum: '',
    ablaufdatum: '',
    passwort: '',
    marke: 'Fotohahn',
    sprache: 'Deutsch',
    domain: 'app.fotohahn.ch',
    domainpfad: (gallery?.title || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''),
    mitteilung: '',
  });

  // Tags persisted state (separate for easy lookup in gallery overview)
  const [tags, setTags] = usePersistedState(`gallery_${galleryKey}_tags`, []);
  const [tagInput, setTagInput] = useState('');

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

  // Sync title to parent on mount and whenever formData changes
  useEffect(() => {
    // no-op, kept for consistency
  }, [formData.titel, formData.domainpfad, formData.domain]);

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

  // Local title buffer to prevent keystroke loss from usePersistedState re-renders
  const [localTitle, setLocalTitle] = useState(formData.titel || '');
  const localTitleTimer = useRef(null);

  // Keep local title in sync when formData changes externally
  useEffect(() => {
    setLocalTitle(formData.titel || '');
  }, [formData.titel]);

  const handleTitleChange = (value) => {
    setLocalTitle(value);
    // Debounce the sync to formData
    if (localTitleTimer.current) clearTimeout(localTitleTimer.current);
    localTitleTimer.current = setTimeout(() => {
      updateField('titel', value);
    }, 600);
  };

  const handleTitleBlur = () => {
    if (localTitleTimer.current) clearTimeout(localTitleTimer.current);
    updateField('titel', localTitle);
  };

  // Debounced title sync timer
  const titleSyncTimer = useRef(null);

  // Sync title changes to galleries_list_v2 and localStorage (debounced)
  useEffect(() => {
    if (!formData.titel || formData.titel === galleryKey) return;
    if (titleSyncTimer.current) clearTimeout(titleSyncTimer.current);
    titleSyncTimer.current = setTimeout(() => {
      const value = formData.titel;
      try {
        const stored = localStorage.getItem('galleries_list_v2');
        const list = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex(g =>
          g.title === galleryKey ||
          g.title === lastSavedTitle.current
        );
        if (idx !== -1) {
          list[idx].title = value;
        } else {
          list.push({
            id: Date.now(),
            title: value,
            name: '',
            views: 0, shared: 0, zip: 0, single: 0,
            shop: false, lastView: '-', lastEdit: '-',
            created: new Date().toLocaleDateString('de-DE'),
            color: '#528c68',
          });
        }
        localStorage.setItem('galleries_list_v2', JSON.stringify(list));
        try {
          const dbReq = indexedDB.open('fotohahn_db', 1);
          dbReq.onsuccess = () => {
            const db = dbReq.result;
            const tx = db.transaction('persisted_state', 'readwrite');
            tx.objectStore('persisted_state').put(list, 'galleries_list_v2');
          };
        } catch (e) {}
        lastSavedTitle.current = value;
        window.dispatchEvent(new CustomEvent('persisted-state-change', { detail: { key: 'galleries_list_v2' } }));
      } catch (e) {}
      // Copy settings and toggles under the new gallery key
      localStorage.setItem(`gallery_${value}_settings`, JSON.stringify(formData));
      localStorage.setItem(`gallery_${value}_toggles`, JSON.stringify(toggles));
    }, 500);
    return () => { if (titleSyncTimer.current) clearTimeout(titleSyncTimer.current); };
  }, [formData.titel]);

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
    { key: 'wasserzeichen', label: 'Wasserzeichen ✓' },
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
          <input className="form-input" value={localTitle} onChange={e => handleTitleChange(e.target.value)} onBlur={handleTitleBlur} />
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
          <input className="form-input" type="password" value={formData.passwort} onChange={e => updateField('passwort', e.target.value)} />
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
          </select>
        </div>

        <div className="form-group" style={{ display: 'flex', flexDirection: 'row', gap: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <div className="form-label">Eigene Domains</div>
            <select className="form-select" style={{ width: '100%' }} value={formData.domain} onChange={e => updateField('domain', e.target.value)}>
              <option>app.fotohahn.ch</option>
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
            <option value="">Bitte auswählen</option>
            <option value="Hochzeit">Hochzeit</option>
            <option value="Fotoshooting">Fotoshooting</option>
            <option value="Firmenevent">Firmenevent</option>
            <option value="Produktfotos">Produktfotos</option>
            <option value="Porträt">Porträt</option>
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
            <div key={item.key} className="toggle-row">
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
          ))}
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
