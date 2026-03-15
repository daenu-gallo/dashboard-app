import React, { useState } from 'react';
import { Sparkles, User, Download, Upload, Trash2, Heart, Image as ImageIcon, Eye, Info, ArrowUpCircle } from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';

const AuswahlenTab = ({ galleryKey }) => {
  const [selections, setSelections] = usePersistedState(`gallery_${galleryKey}_selections`, []);
  const [activeCustomerIdx, setActiveCustomerIdx] = useState(null);

  // Get the active customer's selected photos
  const activeCustomer = activeCustomerIdx !== null ? selections[activeCustomerIdx] : null;
  const selectedPhotos = activeCustomer?.photos || [];

  const handleDeleteSelection = () => {
    if (activeCustomerIdx === null) return;
    if (!window.confirm('Auswahl wirklich löschen?')) return;
    setSelections(prev => prev.filter((_, i) => i !== activeCustomerIdx));
    setActiveCustomerIdx(null);
  };

  const handleCleanup = () => {
    // Remove customers with 0 selections
    setSelections(prev => prev.filter(s => s.photos && s.photos.length > 0));
    setActiveCustomerIdx(null);
  };

  return (
    <div className="auswahlen-tab">
      <div className="auswahlen-header">
        <span>⊞ Hilfsartikel anzeigen</span>
      </div>

      <div className="selection-cards">
        {/* "Request selection" card */}
        <div className="selection-card add-selection">
          <Sparkles size={32} style={{ color: 'var(--text-secondary)' }} />
          <span className="selection-name">Auswahl anfordern</span>
          <span className="selection-meta">Klicke hier, um eine Auswahl von deinen Kunden anzufordern</span>
        </div>

        {/* Customer cards from real data */}
        {selections.map((sel, idx) => (
          <div
            key={idx}
            className={`selection-card ${activeCustomerIdx === idx ? 'active' : ''}`}
            onClick={() => setActiveCustomerIdx(activeCustomerIdx === idx ? null : idx)}
            style={{ cursor: 'pointer' }}
          >
            <div className="selection-badges" style={{ alignSelf: 'flex-end' }}>
              {sel.photos?.length > 0 && <span>♥ {sel.photos.length}</span>}
              <span>👁 0</span>
            </div>
            <div className="selection-avatar">
              <User size={24} />
            </div>
            <span className="selection-name">{sel.userName || 'Unbenannte Auswahl'}</span>
            {sel.userEmail && (
              <span className="selection-meta" style={{ fontSize: '0.7rem', color: '#999' }}>{sel.userEmail}</span>
            )}
          </div>
        ))}

        {selections.length === 0 && (
          <div className="selection-card">
            <div className="selection-avatar">
              <User size={24} />
            </div>
            <span className="selection-name">Unbenannte Auswahl</span>
            <span className="selection-meta" style={{ fontSize: '0.7rem', color: '#999' }}>Noch keine Auswahlen</span>
          </div>
        )}
      </div>

      <div className="auswahlen-actions">
        <button><Upload size={12} /> Export</button>
        <button><Download size={12} /> Auswahl herunterladen</button>
        <button onClick={handleCleanup}>✓ Aufräumen</button>
        <button onClick={handleDeleteSelection} disabled={activeCustomerIdx === null}>
          <Trash2 size={12} /> Auswahl löschen
        </button>
      </div>

      {/* Selected photos grid */}
      {activeCustomer && (
        <div className="selected-photo-grid">
          {selectedPhotos.length > 0 ? (
            selectedPhotos.map((photo, pIdx) => (
              <div key={pIdx} className="selected-photo" style={{ position: 'relative' }}>
                {photo.src ? (
                  <img src={photo.src} alt={photo.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,0,0,0.3)' }}>
                    <ImageIcon size={20} />
                  </div>
                )}
                <span className="heart" style={{ position: 'absolute', top: '4px', left: '4px', color: '#e74c3c', fontSize: '1rem' }}>♥</span>
                <div className="selected-photo-actions">
                  <button title="Vergrössern"><ArrowUpCircle size={14} /></button>
                  <button title="Info"><Info size={14} /></button>
                  <button title="Herunterladen"><Download size={14} /></button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '2rem', color: '#999', textAlign: 'center', gridColumn: '1 / -1' }}>
              Keine Fotos ausgewählt
            </div>
          )}
        </div>
      )}

      {!activeCustomer && selections.length > 0 && (
        <div style={{ padding: '1.5rem', color: '#999', textAlign: 'center', fontSize: '0.85rem' }}>
          Wählen Sie einen Kunden aus, um die Auswahl anzuzeigen.
        </div>
      )}
    </div>
  );
};

export default AuswahlenTab;
