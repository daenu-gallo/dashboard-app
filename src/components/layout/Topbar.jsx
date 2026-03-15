import React, { useState } from 'react';
import { HelpCircle, ChevronRight, Menu, FolderPlus, X } from 'lucide-react';
import './Topbar.css';
import { useLocation, useNavigate } from 'react-router-dom';

const Topbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newGalerieName, setNewGalerieName] = useState('');
  
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
    if (newGalerieName.trim()) {
      // Read existing galleries from localStorage
      let galleries = [];
      try {
        const stored = localStorage.getItem('galleries_list_v2');
        if (stored) galleries = JSON.parse(stored);
      } catch (e) {}

      // Read the standard preset
      let standardPreset = null;
      try {
        const presets = JSON.parse(localStorage.getItem('settings_presets') || '[]');
        standardPreset = presets.find(p => p.standard);
      } catch (e) {}

      // Create new gallery with next available ID
      const maxId = galleries.reduce((max, g) => Math.max(max, g.id || 0), 0);
      const gallerySlug = newGalerieName.toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      const newGallery = {
        id: maxId + 1,
        title: newGalerieName.trim(),
        name: '',
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

      // Apply standard preset settings to the new gallery
      if (standardPreset) {
        const galleryKey = newGalerieName.trim();
        // Toggles
        const toggles = {
          appHinweis: standardPreset.appHinweis !== false,
          teilen: standardPreset.teilen !== false,
          kommentarfunktion: standardPreset.kommentar !== false,
          dateienamen: standardPreset.zeigeDateinamen || false,
          download: standardPreset.download !== false,
          downloadPin: standardPreset.downloadPin || false,
          wasserzeichen: false,
        };
        localStorage.setItem(`gallery_${galleryKey}_toggles`, JSON.stringify(toggles));

        // Settings / form data
        const settings = {
          titel: newGalerieName.trim(),
          interneBezeichnung: '',
          shootingdatum: '',
          ablaufdatum: standardPreset.ablauf || '',
          passwort: '',
          marke: standardPreset.marke || 'Fotohahn',
          sprache: standardPreset.sprache || 'Deutsch',
          domain: standardPreset.domain || 'app.fotohahn.ch',
          domainpfad: gallerySlug,
          galerieart: '',
          mitteilung: standardPreset.mitteilung || '',
          sortierung: standardPreset.sortierung || 'Uploaddatum',
          tags: standardPreset.tags || '',
        };
        localStorage.setItem(`gallery_${galleryKey}_settings`, JSON.stringify(settings));

        // Design
        const design = {
          vorlage: standardPreset.vorlage || '',
          schriftart: standardPreset.schriftart || '',
          primaerfarbe: standardPreset.primaerfarbe || '',
          sekundaerfarbe: standardPreset.sekundaerfarbe || '',
          bildabstand: standardPreset.bildabstand || '',
          bilddarstellung: standardPreset.bilddarstellung || 'Standard',
          dekorativ: standardPreset.dekorativ !== false,
          fotografenhinweis: standardPreset.fotografenhinweis || false,
        };
        localStorage.setItem(`gallery_${galleryKey}_design`, JSON.stringify(design));

        // Tracking
        if (standardPreset.gaCode || standardPreset.gtmId || standardPreset.fbPixel) {
          const tracking = {
            gaCode: standardPreset.gaCode || '',
            gtmId: standardPreset.gtmId || '',
            fbPixel: standardPreset.fbPixel || '',
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
      }

      // Save updated list to localStorage + IndexedDB
      const updatedList = [...galleries, newGallery];
      localStorage.setItem('galleries_list_v2', JSON.stringify(updatedList));
      // Sync to IndexedDB
      try {
        const dbReq = indexedDB.open('fotohahn_db', 1);
        dbReq.onsuccess = () => {
          const db = dbReq.result;
          const tx = db.transaction('persisted_state', 'readwrite');
          tx.objectStore('persisted_state').put(updatedList, 'galleries_list_v2');
        };
      } catch (e) {}
      // Notify other components
      window.dispatchEvent(new CustomEvent('persisted-state-change', { detail: { key: 'galleries_list_v2' } }));

      setShowModal(false);
      setNewGalerieName('');

      // Navigate to the new gallery
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
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <FolderPlus size={16} />
              Neue Galerie erstellen
            </button>
          ) : null}
        </div>
      </header>

      {/* Neue Galerie Modal */}
      {showModal && (
        <div className="topbar-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="topbar-modal" onClick={(e) => e.stopPropagation()}>
            <div className="topbar-modal-header">
              <h3>Neue Galerie erstellen</h3>
              <button className="topbar-modal-close" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="topbar-modal-body">
              <label className="topbar-modal-label">Name der Galerie</label>
              <input
                className="topbar-modal-input"
                type="text"
                placeholder="z.B. Hochzeit Anna & Peter"
                value={newGalerieName}
                onChange={(e) => setNewGalerieName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGalerie()}
                autoFocus
              />
            </div>
            <div className="topbar-modal-footer">
              <button className="topbar-modal-cancel" onClick={() => setShowModal(false)}>
                Abbrechen
              </button>
              <button
                className="topbar-modal-submit"
                onClick={handleCreateGalerie}
                disabled={!newGalerieName.trim()}
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
