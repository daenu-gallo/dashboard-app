import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Tag, Edit3, ExternalLink, MessageCircle, Trash2, LayoutGrid, List, Eye, Share2, Download, Image as ImageIcon, Heart } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import './Galleries.css';

const toSlug = (title) => title.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// Mock data - fresh website, all counts at 0
const galleries = [
  { id: 1, title: 'vorschau-hochzeit', name: 'Hochzeitsfotograf Fotohahn', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#8b6e4e' },
  { id: 2, title: 'SV Strättligen', name: '', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#4a6e5a' },
  { id: 3, title: 'Hochzeit Edith & Thomas', name: 'Hochzeitsfotos', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#6b4d33' },
  { id: 4, title: 'Hochzeit Beat & Pamela', name: 'Hochzeit', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#5c7a4d' },
  { id: 5, title: 'Hochzeit Zina & Mohamed', name: '', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#7d6245' },
  { id: 6, title: 'Hochzeit Marita & Martin', name: 'Hochzeit', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#917b5a' },
  { id: 7, title: 'Engagement Fotoshooting Janissa & Rory', name: '', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#556b4e' },
  { id: 8, title: 'Hochzeit Sara & Irene', name: '', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#6a5c3d' },
  { id: 9, title: 'Hochzeit Sanja & Emanuel Küpfer', name: '', views: 0, shared: 0, zip: 0, single: 0, shop: false, lastView: '-', lastEdit: '-', created: '13.03.2026', color: '#4d6b5c' },
];

const GalleriesPage = () => {
  const navigate = useNavigate();
  const [galleryList, setGalleryList] = usePersistedState('galleries_list_v2', galleries);
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filtered galleries with tag support
  const filteredGalleries = galleryList.filter(g => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || g.title.toLowerCase().includes(q) || g.name.toLowerCase().includes(q);
    if (!tagQuery) return matchesSearch;
    // Read tags from localStorage for filtering
    const t = tagQuery.toLowerCase();
    try {
      const stored = localStorage.getItem(`gallery_${g.title}_tags`);
      if (stored) {
        const gTags = JSON.parse(stored);
        if (Array.isArray(gTags) && gTags.some(tag => tag.toLowerCase().includes(t))) return matchesSearch;
      }
    } catch (e) { }
    return false;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGalleries.length / perPage);
  const showPagination = filteredGalleries.length > 10;
  const paginatedGalleries = showPagination
    ? filteredGalleries.slice((currentPage - 1) * perPage, currentPage * perPage)
    : filteredGalleries;

  // Reset page when search changes
  const handleSearchChange = (val) => { setSearchQuery(val); setCurrentPage(1); };
  const handleTagChange = (val) => { setTagQuery(val); setCurrentPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setCurrentPage(1); };

  const handleDelete = (id) => {
    setGalleryList(prev => prev.filter(g => g.id !== id));
  };

  const [linkModal, setLinkModal] = useState(null); // { url: '', copied: false }

  const handleShare = (title) => {
    const url = `https://app.fotohahn.ch/${toSlug(title)}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkModal({ url, copied: true });
      setTimeout(() => setLinkModal(prev => prev ? { ...prev, copied: true } : null), 100);
    }).catch(() => {
      setLinkModal({ url, copied: false });
    });
  };

  const handleToggleFavorite = (id) => {
    setGalleryList(prev => prev.map(g => g.id === id ? { ...g, favorite: !g.favorite } : g));
  };

  const handleDownload = (gallery) => {
    alert(`Download für "${gallery.title}" wird vorbereitet... (${gallery.zip + gallery.single} Downloads bisher)`);
  };

  const handlePreview = (id) => {
    window.open(`/galleries/${id}/preview`, '_blank');
  };

  // Sub-component to read gallery thumbnail from persisted state
  const GalleryCardImage = ({ gallery, className, children }) => {
    const slug = toSlug(gallery.title);
    // Use the original title as key (matches how GalleryDetailPage stores data)
    const galleryKey = gallery.title;
    const [appIconSrc] = usePersistedState(`gallery_${galleryKey}_appIcon`, null);
    const [titleImages] = usePersistedState(`gallery_${galleryKey}_titleImages`, {});
    const [uploadedImages] = usePersistedState(`gallery_${galleryKey}_images`, {});

    // Priority: appIcon > titelbild > first uploaded image > placeholder
    let imgSrc = appIconSrc;
    if (!imgSrc) {
      for (const idx of Object.keys(titleImages)) {
        if (titleImages[idx]?.titelbild?.src) { imgSrc = titleImages[idx].titelbild.src; break; }
      }
    }
    if (!imgSrc) {
      for (const idx of Object.keys(uploadedImages)) {
        if (uploadedImages[idx]?.length > 0) { imgSrc = uploadedImages[idx][0].src; break; }
      }
    }

    return (
      <Link to={`/galleries/${slug}`} className={className || 'gallery-card-image'} style={{
        background: imgSrc ? `url(${imgSrc}) center / cover no-repeat` : '#e8e8e8'
      }}>
        {!imgSrc && <ImageIcon size={className === 'gallery-thumbnail' ? 14 : 28} style={{ color: 'rgba(0,0,0,0.15)' }} />}
        {children}
      </Link>
    );
  };

  // Sub-component to read and display gallery tags
  const GalleryTags = ({ gallery }) => {
    const galleryKey = gallery.title;
    const [tags] = usePersistedState(`gallery_${galleryKey}_tags`, []);

    if (!tags || tags.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: 'var(--color-primary)',
            color: 'white',
            padding: '0.1rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.65rem',
            fontWeight: 500,
          }}>{tag}</span>
        ))}
      </div>
    );
  };




  return (
    <div className="galleries-page">
      <div className="page-header">
        <h1 className="text-h1">Meine Galerien</h1>
        <div className="view-toggle">
          <span className="text-sm text-muted">Ansicht</span>
          <button
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      <div className="filters card">
        <div className="search-box">
          <Search size={16} className="text-muted" />
          <input type="text" placeholder="Suche" value={searchQuery} onChange={e => handleSearchChange(e.target.value)} />
        </div>
        <div className="tags-box">
          <Tag size={16} className="text-muted" />
          <input type="text" placeholder="Nach Galerie Tags filtern" value={tagQuery} onChange={e => handleTagChange(e.target.value)} />
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="galleries-grid">
          {filteredGalleries.map((gallery) => (
            <div key={gallery.id} className="gallery-card">
              <GalleryCardImage gallery={gallery} />
              <div className="gallery-card-info">
                <div className="gallery-card-title-row">
                  <Link to={`/galleries/${toSlug(gallery.title)}`} className="gallery-card-title">{gallery.title}</Link>
                  <button
                    className="gallery-card-edit"
                    onClick={() => navigate(`/galleries/${toSlug(gallery.title)}`)}
                    title="Bearbeiten"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <div className="gallery-card-actions">
                  <button title={`${gallery.views} Aufrufe`} onClick={() => handlePreview(gallery.id)}><Eye size={13} /> <span>{gallery.views}</span></button>
                  <button title="Link teilen" onClick={() => handleShare(gallery.title)}><Share2 size={13} /></button>
                  <button title={`${gallery.zip + gallery.single} Downloads`} onClick={() => handleDownload(gallery)}><Download size={13} /></button>
                  <button title="Favorit" className={gallery.favorite ? 'text-red' : ''} onClick={() => handleToggleFavorite(gallery.id)}><Heart size={13} fill={gallery.favorite ? 'currentColor' : 'none'} /></button>
                  <button title="Tags" onClick={() => navigate(`/galleries/${toSlug(gallery.title)}`)}><Tag size={13} /></button>
                  <button title="Löschen" className="text-red" onClick={(e) => { e.stopPropagation(); handleDelete(gallery.id); }}><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="table-container card">
          <table className="galleries-table">
            <thead>
              <tr>
                <th className="img-col"></th>
                <th>Titel</th>
                <th>Name</th>
                <th>Aufrufe</th>
                <th>Geteilt</th>
                <th>ZIP-Downloads</th>
                <th>Einzeldownloads</th>
                <th>Letzter Aufruf</th>
                <th>Letzte Änderung</th>
                <th>Erstellt</th>
                <th className="action-col">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGalleries.map((gallery) => {
                const listSlug = toSlug(gallery.title);
                return (
                <tr key={gallery.id}>
                  <td className="img-col">
                    <GalleryCardImage gallery={gallery} className="gallery-thumbnail">
                      {null}
                    </GalleryCardImage>
                  </td>
                  <td className="font-medium">
                    <Link to={`/galleries/${toSlug(gallery.title)}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{gallery.title}</Link>
                  </td>
                  <td className="text-muted">
                    {gallery.name}
                    <GalleryTags gallery={gallery} />
                  </td>
                  <td>{gallery.views}</td>
                  <td>{gallery.shared}</td>
                  <td>{gallery.zip}</td>
                  <td>{gallery.single}</td>
                  <td className="text-muted text-sm">{gallery.lastView}</td>
                  <td className="text-muted text-sm">{gallery.lastEdit}</td>
                  <td className="text-muted text-sm">{gallery.created}</td>
                  <td className="action-col">
                    <div className="actions-inner">
                      <button title="Bearbeiten" onClick={() => navigate(`/galleries/${toSlug(gallery.title)}`)}><Edit3 size={16} /></button>
                      <button title="Kundenansicht öffnen" onClick={() => window.open(`/${toSlug(gallery.title)}`, '_blank')}><ExternalLink size={16} /></button>
                      <button title="Link teilen" onClick={() => handleShare(gallery.title)}><MessageCircle size={16} /></button>
                      <button title="Löschen" className="text-red" onClick={() => handleDelete(gallery.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {showPagination && (
        <div className="pagination-bar">
          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`pagination-page ${currentPage === i + 1 ? 'active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            {currentPage < totalPages && (
              <button className="pagination-next" onClick={() => setCurrentPage(p => p + 1)}>
                Nächste Seite
              </button>
            )}
          </div>
          <div className="pagination-perpage">
            <span>Ergebnisse pro Seite</span>
            <select value={perPage} onChange={e => handlePerPageChange(e.target.value)}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}
      
      {/* ── Link Modal ── */}
      {linkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setLinkModal(null)}>
          <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#4a7c59', color: '#fff', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{linkModal.copied ? '✓ Link kopiert!' : 'Galerie-Link'}</span>
              <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setLinkModal(null)}>✕</span>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.75rem' }}>
                {linkModal.copied ? 'Der Link wurde in die Zwischenablage kopiert:' : 'Kopiere den folgenden Link:'}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  readOnly
                  value={linkModal.url}
                  style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #ddd', borderRadius: 6, fontSize: '0.85rem', background: '#f8f8f8', color: '#333' }}
                  onClick={e => e.target.select()}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(linkModal.url).then(() => {
                      setLinkModal(prev => ({ ...prev, copied: true }));
                    });
                  }}
                  style={{ padding: '0.5rem 1rem', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {linkModal.copied ? '✓ Kopiert' : 'Kopieren'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GalleriesPage;
