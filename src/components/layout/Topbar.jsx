import React, { useState, useMemo, useEffect } from 'react';
import { HelpCircle, ChevronRight, Menu, FolderPlus, X, LogOut, User, Calendar, HelpCircle as HelpIcon } from 'lucide-react';
import './Topbar.css';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useGalleries, toSlug } from '../../contexts/GalleryContext';
import { supabase } from '../../lib/supabaseClient';

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
  const { createGallery } = useGalleries();
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [creating, setCreating] = useState(false);

  // Step 1 fields
  const [titel, setTitel] = useState('');
  const [interneBezeichnung, setInterneBezeichnung] = useState('');
  const [shootingDatum, setShootingDatum] = useState('');

  // Step 2 fields
  const [selectedPreset, setSelectedPreset] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedDesign, setSelectedDesign] = useState('Atelier');

  // Load presets and brands from Supabase
  const [presets, setPresets] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    if (showModal && user) {
      // Fetch presets
      supabase.from('presets').select('*').eq('user_id', user.id)
        .then(({ data }) => setPresets(data || []));
      // Fetch brands
      supabase.from('brands').select('*').eq('user_id', user.id)
        .then(({ data }) => setBrands(data || []));
    }
  }, [showModal, user]);

  const activeDesign = designTemplates.find(d => d.key === selectedDesign) || designTemplates[0];

  // Sync wizard fields when a preset is selected
  const applyPreset = (presetName) => {
    setSelectedPreset(presetName);
    const p = presets.find(pr => pr.name === presetName);
    if (p) {
      const s = p.settings || {};
      const d = p.design || {};
      if (d.vorlage) setSelectedDesign(d.vorlage);
      if (s.marke) setSelectedBrand(s.marke);
    }
  };

  const openModal = () => {
    setWizardStep(1);
    setTitel('');
    setInterneBezeichnung('');
    setShootingDatum('');
    setCreating(false);
    const standardPreset = presets.find(p => p.is_default);
    const initialPreset = standardPreset || presets[0];
    setSelectedPreset(initialPreset?.name || '');
    if (initialPreset) {
      const d = initialPreset.design || {};
      const s = initialPreset.settings || {};
      setSelectedDesign(d.vorlage || 'Atelier');
      setSelectedBrand(s.marke || brands.find(b => b.active)?.name || '');
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

  const handleCreateGalerie = async () => {
    if (!titel.trim() || creating) return;
    setCreating(true);

    try {
      // Find the selected preset data
      const preset = presets.find(p => p.name === selectedPreset);

      const gallery = await createGallery({
        title: titel.trim(),
        internalName: interneBezeichnung.trim(),
        shootingDate: shootingDatum || null,
        preset: preset ? { ...(preset.settings || {}), ...(preset.design || {}), ...(preset.tracking || {}), alben: preset.albums || [] } : null,
        brand: selectedBrand,
        designTemplate: selectedDesign,
      });

      setShowModal(false);
      navigate(`/galleries/${gallery.slug}`);
    } catch (err) {
      console.error('Error creating gallery:', err);
      alert('Fehler beim Erstellen: ' + err.message);
      setCreating(false);
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
                {index < breadcrumbs.length - 1 ? (
                  <span className="crumb" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    {crumb}
                  </span>
                ) : (
                  <span className="crumb-active">{crumb}</span>
                )}
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
                    disabled={creating}
                  >
                    {creating ? 'Erstelle...' : 'Erstellen'}
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
