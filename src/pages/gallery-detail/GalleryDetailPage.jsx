import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Eye, Send, BookOpen, Image as ImageIcon } from 'lucide-react';
import BilderTab from './BilderTab';
import EinstellungenTab from './EinstellungenTab';
import DesignTab from './DesignTab';
import AuswahlenTab from './AuswahlenTab';
import StatistikenTab from './StatistikenTab';

import VerschickenTab from './VerschickenTab';
import { usePersistedState } from '../../hooks/usePersistedState';
import './GalleryDetail.css';

const galleryData = [
  { title: 'vorschau-hochzeit', albums: 0, photos: 0, thumbnail: null },
  { title: 'SV Strättligen', albums: 0, photos: 0, thumbnail: null },
  { title: 'Hochzeit Edith & Thomas', albums: 0, photos: 0, thumbnail: null },
];

const toSlug = (title) => title.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// Load gallery by slug from hardcoded data or localStorage
const getGalleryBySlug = (slug) => {
  // Check hardcoded data
  const hardcoded = galleryData.find(g => toSlug(g.title) === slug);
  if (hardcoded) return hardcoded;
  // Check localStorage
  try {
    const stored = localStorage.getItem('galleries_list_v2');
    if (stored) {
      const list = JSON.parse(stored);
      const found = list.find(g => toSlug(g.title) === slug);
      if (found) {
        return {
          title: found.title,
          albums: 0,
          photos: 0,
          thumbnail: null,
        };
      }
    }
  } catch (e) {}
  // Fallback - use slug as title
  return { title: slug, albums: 0, photos: 0, thumbnail: null };
};

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
  const [activeTab, setActiveTab] = useState('bilder');
  const gallery = getGalleryBySlug(slug);
  const [dynamicCounts, setDynamicCounts] = useState({ albums: gallery.albums, photos: gallery.photos });

  // Read the persisted settings (same key as EinstellungenTab) so title/URL stay in sync
  const galleryKey = gallery?.title || 'default';
  const [settings] = usePersistedState(`gallery_${galleryKey}_settings`, {
    titel: gallery.title,
    domain: '',
    domainpfad: slug,
  });

  // Read uploaded images for avatar thumbnail
  const [uploadedImages] = usePersistedState(`gallery_${galleryKey}_images`, {});
  const [titleImages] = usePersistedState(`gallery_${galleryKey}_titleImages`, {});
  // Read explicitly set App-Icon (set via "Als App-Icon" toolbar button)
  const [appIconSrc] = usePersistedState(`gallery_${galleryKey}_appIcon`, null);

  // Get avatar: only use explicitly set App-Icon (no auto-fallback)
  const getAvatarSrc = () => {
    if (appIconSrc) return appIconSrc;
    return null;
  };
  const avatarSrc = getAvatarSrc();

  const displayTitle = settings.titel || gallery.title;
  const displayUrl = settings.domain ? `https://${settings.domain}/${settings.domainpfad || slug}` : '';

  // Note: We intentionally do NOT auto-navigate when domainpfad changes.
  // Changing the URL during editing would re-mount the component with a different
  // galleryKey, causing all usePersistedState data (photos, albums) to become inaccessible.

  const renderTab = () => {
    switch (activeTab) {
      case 'bilder': return <BilderTab gallery={gallery} onCountsChange={setDynamicCounts} />;
      case 'einstellungen': return <EinstellungenTab gallery={gallery} />;
      case 'design': return <DesignTab gallery={gallery} />;
      case 'auswahlen': return <AuswahlenTab galleryKey={slug} />;
      case 'statistiken': return <StatistikenTab />;

      case 'verschicken': return <VerschickenTab gallery={gallery} galleryKey={galleryKey} settings={settings} uploadedImages={uploadedImages} appIconSrc={appIconSrc} />;
      default: return <BilderTab gallery={gallery} onCountsChange={setDynamicCounts} />;
    }
  };

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
