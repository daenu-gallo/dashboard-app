import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Tag, Edit3, ExternalLink, Mail, Trash2, LayoutGrid, List, Eye, Share2, Download, Image as ImageIcon, Heart } from 'lucide-react';
import { useGalleries, toSlug } from '../contexts/GalleryContext';
import './Galleries.css';

const GalleriesPage = () => {
  const navigate = useNavigate();
  const { galleries, loading, error, updateGallery, deleteGallery } = useGalleries();
  const [viewMode, setViewMode] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filtered galleries
  const filteredGalleries = galleries.filter(g => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      g.title.toLowerCase().includes(q) ||
      (g.internal_name || '').toLowerCase().includes(q);
    if (!tagQuery) return matchesSearch;
    const t = tagQuery.toLowerCase();
    if (Array.isArray(g.tags) && g.tags.some(tag => tag.toLowerCase().includes(t))) return matchesSearch;
    return false;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGalleries.length / perPage);
  const showPagination = filteredGalleries.length > 10;
  const paginatedGalleries = showPagination
    ? filteredGalleries.slice((currentPage - 1) * perPage, currentPage * perPage)
    : filteredGalleries;

  const handleSearchChange = (val) => { setSearchQuery(val); setCurrentPage(1); };
  const handleTagChange = (val) => { setTagQuery(val); setCurrentPage(1); };
  const handlePerPageChange = (val) => { setPerPage(Number(val)); setCurrentPage(1); };

  const handleDelete = async (id) => {
    try { await deleteGallery(id); } catch (err) { console.error('Delete error:', err); }
  };

  const handleToggleFavorite = async (gallery) => {
    try {
      // Store favorite in toggles JSONB
      const toggles = { ...(gallery.toggles || {}), favorite: !gallery.toggles?.favorite };
      await updateGallery(gallery.id, { toggles });
    } catch (err) { console.error('Favorite error:', err); }
  };

  const handleShare = (title) => {
    const slug = toSlug(title);
    const url = `/${slug}`;
    const subject = encodeURIComponent(`Galerie: ${title}`);
    const body = encodeURIComponent(`Hier ist der Link zu deiner Galerie:\n\n${window.location.origin}${url}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDownload = (gallery) => {
    alert(`Download für "${gallery.title}" wird vorbereitet... (${(gallery.zip_downloads || 0) + (gallery.single_downloads || 0)} Downloads bisher)`);
  };

  const [linkModal, setLinkModal] = useState(null);

  // Format date from ISO string
  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('de-DE');
  };
  const formatDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE') + ' - ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Gallery card tags display
  const GalleryTags = ({ gallery }) => {
    if (!gallery.tags || gallery.tags.length === 0) return null;
    return (
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
        {gallery.tags.map(tag => (
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

  // Gallery card image - try to load the title image from localStorage
  const GalleryCardImage = ({ gallery, className, children }) => {
    const slug = gallery.slug;
    const title = gallery.title || slug;
    let thumbSrc = null;
    try {
      // Try title key first (BilderTab uses gallery.title), then slug
      for (const key of [title, slug]) {
        if (thumbSrc) break;
        const stored = localStorage.getItem(`gallery_${key}_titleImages`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const first = parsed[0] || parsed;
          if (first?.titelbild?.src) { thumbSrc = first.titelbild.src; break; }
        }
        // Fallback: appIcon
        const appIcon = localStorage.getItem(`gallery_${key}_appIcon`);
        if (appIcon) {
          try { const parsed = JSON.parse(appIcon); if (typeof parsed === 'string' && parsed.startsWith('data:')) { thumbSrc = parsed; break; } } catch (_) {}
          if (typeof appIcon === 'string' && appIcon.startsWith('data:')) { thumbSrc = appIcon; break; }
        }
        // Fallback: first uploaded image
        const imgs = localStorage.getItem(`gallery_${key}_images`);
        if (imgs) {
          const parsed = JSON.parse(imgs);
          const firstAlbum = parsed[0] || parsed[Object.keys(parsed)[0]];
          if (Array.isArray(firstAlbum) && firstAlbum[0]?.src) { thumbSrc = firstAlbum[0].src; break; }
        }
      }
    } catch (e) {}
    return (
      <Link to={`/galleries/${slug}`} className={className || 'gallery-card-image'} style={{
        background: thumbSrc ? 'transparent' : '#e8e8e8',
      }}>
        {thumbSrc ? (
          <img src={thumbSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
        ) : (
          <ImageIcon size={className === 'gallery-thumbnail' ? 14 : 28} style={{ color: 'rgba(0,0,0,0.15)' }} />
        )}
        {children}
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="galleries-page">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          Galerien werden geladen...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="galleries-page">
        <div style={{ textAlign: 'center', padding: '3rem', color: '#c00' }}>
          Fehler: {error}
        </div>
      </div>
    );
  }

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
                  <Link to={`/galleries/${gallery.slug}`} className="gallery-card-title">{gallery.title}</Link>
                  <button
                    className="gallery-card-edit"
                    onClick={() => navigate(`/galleries/${gallery.slug}`)}
                    title="Bearbeiten"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
                <div className="gallery-card-actions">
                  <button title={`${gallery.views || 0} Aufrufe`} onClick={() => window.open(`/${gallery.slug}`, '_blank')}><Eye size={13} /> <span>{gallery.views || 0}</span></button>
                  <button title="Link teilen" onClick={() => handleShare(gallery.title)}><Share2 size={13} /></button>
                  <button title={`${(gallery.zip_downloads || 0) + (gallery.single_downloads || 0)} Downloads`} onClick={() => handleDownload(gallery)}><Download size={13} /></button>
                  <button title="Favorit" className={gallery.toggles?.favorite ? 'text-red' : ''} onClick={() => handleToggleFavorite(gallery)}><Heart size={13} fill={gallery.toggles?.favorite ? 'currentColor' : 'none'} /></button>
                  <button title="Tags" onClick={() => navigate(`/galleries/${gallery.slug}`)}><Tag size={13} /></button>
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
                <th>Letzte Änderung</th>
                <th>Erstellt</th>
                <th className="action-col">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGalleries.map((gallery) => (
                <tr key={gallery.id}>
                  <td className="img-col">
                    <GalleryCardImage gallery={gallery} className="gallery-thumbnail">
                      {null}
                    </GalleryCardImage>
                  </td>
                  <td className="font-medium">
                    <Link to={`/galleries/${gallery.slug}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>{gallery.title}</Link>
                  </td>
                  <td className="text-muted">
                    {gallery.internal_name || ''}
                    <GalleryTags gallery={gallery} />
                  </td>
                  <td>{gallery.views || 0}</td>
                  <td>{gallery.shared || 0}</td>
                  <td>{gallery.zip_downloads || 0}</td>
                  <td>{gallery.single_downloads || 0}</td>
                  <td className="text-muted text-sm">{formatDateTime(gallery.updated_at)}</td>
                  <td className="text-muted text-sm">{formatDate(gallery.created_at)}</td>
                  <td className="action-col">
                    <div className="actions-inner">
                      <button title="Bearbeiten" onClick={() => navigate(`/galleries/${gallery.slug}`)}><Edit3 size={16} /></button>
                      <button title="Kundenansicht öffnen" onClick={() => window.open(`/${gallery.slug}`, '_blank')}><ExternalLink size={16} /></button>
                      <button title="E-Mail senden" onClick={() => handleShare(gallery.title)}><Mail size={16} /></button>
                      <button title="Löschen" className="text-red" onClick={() => handleDelete(gallery.id)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
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
