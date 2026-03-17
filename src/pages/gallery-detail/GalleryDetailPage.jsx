import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Eye, Send, BookOpen, Image as ImageIcon } from 'lucide-react';
import BilderTab from './BilderTab';
import EinstellungenTab from './EinstellungenTab';
import DesignTab from './DesignTab';
import AuswahlenTab from './AuswahlenTab';
import StatistikenTab from './StatistikenTab';

import VerschickenTab from './VerschickenTab';
import { useGalleries } from '../../contexts/GalleryContext';
import { usePersistedState } from '../../hooks/usePersistedState';
import './GalleryDetail.css';

const tabs = [
  { id: 'bilder', label: 'Bilder' },
  { id: 'einstellungen', label: 'Einstellungen' },
  { id: 'design', label: 'Design' },
  { id: 'auswahlen', label: 'Auswahlen' },
  { id: 'statistiken', label: 'Statistiken' },
  { id: 'verschicken', label: 'Verschicken' },
];

const GalleryDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getGalleryBySlug, updateGallery, loading } = useGalleries();
  const [activeTab, setActiveTab] = useState('bilder');
  
  const gallery = getGalleryBySlug(slug);
  const [dynamicCounts, setDynamicCounts] = useState({ albums: 0, photos: 0 });

  // Gallery key for sub-components that still use localStorage (BilderTab, DesignTab, etc.)
  // These will be migrated in a later step
  const galleryKey = gallery?.title || slug;

  // Read uploaded images for avatar thumbnail (still from localStorage until NAS migration)
  const [appIconSrc] = usePersistedState(`gallery_${galleryKey}_appIcon`, null);
  const [overrideIcon, setOverrideIcon] = useState(null);

  const avatarSrc = overrideIcon || appIconSrc || null;

  const displayTitle = gallery?.title || slug;
  const displayUrl = gallery?.domain
    ? `https://${gallery.domain}/${gallery.domain_path || slug}`
    : '';

  const renderTab = () => {
    if (!gallery) return null;
    // Pass gallery object from Supabase to sub-tabs
    // Some tabs still use localStorage for their own data (BilderTab for images)
    // They will be migrated in the NAS image phase  
    const legacyGallery = { title: gallery.title, slug: gallery.slug };
    switch (activeTab) {
      case 'bilder': return <BilderTab gallery={legacyGallery} supabaseGallery={gallery} updateGallery={updateGallery} onCountsChange={setDynamicCounts} onAppIconChange={setOverrideIcon} />;
      case 'einstellungen': return <EinstellungenTab gallery={legacyGallery} supabaseGallery={gallery} updateGallery={updateGallery} />;
      case 'design': return <DesignTab gallery={legacyGallery} supabaseGallery={gallery} updateGallery={updateGallery} />;
      case 'auswahlen': return <AuswahlenTab galleryKey={slug} />;
      case 'statistiken': return <StatistikenTab galleryId={gallery.id} />;
      case 'verschicken': return <VerschickenTab gallery={legacyGallery} galleryKey={galleryKey} settings={{ titel: gallery.title, domain: gallery.domain, domainpfad: gallery.domain_path }} uploadedImages={{}} appIconSrc={appIconSrc} />;
      default: return <BilderTab gallery={legacyGallery} supabaseGallery={gallery} updateGallery={updateGallery} onCountsChange={setDynamicCounts} onAppIconChange={setOverrideIcon} />;
    }
  };

  if (loading) {
    return (
      <div className="gallery-detail">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          Galerie wird geladen...
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="gallery-detail">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <p>Galerie nicht gefunden.</p>
          <Link to="/galleries" style={{ color: 'var(--color-primary)' }}>← Zurück zu Galerien</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gallery-detail">
      {/* Gallery Header */}
      <div className="gallery-detail-header">
        <div className="gallery-detail-avatar">
          {avatarSrc ? (
            <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <ImageIcon size={24} style={{ color: 'rgba(0,0,0,0.15)' }} />
          )}
        </div>
        <div className="gallery-detail-info">
          <h1 className="gallery-detail-title">{displayTitle}</h1>
          <p className="gallery-detail-meta">
            {dynamicCounts.albums} Alben · {dynamicCounts.photos} Fotos
          </p>
          <a href={displayUrl} className="gallery-detail-url" target="_blank" rel="noreferrer">
            {displayUrl}
          </a>
        </div>
        <div className="gallery-detail-actions">
          <button className="btn-action btn-green" onClick={() => window.open(`/${slug}`, '_blank')}>
            <Eye size={14} /> Kundenansicht
          </button>
          <button className="btn-action btn-green-outline" onClick={() => setActiveTab('verschicken')}>
            <Send size={14} /> Verschicken
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="gallery-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`gallery-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="gallery-tab-content">
        {renderTab()}
      </div>
    </div>
  );
};

export default GalleryDetailPage;
