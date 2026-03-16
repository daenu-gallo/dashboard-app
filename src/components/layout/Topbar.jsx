import React, { useState, useMemo } from 'react';
import { HelpCircle, ChevronRight, Menu, FolderPlus, X, LogOut, User, Calendar, HelpCircle as HelpIcon } from 'lucide-react';
import './Topbar.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const designTemplates = [
  { key: 'Atelier', label: 'Atelier', description: 'Das elegante Atelier Template passt zu jeder Art der Fotografie. Dank des cleanen Headers ist es unaufdringlich und zeitlos.' },
  { key: 'Dark Shark', label: 'Dark Shark', description: 'Modernes dunkles Design für einen cineastischen Look. Ideal für Events und Street-Photography.' },
  { key: 'Lazy R', label: 'Lazy R', description: 'Ein entspanntes, warmes Design mit natürlichem Charme. Perfekt für Lifestyle- und Outdoor-Fotografie.' },
  { key: 'Luminance', label: 'Luminance', description: 'Lichtdurchflutetes Design mit viel Weissraum. Ideal für Fine-Art, Portraits und elegante Hochzeiten.' },
  { key: 'Noir Classique', label: 'Noir Classique', description: 'Klassisch-dunkles Design mit zeitloser Eleganz. Für Schwarz-Weiss und Editorial Fotografie.' },
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

  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedDesign, setSelectedDesign] = useState('Atelier');

  // Load presets and brands from localStorage
  const presets = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('settings_presets') || '[]'); } catch { return []; }
  }, [showModal]);
  const brands = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('settings_brands') || '[]'); } catch { return []; }
  }, [showModal]);

  const activeDesign = designTemplates.find(d => d.key === selectedDesign) || designTemplates[0];

  // Sync wizard fields when a preset is selected
  const applyPreset = (presetName) => {
    setSelectedPreset(presetName);
    const p = presets.find(pr => pr.name === presetName);
    if (p) {
      if (p.vorlage) setSelectedDesign(p.vorlage);
      if (p.marke) setSelectedBrand(p.marke);

    }
  };

  const openModal = () => {
    setWizardStep(1);
    setTitel('');
    setInterneBezeichnung('');
    setShootingDatum('');
    const standardPreset = presets.find(p => p.standard);
    const initialPreset = standardPreset || presets[0];
    setSelectedPreset(initialPreset?.name || '');
    // Apply preset values
    if (initialPreset) {
      setSelectedDesign(initialPreset.vorlage || 'Atelier');
      setSelectedBrand(initialPreset.marke || brands.find(b => b.active)?.name || '');

    } else {
      setSelectedDesign('Atelier');
      setSelectedBrand(brands.find(b => b.active)?.name || '');

    }
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
        domain: preset ? preset.domain || '' : '',
        domainpfad: gallerySlug,
        galerieart: '',
        mitteilung: preset ? preset.mitteilung || '' : '',
        sortierung: preset ? preset.sortierung || 'Uploaddatum' : 'Uploaddatum',
        tags: preset ? preset.tags || '' : '',
      };
      localStorage.setItem(`gallery_${galleryKey}_settings`, JSON.stringify(settings));

      // Save design settings to the same keys DesignTab reads via usePersistedState
      const templateId = (() => {
        const name = selectedDesign;
        if (name === 'Atelier') return 'atelier';
        if (name === 'Dark Shark') return 'dark-shark';
        if (name === 'Lazy R') return 'lazy-r';
        if (name === 'Luminance') return 'luminance';
        if (name === 'Noir Classique') return 'noir-classique';
        return 'atelier';
      })();
      // Template defaults lookup
      const templateDefaults = {
        'atelier': { primaryColor: '#f0f0f4', secondaryColor: '#1a1a1a', font: 'Inter', spacing: 'klein', display: 'standard' },
        'dark-shark': { primaryColor: '#1a1a2e', secondaryColor: '#e8d5b7', font: 'Josefin Sans', spacing: 'klein', display: 'standard' },
        'lazy-r': { primaryColor: '#f5f0eb', secondaryColor: '#2d4a3e', font: 'Playfair Display', spacing: 'mittel', display: 'standard' },
        'luminance': { primaryColor: '#1a0a10', secondaryColor: '#d4a0a0', font: 'Cormorant Garamond', spacing: 'klein', display: 'standard' },
        'noir-classique': { primaryColor: '#111111', secondaryColor: '#ffffff', font: 'Montserrat', spacing: 'mittel', display: 'kacheln' },
      };
      const td = templateDefaults[templateId] || templateDefaults['atelier'];
      localStorage.setItem(`gallery_${galleryKey}_design_template`, JSON.stringify(templateId));
      localStorage.setItem(`gallery_${galleryKey}_design_primaryColor`, JSON.stringify(preset?.primaerfarbe || td.primaryColor));
      localStorage.setItem(`gallery_${galleryKey}_design_secondaryColor`, JSON.stringify(preset?.sekundaerfarbe || td.secondaryColor));
      localStorage.setItem(`gallery_${galleryKey}_design_font`, JSON.stringify(preset?.schriftart || td.font));
      localStorage.setItem(`gallery_${galleryKey}_design_spacing`, JSON.stringify(preset?.bildabstand || td.spacing));
      localStorage.setItem(`gallery_${galleryKey}_design_display`, JSON.stringify(preset?.bilddarstellung || td.display));

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
          store.put(templateId, `gallery_${galleryKey}_design_template`);
          store.put(preset?.primaerfarbe || td.primaryColor, `gallery_${galleryKey}_design_primaryColor`);
          store.put(preset?.sekundaerfarbe || td.secondaryColor, `gallery_${galleryKey}_design_secondaryColor`);
          store.put(preset?.schriftart || td.font, `gallery_${galleryKey}_design_font`);
          store.put(preset?.bildabstand || td.spacing, `gallery_${galleryKey}_design_spacing`);
          store.put(preset?.bilddarstellung || td.display, `gallery_${galleryKey}_design_display`);
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
                        onChange={(e) => applyPreset(e.target.value)}
                      >
                        {presets.length === 0 && <option value="">Keine Voreinstellungen</option>}
                        {presets.map((p, i) => (
                          <option key={i} value={p.name}>{p.name}</option>
                        ))}
                      </select>
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
