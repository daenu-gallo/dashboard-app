import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronRight, Menu, FolderPlus, X, LogOut, User, Calendar, HelpCircle as HelpIcon } from 'lucide-react';
import './Topbar.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const designTemplates = [
  { key: 'Atelier', label: 'Atelier', description: 'Das elegante Atelier Template passt zu jeder Art der Fotografie. Dank des cleanen Headers ist es unaufdringlich und zeitlos. Alle wichtigen Informationen der Galerie werden übersichtlich und dezent auf den ersten Blick sichtbar.' },
  { key: 'Simple Filigree', label: 'Simple Filigree', description: 'Ein minimalistisches Design mit feinen Linien und zurückhaltendem Stil. Perfekt für elegante Hochzeiten und Portraits.' },
  { key: 'Scrappbook 2.0 Dark', label: 'Scrappbook 2.0 Dark', description: 'Modernes dunkles Design für einen cineastischen Look. Ideal für Events und Street-Photography.' },
  { key: 'Vicky Baumann Fineart', label: 'Vicky Baumann Fineart', description: 'Fine-Art Design mit viel Weissraum und typographischem Fokus. Für Fine-Art und Editorial Fotografie.' },
];

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Step 1 fields
  const [titel, setTitel] = useState('');
  const [interneBezeichnung, setInterneBezeichnung] = useState('');
  const [shootingDatum, setShootingDatum] = useState('');

  // Step 2 fields
  const [selectedPreset, setSelectedPreset] = useState('');
  const [gesichtserkennung, setGesichtserkennung] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('Fotohahn');
  const [selectedDesign, setSelectedDesign] = useState('Atelier');

  // Load presets and brands from localStorage
  const presets = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('settings_presets') || '[]'); } catch { return []; }
  }, [showModal]);
  const brands = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('settings_brands') || '[{"id":1,"name":"Fotohahn","active":true}]'); } catch { return [{ id: 1, name: 'Fotohahn', active: true }]; }
  }, [showModal]);

  const activeDesign = designTemplates.find(d => d.key === selectedDesign) || designTemplates[0];

  const openModal = () => {
    setWizardStep(1);
    setTitel('');
    setInterneBezeichnung('');
    setShootingDatum('');
    const standardPreset = presets.find(p => p.standard);
    setSelectedPreset(standardPreset ? standardPreset.name : (presets[0]?.name || ''));
    setGesichtserkennung(true);
    setSelectedBrand(brands.find(b => b.active)?.name || brands[0]?.name || 'Fotohahn');
    setSelectedDesign('Atelier');
    setShowModal(true);
  };
  
  // Simple breadcrumb logic based on path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/') return ['Home', 'Dashboard'];
    if (path === '/galleries') return ['Home', 'Galerien'];
    if (path === '/portfolios') return ['Home', 'Portfolios'];
    if (path === '/settings') return ['Home', 'Einstellungen'];
    return ['Home'];
  };

  const breadcrumbs = getBreadcrumbs();

  const handleCreateGalerie = () => {
    if (titel.trim()) {
      // Read existing galleries from localStorage
      let galleries = [];
      try {
        const stored = localStorage.getItem('galleries_list_v2');
        if (stored) galleries = JSON.parse(stored);
      } catch (e) {}

      // Find the selected preset
      let preset = null;
      try {
        const allPresets = JSON.parse(localStorage.getItem('settings_presets') || '[]');
        preset = allPresets.find(p => p.name === selectedPreset) || allPresets.find(p => p.standard);
      } catch (e) {}

      // Create new gallery with next available ID
      const maxId = galleries.reduce((max, g) => Math.max(max, g.id || 0), 0);
      const gallerySlug = titel.trim().toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      const newGallery = {
        id: maxId + 1,
        title: titel.trim(),
        name: interneBezeichnung.trim(),
        views: 0,
        shared: 0,
        zip: 0,
        single: 0,
        shop: false,
        lastView: '-',
        lastEdit: new Date().toLocaleDateString('de-DE') + ' - ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        created: new Date().toLocaleDateString('de-DE'),
        color: '#528c68',
      };

      // Apply settings to the new gallery
      const galleryKey = titel.trim();
      const toggles = {
        appHinweis: preset ? preset.appHinweis !== false : true,
        teilen: preset ? preset.teilen !== false : true,
        kommentarfunktion: preset ? preset.kommentar !== false : true,
        dateienamen: preset ? preset.zeigeDateinamen || false : false,
        download: preset ? preset.download !== false : true,
        downloadPin: preset ? preset.downloadPin || false : false,
        wasserzeichen: false,
        gesichtserkennung: gesichtserkennung,
      };
      localStorage.setItem(`gallery_${galleryKey}_toggles`, JSON.stringify(toggles));

      const settings = {
        titel: titel.trim(),
        interneBezeichnung: interneBezeichnung.trim(),
        shootingdatum: shootingDatum,
        ablaufdatum: preset ? preset.ablauf || '' : '',
        passwort: '',
        marke: selectedBrand,
        sprache: preset ? preset.sprache || 'Deutsch' : 'Deutsch',
        domain: preset ? preset.domain || 'app.fotohahn.ch' : 'app.fotohahn.ch',
        domainpfad: gallerySlug,
        galerieart: '',
        mitteilung: preset ? preset.mitteilung || '' : '',
        sortierung: preset ? preset.sortierung || 'Uploaddatum' : 'Uploaddatum',
        tags: preset ? preset.tags || '' : '',
      };
      localStorage.setItem(`gallery_${galleryKey}_settings`, JSON.stringify(settings));

      const design = {
        vorlage: selectedDesign,
        schriftart: preset ? preset.schriftart || '' : '',
        primaerfarbe: preset ? preset.primaerfarbe || '' : '',
        sekundaerfarbe: preset ? preset.sekundaerfarbe || '' : '',
        bildabstand: preset ? preset.bildabstand || '' : '',
        bilddarstellung: preset ? preset.bilddarstellung || 'Standard' : 'Standard',
        dekorativ: preset ? preset.dekorativ !== false : true,
        fotografenhinweis: preset ? preset.fotografenhinweis || false : false,
      };
      localStorage.setItem(`gallery_${galleryKey}_design`, JSON.stringify(design));

      // Tracking
      if (preset && (preset.gaCode || preset.gtmId || preset.fbPixel)) {
        const tracking = {
          gaCode: preset.gaCode || '',
          gtmId: preset.gtmId || '',
          fbPixel: preset.fbPixel || '',
        };
        localStorage.setItem(`gallery_${galleryKey}_tracking`, JSON.stringify(tracking));
      }

      // Sync all to IndexedDB
      try {
        const dbReq = indexedDB.open('fotohahn_db', 1);
        dbReq.onsuccess = () => {
          const db = dbReq.result;
          const tx = db.transaction('persisted_state', 'readwrite');
          const store = tx.objectStore('persisted_state');
          store.put(toggles, `gallery_${galleryKey}_toggles`);
          store.put(settings, `gallery_${galleryKey}_settings`);
          store.put(design, `gallery_${galleryKey}_design`);
        };
      } catch (e) {}

      // Save updated list to localStorage + IndexedDB
      const updatedList = [...galleries, newGallery];
      localStorage.setItem('galleries_list_v2', JSON.stringify(updatedList));
      try {
        const dbReq = indexedDB.open('fotohahn_db', 1);
        dbReq.onsuccess = () => {
          const db = dbReq.result;
          const tx = db.transaction('persisted_state', 'readwrite');
          tx.objectStore('persisted_state').put(updatedList, 'galleries_list_v2');
        };
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('persisted-state-change', { detail: { key: 'galleries_list_v2' } }));

      setShowModal(false);
      navigate(`/galleries/${gallerySlug}`);
    }
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" title="Menu">
            <Menu size={20} />
          </button>
          <div className="breadcrumbs">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb}>
                <span className={index === breadcrumbs.length - 1 ? 'crumb-active' : 'crumb'}>
                  {crumb}
                </span>
                {index < breadcrumbs.length - 1 && <span className="separator">/</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        <div className="topbar-right">
          {location.pathname === '/' || location.pathname === '/galleries' ? (
            <button className="btn-primary" onClick={openModal}>
              <FolderPlus size={16} />
              Neue Galerie erstellen
            </button>
          ) : null}
          
          {user && (
            <div className="topbar-user">
              <div className="topbar-user-info">
                <User size={16} />
                <span className="topbar-user-email">{user.email}</span>
              </div>
              <button className="topbar-logout-btn" onClick={async () => { await logout(); navigate('/login'); }} title="Abmelden">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Neue Galerie Wizard Modal */}
      {showModal && (
        <div className="topbar-modal-overlay" onClick={() => setShowModal(false)}>
          <div className={`topbar-modal ${wizardStep === 2 ? 'topbar-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="wizard-header">
              <h3>Neue Galerie erstellen</h3>
              <button className="wizard-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {wizardStep === 1 ? (
              /* ── Step 1: Details ── */
              <>
                <div className="topbar-modal-body">
                  <div className="wizard-field">
                    <label className="wizard-label">
                      Titel
                      <HelpCircle size={14} className="wizard-help-icon" />
                    </label>
                    <input
                      className="topbar-modal-input"
                      type="text"
                      placeholder="Titel"
                      value={titel}
                      onChange={(e) => setTitel(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="wizard-field">
                    <label className="wizard-label">
                      Interne Bezeichnung (optional)
                      <HelpCircle size={14} className="wizard-help-icon" />
                    </label>
                    <input
                      className="topbar-modal-input"
                      type="text"
                      placeholder="Interne Bezeichnung (optional)"
                      value={interneBezeichnung}
                      onChange={(e) => setInterneBezeichnung(e.target.value)}
                    />
                  </div>

                  <div className="wizard-field">
                    <label className="wizard-label">
                      Datum des Shootings (optional)
                    </label>
                    <div className="wizard-date-wrapper">
                      <input
                        className="topbar-modal-input"
                        type="date"
                        placeholder="Datum des Shootings"
                        value={shootingDatum}
                        onChange={(e) => setShootingDatum(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="topbar-modal-footer">
                  <button className="topbar-modal-cancel" onClick={() => setShowModal(false)}>
                    Abbrechen
                  </button>
                  <button
                    className="topbar-modal-submit"
                    onClick={() => setWizardStep(2)}
                    disabled={!titel.trim()}
                  >
                    Nächster Schritt
                  </button>
                </div>
              </>
            ) : (
              /* ── Step 2: Einstellungen & Design ── */
              <>
                <div className="topbar-modal-body wizard-step2-body">
                  <div className="wizard-step2-left">
                    <div className="wizard-field">
                      <label className="wizard-label">Galerie Voreinstellung</label>
                      <select
                        className="topbar-modal-input"
                        value={selectedPreset}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                      >
                        {presets.length === 0 && <option value="">Keine Voreinstellungen</option>}
                        {presets.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="wizard-toggle-row">
                      <div
                        className={`wizard-toggle ${gesichtserkennung ? 'active' : ''}`}
                        onClick={() => setGesichtserkennung(!gesichtserkennung)}
                      >
                        <div className="wizard-toggle-knob" />
                      </div>
                      <span className="wizard-toggle-label">
                        Gesichtserkennung
                        <HelpCircle size={14} className="wizard-help-icon" />
                      </span>
                    </div>

                    <div className="wizard-field">
                      <label className="wizard-label">Marke</label>
                      <select
                        className="topbar-modal-input"
                        value={selectedBrand}
                        onChange={(e) => setSelectedBrand(e.target.value)}
                      >
                        {brands.map((b, i) => (
                          <option key={i} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="wizard-field">
                      <label className="wizard-label">Design auswählen:</label>
                      <select
                        className="topbar-modal-input"
                        value={selectedDesign}
                        onChange={(e) => setSelectedDesign(e.target.value)}
                      >
                        {designTemplates.map(t => (
                          <option key={t.key} value={t.key}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <p className="wizard-design-desc">{activeDesign.description}</p>
                  </div>
                </div>

                <div className="topbar-modal-footer">
                  <button className="topbar-modal-cancel" onClick={() => setWizardStep(1)}>
                    Zurück
                  </button>
                  <button
                    className="topbar-modal-submit"
                    onClick={handleCreateGalerie}
                  >
                    Erstellen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
