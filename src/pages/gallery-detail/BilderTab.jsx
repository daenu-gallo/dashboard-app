import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useGalleryImages } from '../../hooks/useGalleryImages';
import { useWatermarks } from '../../hooks/useWatermarks';
import { useBrand } from '../../contexts/BrandContext';
import { supabase } from '../../lib/supabaseClient';
import { Plus, ChevronDown, ChevronUp, ChevronsDown, Type, Eye, Download, Droplets, Upload, FolderPlus, Play, Image as ImageIcon, Smartphone, Maximize, X, Info, Droplet, Trash2, Video, FolderOpen, Star, Bookmark, ArrowUp, ArrowDown, ArrowUpAZ, ArrowDownAZ, GripVertical, Monitor, Pencil } from 'lucide-react';

const defaultAlbums = [];

const photoColors = [
  '#8b6e4e','#96785c','#a0846a','#7a5c40','#6b4d33',
  '#5c7a4d','#4d6b5c','#6a5c3d','#7d6245','#8e7355',
  '#4a6e5a','#6d7a50','#9b8462','#a39070','#b5a080',
  '#556b4e','#7a8b6e','#637a55','#917b5a','#a88f6d',
  '#5e8b6a','#7aa06e','#88976b','#6b8855','#4e7a40',
  '#887050','#9a8260','#7b6e48','#685c3a','#a09570',
  '#748b60','#8a9b70','#6e7b55','#9b8b68',
];

/* ---- Video Option Modal ---- */
const VideoModal = ({ onClose, onUploadLocal, onEmbedUrl }) => (
  <div className="video-modal-overlay" onClick={onClose}>
    <div className="video-modal" onClick={e => e.stopPropagation()}>
      <div className="video-modal-header">
        <span>Wähle eine Option</span>
        <button className="video-modal-close" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="video-modal-body">
        <button className="video-modal-btn" onClick={onUploadLocal}>
          Video hochladen (Festplatte)
        </button>
        <button className="video-modal-btn embed" onClick={onEmbedUrl}>
          Video einbinden (Youtube, Vimeo, Pixellu)
        </button>
      </div>
    </div>
  </div>
);

/* ---- Video Embed Code Modal ---- */
const VideoEmbedModal = ({ onClose, onSubmit }) => {
  const [embedCode, setEmbedCode] = React.useState('');
  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal video-embed-modal" onClick={e => e.stopPropagation()}>
        <div className="video-modal-header">
          <span>Video</span>
          <button className="video-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="video-embed-form">
          <div className="video-embed-label-row">
            <label>Embed Code einfügen:</label>

          </div>
          <textarea
            className="video-embed-textarea"
            placeholder="Füge einen Embed Code (YouTube, Vimeo etc.) hier ein..."
            value={embedCode}
            onChange={e => setEmbedCode(e.target.value)}
            rows={4}
          />
          <div className="video-embed-actions">
            <button
              className="video-embed-update-btn"
              onClick={() => { if (embedCode.trim()) onSubmit(embedCode.trim()); }}
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- Album hinzufügen Modal ---- */
const AlbumModal = ({ onClose, onSubmit, watermarks = [] }) => {
  const [albumTitle, setAlbumTitle] = React.useState('');
  const [albumText, setAlbumText] = React.useState('');
  const [sortierung, setSortierung] = React.useState('Aufnahmedatum');
  const [watermark, setWatermark] = React.useState('Kein Wasserzeichen');
  const [downloadEnabled, setDownloadEnabled] = React.useState(true);
  const [asFirst, setAsFirst] = React.useState(false);

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal album-add-modal" onClick={e => e.stopPropagation()}>
        <div className="video-modal-header">
          <span>Album hinzufügen</span>
          <button className="video-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="album-add-form">
          <div className="album-form-group">
            <label>Album Titel</label>
            <input type="text" placeholder="Album Titel" value={albumTitle} onChange={e => setAlbumTitle(e.target.value)} />
          </div>
          <div className="album-form-group">
            <label>Text</label>
            <textarea placeholder="Hinterlasse eine Nachricht für deinen Kunden" value={albumText} onChange={e => setAlbumText(e.target.value)} rows={3} />
          </div>
          <div className="album-form-group">
            <label>Sortierung</label>
            <select value={sortierung} onChange={e => setSortierung(e.target.value)}>
              <option>Aufnahmedatum</option>
              <option>Dateiname</option>
              <option>Manuelle Sortierung</option>
            </select>
          </div>
          <div className="album-form-group">
            <label>Wasserzeichen</label>
            <select value={watermark} onChange={e => setWatermark(e.target.value)}>
              <option value="">Kein Wasserzeichen</option>
              {watermarks.map((wm) => (
                <option key={wm.id} value={String(wm.id)}>
                  {wm.name || wm.text || `Wasserzeichen`} ({wm.wmType === 'tile' ? 'Kachel' : wm.wmType === 'text' ? 'Text' : 'Bild'})
                </option>
              ))}
            </select>
            {/* Live watermark preview */}
            {(() => {
              const selWm = watermarks.find(wm => String(wm.id) === watermark);
              if (!selWm) return null;
              const posMap = {
                'oben-links': { top: '6%', left: '6%' },
                'oben-mitte': { top: '6%', left: '50%', transform: 'translateX(-50%)' },
                'oben-rechts': { top: '6%', right: '6%' },
                'mitte-links': { top: '50%', left: '6%', transform: 'translateY(-50%)' },
                'mitte': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
                'mitte-rechts': { top: '50%', right: '6%', transform: 'translateY(-50%)' },
                'unten-links': { bottom: '6%', left: '6%' },
                'unten-mitte': { bottom: '6%', left: '50%', transform: 'translateX(-50%)' },
                'unten-rechts': { bottom: '6%', right: '6%' },
              };
              const opacityVal = (selWm.transparency ?? 50) / 100;
              const pos = selWm.position || 'mitte';
              return (
                <div style={{ marginTop: '0.5rem', width: '100%', aspectRatio: '16/10', borderRadius: 8, overflow: 'hidden', position: 'relative', background: '#333' }}>
                  <img src="/watermark-sample-bg.png" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {selWm.wmType === 'image' && selWm.image && (
                    <img src={selWm.image} alt="" style={{
                      position: 'absolute', maxWidth: '35%', maxHeight: '35%', objectFit: 'contain',
                      opacity: opacityVal, pointerEvents: 'none',
                      transform: (posMap[pos]?.transform || '') + ` scale(${(selWm.scale ?? 100) / 100})`,
                      ...posMap[pos],
                    }} />
                  )}
                  {selWm.wmType === 'text' && (() => {
                    const fontStr = selWm.font || 'Open Sans, 64px, weiß';
                    const [fontName, fontSizeStr] = fontStr.split(',').map(s => s.trim());
                    const fontPx = parseInt(fontSizeStr) || 64;
                    const fontColor = fontStr.includes('schwarz') ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
                    return (
                      <span style={{
                        position: 'absolute', fontFamily: `'${fontName}', sans-serif`, fontSize: fontPx * 0.35,
                        fontWeight: 700, color: fontColor, opacity: opacityVal, pointerEvents: 'none',
                        textShadow: '0 2px 8px rgba(0,0,0,0.4)', whiteSpace: 'nowrap', ...posMap[pos],
                      }}>
                        {selWm.text || selWm.name}
                      </span>
                    );
                  })()}
                  {selWm.wmType === 'tile' && selWm.image && (() => {
                    const spacing = selWm.tileSpacing ?? 120;
                    const size = selWm.tileSize ?? 60;
                    const scaledSize = size * 0.6;
                    const scaledSpacing = spacing * 0.6;
                    const tiles = [];
                    for (let row = -1; row < 5; row++) {
                      for (let col = -1; col < 6; col++) {
                        const x = col * scaledSpacing + (row % 2 ? scaledSpacing / 2 : 0);
                        const y = row * scaledSpacing;
                        tiles.push(
                          <img key={`${row}-${col}`} src={selWm.image} alt="" style={{
                            position: 'absolute', width: scaledSize, height: scaledSize, objectFit: 'contain',
                            left: x, top: y, opacity: opacityVal, transform: 'rotate(-15deg)', pointerEvents: 'none',
                          }} />
                        );
                      }
                    }
                    return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>{tiles}</div>;
                  })()}
                </div>
              );
            })()}
          </div>
          <div className="album-form-toggle-row">
            <div className={`album-toggle ${downloadEnabled ? 'on' : ''}`} onClick={() => setDownloadEnabled(!downloadEnabled)}>
              <div className="album-toggle-knob" />
            </div>
            <span>Download</span>
          </div>
          <div className="album-form-toggle-row">
            <div className={`album-toggle ${asFirst ? 'on' : ''}`} onClick={() => setAsFirst(!asFirst)}>
              <div className="album-toggle-knob" />
            </div>
            <span>Als erstes Album hinzufügen</span>
          </div>
          <button
            className="album-add-submit-btn"
            onClick={() => {
              if (albumTitle.trim()) {
                onSubmit({ name: albumTitle.trim(), asFirst });
              }
            }}
          >
            Album hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---- Video Card ---- */
const getYouTubeId = (embedCode) => {
  if (!embedCode) return null;
  // Match youtube.com/embed/ID or youtu.be/ID or watch?v=ID
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = embedCode.match(p);
    if (match) return match[1];
  }
  return null;
};

const VideoCard = ({ video, onDelete, onReplace }) => {
  const ytId = video.type === 'embed' ? getYouTubeId(video.url) : null;

  return (
    <div className="photo-card video-uploaded-card">
      <div className="video-card-content">
        {video.type === 'embed' ? (
          ytId ? (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <img
                src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                alt="Video"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* YouTube play button overlay */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 48, height: 34, borderRadius: 8,
                background: 'rgba(255, 0, 0, 0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Play size={20} fill="white" color="white" />
              </div>
            </div>
          ) : (
            <div className="video-embed-placeholder">
              <span className="video-badge">🎬</span>
              <span className="video-player-label">Embedded Video</span>
            </div>
          )
        ) : (
          <video src={video.src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <div className="video-icon-badge"><Video size={12} /></div>
        {/* Hover overlay — like photos */}
        <div className="video-hover-overlay">
          <span className="video-hover-label">Video austauschen</span>
          <div className="video-hover-actions">
            <button title="Video austauschen" onClick={onReplace}><Upload size={14} /></button>
            <button title="Löschen" onClick={onDelete}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---- Watermark Selection Modal ---- */
const WatermarkModal = ({ photoSrc, watermarks, onClose, onApply }) => {
  const [selectedIdx, setSelectedIdx] = React.useState(-1);
  const selectedWm = selectedIdx >= 0 ? watermarks[selectedIdx] : null;

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="watermark-select-modal" onClick={e => e.stopPropagation()}>
        <div className="watermark-select-header">
          <span>Wasserzeichen</span>
          <button className="video-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="watermark-select-body">
          <select
            className="watermark-select-dropdown"
            value={selectedIdx}
            onChange={e => setSelectedIdx(Number(e.target.value))}
          >
            <option value={-1}>Kein Wasserzeichen</option>
            {watermarks.map((wm, i) => (
              <option key={i} value={i}>{wm.name || wm.text || `Wasserzeichen ${i + 1}`}</option>
            ))}
          </select>

          {selectedWm && (
            <div className="watermark-select-preview">
              <img src={photoSrc} alt="" className="watermark-preview-bg" />
              {selectedWm.type === 'image' && selectedWm.src ? (
                <img
                  src={selectedWm.src}
                  alt=""
                  className="watermark-preview-overlay"
                  style={{ opacity: (selectedWm.transparency || 50) / 100, maxWidth: `${selectedWm.scale || 30}%` }}
                />
              ) : (
                <span className="watermark-preview-text" style={{
                  opacity: (selectedWm.transparency || 50) / 100,
                  color: selectedWm.color || '#fff',
                }}>{selectedWm.text || 'Wasserzeichen'}</span>
              )}
            </div>
          )}



          <button
            className="watermark-apply-btn"
            disabled={selectedIdx < 0}
            onClick={() => { if (selectedIdx >= 0) { onApply(selectedIdx); onClose(); } }}
          >
            Wasserzeichen auswählen
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---- Photo Card with Hover Toolbar ---- */
const PhotoCard = ({ src, filename, colorIdx, onDelete, position, onSetTitelbild, onSetMobileTitelbild, onSetAppIcon, onApplyWatermark, showWatermark, watermarkText }) => {
  const [hoveredAction, setHoveredAction] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmTimer = useRef(null);
  const isReal = !!src;
  const isTitleCard = position === 0 || position === 1;

  const handleDeleteClick = () => {
    if (confirmDelete) {
      // Second click — actually delete
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      setConfirmDelete(false);
      onDelete();
    } else {
      // First click — show confirmation for 3 seconds
      setConfirmDelete(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const handleDownload = async () => {
    if (!src) return;
    // Convert data URL to blob
    const parts = src.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const raw = atob(parts[1]);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    const blob = new Blob([arr], { type: mime });
    const name = filename || 'bild.jpg';

    if (window.showSaveFilePicker) {
      try {
        const ext = name.match(/\.(\w+)$/)?.[1] || 'jpg';
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'Bild', accept: { [mime]: ['.' + ext] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }
    // Fallback
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const [showLightbox, setShowLightbox] = useState(false);

  const handleFullscreen = () => {
    if (!src) return;
    setShowLightbox(true);
  };

  // Close lightbox on ESC
  useEffect(() => {
    if (!showLightbox) return;
    const handler = (e) => { if (e.key === 'Escape') setShowLightbox(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLightbox]);

  const actions = [
    { id: 'titelbild', icon: <ImageIcon size={13} />, label: 'Als Titelbild', action: onSetTitelbild },
    { id: 'mobile', icon: <Smartphone size={13} />, label: 'Als Titelbild für mobile Geräte', action: onSetMobileTitelbild },
    { id: 'appicon', icon: <Monitor size={13} />, label: 'Als App-Icon', action: onSetAppIcon },
    { id: 'vollbild', icon: <Maximize size={13} />, label: 'Im Vollbildmodus öffnen', action: handleFullscreen },
    { id: 'filename', icon: <X size={13} />, label: filename || 'Bild' },
    { id: 'download', icon: <Download size={13} />, label: 'Originalbild herunterladen', action: handleDownload },
    { id: 'watermark', icon: <Droplet size={13} />, label: 'Wasserzeichen', action: onApplyWatermark },
    { id: 'delete', icon: <Trash2 size={13} />, label: confirmDelete ? 'Wirklich löschen?' : 'Löschen', action: handleDeleteClick },
  ];

  return (
    <div
      className={`photo-card ${isTitleCard ? 'title-card has-toolbar' : 'has-toolbar'}`}
      style={isReal ? {} : {
        background: '#e8e8e8'
      }}
    >
      {isReal ? (
        <img src={src} alt={filename} loading="lazy" decoding="async" />
      ) : (
        <div className="photo-placeholder" style={{ color: 'rgba(0,0,0,0.2)', fontSize: '0.5rem' }}>
          <ImageIcon size={20} />
        </div>
      )}

      {/* Watermark overlay */}
      {isReal && showWatermark && (
        <div className="photo-watermark-overlay">
          {watermarkText || ''}
        </div>
      )}

      {isTitleCard && isReal && (
        <div className="photo-hover-toolbar title-card-toolbar">
          <div className="photo-toolbar-icons">
            <button
              title={confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
              onClick={handleDeleteClick}
              style={{ color: confirmDelete ? '#fff' : '#e53935', background: confirmDelete ? '#e53935' : 'transparent', borderRadius: 4, padding: '2px 6px', transition: 'all 0.2s' }}
            >
              {confirmDelete ? <span style={{ fontSize: '0.65rem' }}>Wirklich löschen?</span> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      )}

      {/* Full hover toolbar only for uploaded photos (not title cards) */}
      {!isTitleCard && (
        <div className="photo-hover-toolbar">
          {hoveredAction && <div className="photo-tooltip">{hoveredAction}</div>}
          <div className="photo-toolbar-icons">
            {actions.map((a) => (
              <button
                key={a.id}
                className={`toolbar-icon-btn ${a.id === 'delete' ? 'danger' : ''}`}
                onMouseEnter={() => setHoveredAction(a.label)}
                onMouseLeave={() => setHoveredAction(null)}
                onClick={a.action}
                title={a.label}
              >
                {a.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox overlay */}
      {showLightbox && ReactDOM.createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out',
        }} onClick={() => setShowLightbox(false)}>
          <button onClick={(e) => { e.stopPropagation(); setShowLightbox(false); }} style={{
            position: 'absolute', top: 16, right: 16, background: 'none', border: 'none',
            color: '#fff', fontSize: 28, cursor: 'pointer', zIndex: 100000, lineHeight: 1,
          }}>✕</button>
          <img src={src} alt={filename || 'Bild'} onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', cursor: 'default',
            borderRadius: 4, boxShadow: '0 0 60px rgba(0,0,0,0.5)',
          }} />
        </div>,
        document.body
      )}
    </div>
  );
};

/* ---- Main BilderTab ---- */
const BilderTab = ({ gallery, supabaseGallery, updateGallery, onCountsChange, onAppIconChange }) => {
  const galleryKey = gallery?.title || 'default';
  const { globalBrand } = useBrand();
  const [expandedAlbums, setExpandedAlbums] = usePersistedState(`gallery_${galleryKey}_expanded`, {});

  // ── Albums: Initialize from Supabase, fallback to defaults ──
  const sbAlbums = supabaseGallery?._loadedAlbums; // will be set via useEffect
  const [albums, setAlbums] = useState(() => {
    // Will be overwritten once Supabase data loads
    return defaultAlbums;
  });
  const [albumNames, setAlbumNames] = useState(() =>
    defaultAlbums.reduce((acc, a, idx) => ({ ...acc, [idx]: a.name }), {})
  );
  const [albumToggles, setAlbumToggles] = useState({});
  const [albumTexts, setAlbumTexts] = useState({});
  const [albumsLoaded, setAlbumsLoaded] = useState(false);

  // Load albums from Supabase on mount
  useEffect(() => {
    if (!supabaseGallery?.id) return;
    const loadAlbums = async () => {
      try {
        const { data, error } = await supabase
          .from('albums')
          .select('*')
          .eq('gallery_id', supabaseGallery.id)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          const loadedAlbums = data.map(a => ({
            name: a.name,
            count: 0,
            previewCount: 2,
            totalPhotos: 2,
            _supabaseId: a.id, // Keep Supabase ID for CRUD
          }));
          setAlbums(loadedAlbums);
          const names = {};
          const toggles = {};
          const texts = {};
          data.forEach((a, idx) => {
            names[idx] = a.name;
            if (a.toggles) {
              toggles[idx] = a.toggles;
              if (a.toggles._text) texts[idx] = a.toggles._text;
            }
          });
          setAlbumNames(names);
          setAlbumToggles(toggles);
          setAlbumTexts(texts);
        }
        setAlbumsLoaded(true);
      } catch (err) {
        console.error('[BilderTab] Error loading albums:', err);
        setAlbumsLoaded(true);
      }
    };
    loadAlbums();
  }, [supabaseGallery?.id]);

  // Sync album changes back to Supabase (debounced)
  const albumSyncTimer = useRef(null);
  const albumSyncFirstRender = useRef(true);
  useEffect(() => {
    if (albumSyncFirstRender.current) { albumSyncFirstRender.current = false; return; }
    if (!supabaseGallery?.id || !albumsLoaded) return;
    if (albumSyncTimer.current) clearTimeout(albumSyncTimer.current);
    albumSyncTimer.current = setTimeout(async () => {
      try {
        // Delete all existing albums for this gallery and re-insert
        await supabase.from('albums').delete().eq('gallery_id', supabaseGallery.id);
        if (albums.length > 0) {
          const albumsToInsert = albums.map((a, idx) => ({
            gallery_id: supabaseGallery.id,
            name: albumNames[idx] || a.name,
            sort_order: idx,
            toggles: {
              ...(albumToggles[idx] || {}),
              _text: albumTexts[idx] || undefined,
            },
          }));
          await supabase.from('albums').insert(albumsToInsert);
        }
      } catch (err) {
        console.error('[BilderTab] Album sync error:', err);
      }
    }, 2000);
    return () => { if (albumSyncTimer.current) clearTimeout(albumSyncTimer.current); };
  }, [albums, albumNames, albumToggles, albumTexts, albumsLoaded]);

  // ── Media: Images from NAS via Upload-API ──
  const galleryId = supabaseGallery?.id;
  const {
    images: uploadedImages,
    titleImages: nasaTitleImages,
    appIconUrl,
    loading: imagesLoading,
    uploadProgress: apiUploadProgress,
    uploadImages,
    deleteImage: apiDeleteImage,
    setTitleImage: apiSetTitleImage,
    setMobileTitleImage: apiSetMobileTitleImage,
    setAppIcon: apiSetAppIcon,
    refreshImages,
  } = useGalleryImages(galleryId);

  // Videos still in localStorage (embeds / YouTube URLs, not large files)
  const [uploadedVideos, setUploadedVideos] = usePersistedState(`gallery_${galleryKey}_videos`, {});
  const [videoModalAlbum, setVideoModalAlbum] = useState(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = usePersistedState(`gallery_${galleryKey}_filter`, []);
  const fileInputRefs = useRef({});
  const videoInputRef = useRef(null);
  const [confirmDeleteAlbum, setConfirmDeleteAlbum] = useState(null);
  const confirmDeleteAlbumTimer = useRef(null);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(null);
  const [selectedAlbums, setSelectedAlbums] = useState({});
  const [textModalAlbum, setTextModalAlbum] = useState(null);
  const [eyeOverlayAlbum, setEyeOverlayAlbum] = useState(null);

  // Read watermark settings
  const [watermarks] = useWatermarks();
  const [watermarkModalTarget, setWatermarkModalTarget] = useState(null);

  // Apply watermark to an image using a specific watermark index
  const applyWatermarkWithIndex = (wmIdx) => {
    if (!watermarkModalTarget) return;
    const { albumIdx, imgIdx } = watermarkModalTarget;
    const wm = watermarks[wmIdx];
    if (!wm) return;

    // Album-level watermark: just save the watermark ID in albumToggles
    if (imgIdx == null) {
      setAlbumToggles(prev => ({
        ...prev,
        [albumIdx]: {
          ...(prev[albumIdx] || {}),
          watermark: true,
          watermarkId: String(wm.id),
        },
      }));
      setWatermarkModalTarget(null);
      return;
    }

    // Single-image watermark: bake into the image via canvas
    const img = uploadedImages[albumIdx]?.[imgIdx];
    if (!img || !img.src) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const baseImg = new Image();
    baseImg.onload = () => {
      canvas.width = baseImg.width;
      canvas.height = baseImg.height;
      ctx.drawImage(baseImg, 0, 0);

      const scale = (wm.scale || 30) / 100;
      const opacity = (wm.transparency || 50) / 100;
      ctx.globalAlpha = opacity;

      if (wm.type === 'image' && wm.src) {
        const wmImg = new Image();
        wmImg.onload = () => {
          const wmW = canvas.width * scale;
          const wmH = (wmImg.height / wmImg.width) * wmW;
          const pos = wm.position || 'center';
          let x = (canvas.width - wmW) / 2;
          let y = (canvas.height - wmH) / 2;
          if (pos.includes('top')) y = 20;
          if (pos.includes('bottom')) y = canvas.height - wmH - 20;
          if (pos.includes('left')) x = 20;
          if (pos.includes('right')) x = canvas.width - wmW - 20;
          ctx.drawImage(wmImg, x, y, wmW, wmH);
          ctx.globalAlpha = 1;
          const result = canvas.toDataURL('image/jpeg', 0.92);
          setUploadedImages(prev => {
            const imgs = [...(prev[albumIdx] || [])];
            imgs[imgIdx] = { ...imgs[imgIdx], src: result };
            return { ...prev, [albumIdx]: imgs };
          });
        };
        wmImg.src = wm.src;
      } else {
        const fontSize = Math.max(16, canvas.width * scale * 0.15);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = wm.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(wm.text || 'Wasserzeichen', canvas.width / 2, canvas.height / 2);
        ctx.globalAlpha = 1;
        const result = canvas.toDataURL('image/jpeg', 0.92);
        setUploadedImages(prev => {
          const imgs = [...(prev[albumIdx] || [])];
          imgs[imgIdx] = { ...imgs[imgIdx], src: result };
          return { ...prev, [albumIdx]: imgs };
        });
      }
    };
    baseImg.src = img.src;
  };

  // Set image as App-Icon via Upload-API
  const setAppIcon = (imageId) => {
    if (!imageId) return;
    apiSetAppIcon(imageId);
    // Notify parent about appIcon change
    if (onAppIconChange) {
      // Find the image to get its thumb URL
      const found = Object.values(uploadedImages).flat().find(i => i.id === imageId);
      onAppIconChange(found?.thumbSrc || null);
    }
  };

  const setAlbumTitelbild = (albumIdx, img) => {
    if (img?.id) apiSetTitleImage(img.id);
  };

  const setAlbumMobileTitelbild = (albumIdx, img) => {
    if (img?.id) apiSetMobileTitleImage(img.id);
  };

  const handleAddAlbum = ({ name, asFirst }) => {
    const newAlbum = { name, count: 0, previewCount: 2, totalPhotos: 2 };
    if (asFirst) {
      setAlbums(prev => [newAlbum, ...prev]);
      // Re-index albumNames and add new name at index 0
      setAlbumNames(prev => {
        const reindexed = {};
        Object.keys(prev).forEach(k => {
          reindexed[Number(k) + 1] = prev[k];
        });
        reindexed[0] = name;
        return reindexed;
      });
    } else {
      setAlbums(prev => {
        const newIdx = prev.length;
        setAlbumNames(p => ({ ...p, [newIdx]: name }));
        return [...prev, newAlbum];
      });
    }
    setShowAlbumModal(false);
  };

  // Sort images A-Z / Z-A toggle by filename
  const [sortDirection, setSortDirection] = useState({});
  const toggleSortImages = (albumIdx) => {
    const currentDir = sortDirection[albumIdx] || 'asc';
    const newDir = currentDir === 'asc' ? 'desc' : 'asc';
    setSortDirection(prev => ({ ...prev, [albumIdx]: newDir }));
    // Sort is visual only — reorder is persisted via drag-and-drop later
    // For now, just toggle the direction indicator
  };

  // Report dynamic counts to parent
  useEffect(() => {
    if (onCountsChange) {
      const totalPhotos = Object.values(uploadedImages).reduce((sum, imgs) => sum + imgs.length, 0);
      onCountsChange({ albums: albums.length, photos: totalPhotos });
    }
  }, [albums, uploadedImages, onCountsChange]);

  // Move album up/down
  const moveAlbum = (fromIdx, direction) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= albums.length) return;
    setAlbums(prev => {
      const newAlbums = [...prev];
      [newAlbums[fromIdx], newAlbums[toIdx]] = [newAlbums[toIdx], newAlbums[fromIdx]];
      return newAlbums;
    });
    // Also swap videos/names (images are from Supabase, keyed by album_index which follows album order)
    setUploadedVideos(prev => {
      const n = { ...prev };
      [n[fromIdx], n[toIdx]] = [n[toIdx] || [], n[fromIdx] || []];
      return n;
    });
    setAlbumNames(prev => {
      const n = { ...prev };
      [n[fromIdx], n[toIdx]] = [n[toIdx], n[fromIdx]];
      return n;
    });
  };

  const toggleAlbum = (idx) => {
    setExpandedAlbums(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const updateAlbumName = (idx, newName) => {
    setAlbumNames(prev => ({ ...prev, [idx]: newName }));
  };

  const handleAddImages = (albumIdx) => {
    const albumName = albumNames[albumIdx] || albums[albumIdx]?.name || `Album ${albumIdx + 1}`;

    if (!fileInputRefs.current[albumIdx]) {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
          // Show upload progress popup
          setUploadProgress({ albumName, total: files.length, completed: 0 });
          // Auto-expand the album so images are visible immediately
          setExpandedAlbums(prev => ({ ...prev, [albumIdx]: true }));

          // Upload via API — files uploaded one by one for progress
          await uploadImages(albumIdx, files, (completed, total) => {
            setUploadProgress({ albumName, total, completed });
          });

          setUploadProgress({ albumName, total: files.length, completed: files.length });
          setTimeout(() => setUploadProgress(null), 2500);
        }
        input.value = '';
      });
      document.body.appendChild(input);
      fileInputRefs.current[albumIdx] = input;
    }
    fileInputRefs.current[albumIdx].click();
  };

  const removeImage = (albumIdx, imgIdx) => {
    const img = uploadedImages[albumIdx]?.[imgIdx];
    if (img?.id) {
      apiDeleteImage(albumIdx, img.id);
    }
  };

  // Video: upload local
  const handleVideoUploadLocal = (albumIdx) => {
    setVideoModalAlbum(null);
    if (!videoInputRef.current) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.style.display = 'none';
      document.body.appendChild(input);
      videoInputRef.current = input;
    }
    const input = videoInputRef.current;
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const newVideo = { type: 'local', src: reader.result, name: file.name };
          if (replaceVideoTarget && replaceVideoTarget.albumIdx === albumIdx) {
            setUploadedVideos(prev => {
              const videos = [...(prev[albumIdx] || [])];
              videos[replaceVideoTarget.vidIdx] = newVideo;
              return { ...prev, [albumIdx]: videos };
            });
            setReplaceVideoTarget(null);
          } else {
            setUploadedVideos(prev => ({
              ...prev,
              [albumIdx]: [...(prev[albumIdx] || []), newVideo],
            }));
          }
        };
        reader.readAsDataURL(file);
      }
      input.value = '';
    };
    input.click();
  };

  const [embedModalAlbum, setEmbedModalAlbum] = useState(null);
  const [replaceVideoTarget, setReplaceVideoTarget] = useState(null); // { albumIdx, vidIdx }

  // Video: embed URL - now opens embed modal
  const handleVideoEmbedUrl = (albumIdx) => {
    setVideoModalAlbum(null);
    setEmbedModalAlbum(albumIdx);
  };

  const submitEmbedCode = (albumIdx, code) => {
    const newVideo = { type: 'embed', url: code, name: 'Embedded Video' };
    if (replaceVideoTarget && replaceVideoTarget.albumIdx === albumIdx) {
      // Replace existing video at the same index
      setUploadedVideos(prev => {
        const videos = [...(prev[albumIdx] || [])];
        videos[replaceVideoTarget.vidIdx] = newVideo;
        return { ...prev, [albumIdx]: videos };
      });
      setReplaceVideoTarget(null);
    } else {
      setUploadedVideos(prev => ({
        ...prev,
        [albumIdx]: [...(prev[albumIdx] || []), newVideo],
      }));
    }
    setEmbedModalAlbum(null);
  };

  const removeVideo = (albumIdx, vidIdx) => {
    setUploadedVideos(prev => {
      const videos = [...(prev[albumIdx] || [])];
      videos.splice(vidIdx, 1);
      return { ...prev, [albumIdx]: videos };
    });
  };

  return (
    <div className="bilder-tab">
      {videoModalAlbum !== null && (
        <VideoModal
          onClose={() => setVideoModalAlbum(null)}
          onUploadLocal={() => handleVideoUploadLocal(videoModalAlbum)}
          onEmbedUrl={() => handleVideoEmbedUrl(videoModalAlbum)}
        />
      )}

      {embedModalAlbum !== null && (
        <VideoEmbedModal
          onClose={() => setEmbedModalAlbum(null)}
          onSubmit={(code) => submitEmbedCode(embedModalAlbum, code)}
        />
      )}

      <div className="bilder-select-row">
        <div className="bilder-dropdown-wrapper">
          <button
            className="bilder-dropdown-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {Array.isArray(selectedFilter) && selectedFilter.length > 0 ? selectedFilter.join(', ') : 'Bilder auswählen...'}
            <ChevronDown size={14} />
          </button>
          {dropdownOpen && (
            <div className="bilder-dropdown-menu">
              <div className="bilder-dropdown-search">
                <input type="text" placeholder="Bildnamen eingeben..." />
              </div>
              <div className="bilder-dropdown-options">
                {[
                  'Alle Bilder auswählen',
                  'Wähle alle Bilder mit Herzen aus',
                  'Wähle alle Bilder ohne Herzen aus',
                  'Auswahl: Gut',
                  'Auswahl: Favorit',
                  'Auswahl: Unbenannte Auswahl',
                  'Galerie Fotos auswählen',
                ].map(opt => {
                  const filters = Array.isArray(selectedFilter) ? selectedFilter : [];
                  const isChecked = filters.includes(opt);
                  return (
                    <label key={opt} className="bilder-dropdown-option">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setSelectedFilter(prev => {
                            const arr = Array.isArray(prev) ? prev : [];
                            return isChecked ? arr.filter(f => f !== opt) : [...arr, opt];
                          });
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {albums.map((album, idx) => {
        const isExpanded = expandedAlbums[idx];
        const visiblePlaceholders = isExpanded ? album.totalPhotos : album.previewCount;
        const albumImages = uploadedImages[idx] || [];
        const albumVideos = uploadedVideos[idx] || [];
        const totalCount = albumImages.length;

        return (
          <div key={idx} className="album-section" style={albumToggles[idx]?.hidden ? { opacity: 0.5 } : {}}
            onDragOver={e => {
              // Only handle file drops, not internal drag reorder
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                e.currentTarget.style.outline = '2px dashed #4a7c59';
                e.currentTarget.style.outlineOffset = '-2px';
              }
            }}
            onDragLeave={e => {
              e.currentTarget.style.outline = 'none';
            }}
            onDrop={async e => {
              e.currentTarget.style.outline = 'none';
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
              if (files.length === 0) return;
              const albumName = albumNames[idx] || albums[idx]?.name || `Album ${idx + 1}`;
              setUploadProgress({ albumName, total: files.length, completed: 0 });
              setExpandedAlbums(prev => ({ ...prev, [idx]: true }));
              await uploadImages(idx, files, (completed, total) => {
                setUploadProgress({ albumName, total, completed });
              });
              setUploadProgress({ albumName, total: files.length, completed: files.length });
              setTimeout(() => setUploadProgress(null), 2500);
            }}
          >
            <div className="album-header"
              draggable
              onDragStart={e => {
                if (e.target.closest('.album-name-input') || e.target.closest('select') || e.target.closest('.album-trash-btn')) { e.preventDefault(); return; }
                e.dataTransfer.setData('albumDragIdx', String(idx));
                e.currentTarget.closest('.album-section').style.opacity = '0.4';
              }}
              onDragEnd={e => { e.currentTarget.closest('.album-section').style.opacity = '1'; }}
              onDragOver={e => {
                if (!e.dataTransfer.types.includes('albumDragIdx')) return;
                e.preventDefault();
                e.currentTarget.style.borderBottom = '3px solid #4a7c59';
              }}
              onDragLeave={e => { e.currentTarget.style.borderBottom = ''; }}
              onDrop={e => {
                e.currentTarget.style.borderBottom = '';
                const from = Number(e.dataTransfer.getData('albumDragIdx'));
                if (isNaN(from) || from === idx) return;
                e.preventDefault();
                // Reorder albums
                const newAlbums = [...albums];
                const [moved] = newAlbums.splice(from, 1);
                newAlbums.splice(idx, 0, moved);
                setAlbums(newAlbums);
                // Reindex names, toggles, texts, videos
                const reindex = (obj) => {
                  const entries = Object.entries(obj).map(([k, v]) => [Number(k), v]).sort((a, b) => a[0] - b[0]);
                  const oldArr = entries.map(([, v]) => v);
                  const newArr = [...oldArr];
                  const [movedItem] = newArr.splice(from, 1);
                  newArr.splice(idx, 0, movedItem);
                  const result = {};
                  newArr.forEach((v, i) => { if (v !== undefined) result[i] = v; });
                  return result;
                };
                setAlbumNames(prev => reindex(prev));
                setAlbumToggles(prev => reindex(prev));
                setAlbumTexts(prev => reindex(prev));
                setUploadedVideos(prev => reindex(prev));
              }}
            >
              <div className="album-header-left" style={{ cursor: 'grab' }}>
                <GripVertical size={14} style={{ color: '#bbb', flexShrink: 0, marginRight: 4 }} />
                <button
                  className="album-chevron-btn"
                  onClick={() => toggleAlbum(idx)}
                  title={isExpanded ? 'Weniger Bilder zeigen' : 'Alle Bilder zeigen'}
                >
                  <ChevronsDown
                    size={16}
                    className={`album-chevron-icon${isExpanded ? ' rotated' : ''}`}
                  />
                </button>
                <Pencil size={12} className="album-pencil-decorative" />
                <input
                  className="album-name-input"
                  value={albumNames[idx]}
                  onChange={(e) => updateAlbumName(idx, e.target.value)}
                />
                <ImageIcon size={14} className="album-image-icon" />
                <span className="album-badge">{totalCount}</span>
                <div className="album-actions">
                  <button
                    title="Galerie Text ändern"
                    onClick={() => setTextModalAlbum(idx)}
                  ><Type size={12} /></button>
                  <div style={{ position: 'relative', display: 'inline-flex' }}>
                    <button
                      className={albumToggles[idx]?.hidden ? '' : 'active'}
                      onClick={() => {
                        setAlbumToggles(prev => ({
                          ...prev,
                          [idx]: { ...(prev[idx] || {}), hidden: !(prev[idx]?.hidden) }
                        }));
                        setEyeOverlayAlbum(idx);
                        setTimeout(() => setEyeOverlayAlbum(null), 2000);
                      }}
                    ><Eye size={12} /></button>
                    {eyeOverlayAlbum === idx && (
                      <div className="eye-overlay-tooltip">
                        Mit dieser Option kannst du dieses Album in der Kundenansicht ausblenden. Dein Kunde kann das Album dann nicht sehen und auch keine Bilder aus diesem Album herunterladen.
                      </div>
                    )}
                  </div>
                  <label className="album-toggle" style={{ marginLeft: 4 }}>
                    <Download size={12} />
                    <span>Download</span>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={albumToggles[idx]?.download !== false}
                      onChange={() => setAlbumToggles(prev => ({
                        ...prev,
                        [idx]: { ...(prev[idx] || {}), download: prev[idx]?.download === false ? true : false }
                      }))}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                  <label className="album-toggle" style={{ marginLeft: 4 }}>
                    <Droplets size={12} />
                    <span>Wasserzeichen</span>
                    <input
                      type="checkbox"
                      className="toggle-switch-input"
                      checked={!!albumToggles[idx]?.watermark}
                      onChange={() => {
                        const wasOn = !!albumToggles[idx]?.watermark;
                        if (!wasOn && watermarks.length === 0) {
                          // No watermarks configured — open modal to let user know
                          setWatermarkModalTarget({ albumIdx: idx, imgIdx: null, photoSrc: null });
                          return;
                        }
                        setAlbumToggles(prev => ({
                          ...prev,
                          [idx]: {
                            ...(prev[idx] || {}),
                            watermark: !wasOn,
                            // Clear watermarkId when turning OFF
                            ...(wasOn ? { watermarkId: undefined, watermarkName: undefined } : {}),
                          }
                        }));
                      }}
                    />
                    <span className="toggle-switch-slider"></span>
                  </label>
                  <button
                    className="album-watermark-edit-btn"
                    title="Wasserzeichen bearbeiten"
                    onClick={() => setWatermarkModalTarget({ albumIdx: idx, imgIdx: null, photoSrc: null })}
                  ><Pencil size={12} /></button>
                </div>
              </div>
              <div className="album-header-right">
                <button
                  className="album-trash-btn"
                  style={{
                    background: confirmDeleteAlbum === idx ? '#e53935' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: confirmDeleteAlbum === idx ? '#fff' : 'var(--text-secondary)',
                    borderRadius: 4,
                    padding: confirmDeleteAlbum === idx ? '2px 8px' : '2px',
                    fontSize: '0.7rem',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                  }}
                  title={confirmDeleteAlbum === idx ? 'Nochmal klicken zum Löschen' : 'Album löschen'}
                  onClick={() => {
                    if (confirmDeleteAlbum === idx) {
                      // Second click — delete
                      if (confirmDeleteAlbumTimer.current) clearTimeout(confirmDeleteAlbumTimer.current);
                      setConfirmDeleteAlbum(null);
                      setAlbums(prev => prev.filter((_, i) => i !== idx));
                      // Images are from Supabase — they'll reload after album sync
                      refreshImages();
                      setUploadedVideos(prev => {
                        const n = { ...prev }; delete n[idx];
                        const reindexed = {};
                        Object.keys(n).forEach(k => { const ki = Number(k); reindexed[ki > idx ? ki - 1 : ki] = n[k]; });
                        return reindexed;
                      });
                      setAlbumNames(prev => {
                        const n = { ...prev }; delete n[idx];
                        const reindexed = {};
                        Object.keys(n).forEach(k => { const ki = Number(k); reindexed[ki > idx ? ki - 1 : ki] = n[k]; });
                        return reindexed;
                      });
                      setAlbumToggles(prev => {
                        const n = { ...prev }; delete n[idx];
                        const reindexed = {};
                        Object.keys(n).forEach(k => { const ki = Number(k); reindexed[ki > idx ? ki - 1 : ki] = n[k]; });
                        return reindexed;
                      });
                      // Clear app icon if this was the last album
                      setAlbums(currentAlbums => {
                        if (currentAlbums.length === 0) {
                          setAppIconSrc(null);
                          if (onAppIconChange) onAppIconChange(null);
                        }
                        return currentAlbums;
                      });
                    } else {
                      // First click — show confirmation for 3 seconds
                      setConfirmDeleteAlbum(idx);
                      if (confirmDeleteAlbumTimer.current) clearTimeout(confirmDeleteAlbumTimer.current);
                      confirmDeleteAlbumTimer.current = setTimeout(() => setConfirmDeleteAlbum(null), 3000);
                    }
                  }}
                >
                  {confirmDeleteAlbum === idx ? 'Wirklich löschen?' : <Trash2 size={14} />}
                </button>
                <select className="sort-select">
                  <option>Uploaddatum</option>
                  <option>Aufnahmedatum</option>
                  <option>Dateierstellungsdatum</option>
                  <option>Dateinamen</option>
                  <option>Manuelle Sortierung</option>
                </select>
                <div className="album-reorder-btns">
                  <button
                    className="album-move-btn"
                    title={sortDirection[idx] === 'desc' ? 'Bilder Z→A' : 'Bilder A→Z'}
                    onClick={() => toggleSortImages(idx)}
                  >
                    {sortDirection[idx] === 'desc' ? <ArrowDownAZ size={13} /> : <ArrowUpAZ size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Top row - always visible: title tiles + action cards */}
            <div className="album-grid">
              {/* Tile 1: Titelbild */}
              <PhotoCard
                key="titelbild"
                src={nasaTitleImages[idx]?.titelbild || null}
                filename={'Titelbild'}
                colorIdx={idx * 7}
                position={0}
                onDelete={() => {
                  const titleImg = (uploadedImages[idx] || []).find(i => i.isTitleImage);
                  if (titleImg?.id) apiSetTitleImage(titleImg.id); // toggle off
                }}
                onSetAppIcon={() => {
                  const titleImg = (uploadedImages[idx] || []).find(i => i.isTitleImage);
                  if (titleImg?.id) setAppIcon(titleImg.id);
                }}
                onApplyWatermark={() => {}}
              />
              {/* Tile 2: Mobile Titelbild */}
              <PhotoCard
                key="mobile-titelbild"
                src={nasaTitleImages[idx]?.mobile || null}
                filename={'Mobile Titelbild'}
                colorIdx={idx * 7 + 1}
                position={1}
                onDelete={() => {
                  const mobileImg = (uploadedImages[idx] || []).find(i => i.isMobileTitle);
                  if (mobileImg?.id) apiSetMobileTitleImage(mobileImg.id); // toggle off
                }}
                onSetAppIcon={() => {
                  const mobileImg = (uploadedImages[idx] || []).find(i => i.isMobileTitle);
                  if (mobileImg?.id) setAppIcon(mobileImg.id);
                }}
                onApplyWatermark={() => {}}
              />

              {/* Bilder hinzufügen */}
              <div className="photo-card add-card" onClick={() => handleAddImages(idx)}>
                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                  <Plus size={18} />
                  <FolderOpen size={18} />
                </div>
                <span>Bilder hinzufügen</span>
              </div>

              {/* Uploaded videos */}
              {albumVideos.map((vid, vidIdx) => (
                <VideoCard
                  key={`video-${vidIdx}`}
                  video={vid}
                  onDelete={() => removeVideo(idx, vidIdx)}
                  onReplace={() => {
                    setReplaceVideoTarget({ albumIdx: idx, vidIdx });
                    setVideoModalAlbum(idx);
                  }}
                />
              ))}

              {/* Video hinzufügen */}
              <div className="photo-card add-card video-add-card" onClick={() => setVideoModalAlbum(idx)}>
                <Video size={22} />
                <span>Video</span>
              </div>
            </div>

            {/* Expanded grid - uploaded images shown here */}
            {isExpanded && albumImages.length > 0 && (
              <div className="album-grid-expanded">
                {albumImages.map((img, imgIdx) => (
                  <PhotoCard
                    key={img.id || `uploaded-${imgIdx}`}
                    src={img.thumbSrc || img.src}
                    filename={img.name}
                    colorIdx={0}
                    onDelete={() => removeImage(idx, imgIdx)}
                    position={2 + imgIdx}
                    onSetTitelbild={() => setAlbumTitelbild(idx, img)}
                    onSetMobileTitelbild={() => setAlbumMobileTitelbild(idx, img)}
                    onSetAppIcon={() => img.id && setAppIcon(img.id)}
                    onApplyWatermark={() => setWatermarkModalTarget({ albumIdx: idx, imgIdx, photoSrc: img.src })}
                    showWatermark={!!albumToggles[idx]?.watermark && !!albumToggles[idx]?.watermarkId}
                    watermarkText={albumToggles[idx]?.watermarkName || ''}
                  />
                ))}
              </div>
            )}

            <div className="album-footer">
              <button onClick={() => toggleAlbum(idx)}>
                <ChevronsDown
                  size={14}
                  className={`album-chevron-icon${isExpanded ? ' rotated' : ''}`}
                />
                {isExpanded ? ' Zeige weniger Bilder' : ' Zeige alle Bilder'}
              </button>
            </div>
          </div>
        );
      })}

      {/* + Album hinzufügen */}
      <div className="add-album-bar" onClick={() => setShowAlbumModal(true)}>
        <Plus size={16} /> Album hinzufügen
      </div>

      {showAlbumModal && (
        <AlbumModal
          onClose={() => setShowAlbumModal(false)}
          onSubmit={handleAddAlbum}
          watermarks={watermarks}
        />
      )}

      {/* Upload Progress Popup */}
      {uploadProgress && (
        <div className="upload-progress-popup">
          <div className="upload-progress-header">
            <span>Bilder hochladen</span>
            <button className="upload-progress-close" onClick={() => setUploadProgress(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="upload-progress-body">
            <p className="upload-progress-text">
              {uploadProgress.completed} von {uploadProgress.total} Bildern hochgeladen zu „{uploadProgress.albumName}"
            </p>
            <div className="upload-progress-bar-track">
              <div
                className="upload-progress-bar-fill"
                style={{ width: `${(uploadProgress.completed / uploadProgress.total) * 100}%` }}
              />
            </div>
            {uploadProgress.completed === uploadProgress.total && (
              <p className="upload-progress-done">✓ Alle Bilder hochgeladen!</p>
            )}
          </div>
        </div>
      )}

      {/* Galerie Text ändern Modal */}
      {textModalAlbum !== null && (
        <div className="video-modal-overlay" onClick={() => setTextModalAlbum(null)}>
          <div className="watermark-select-modal" onClick={e => e.stopPropagation()}>
            <div className="watermark-select-header">
              <span>Galerie Text ändern</span>
              <button className="video-modal-close" onClick={() => setTextModalAlbum(null)}><X size={18} /></button>
            </div>
            <div className="watermark-select-body">
              <textarea
                className="galerie-text-textarea"
                placeholder="Hinterlasse eine Nachricht für deinen Kunden"
                value={albumTexts[textModalAlbum] || ''}
                onChange={e => setAlbumTexts(prev => ({ ...prev, [textModalAlbum]: e.target.value }))}
                rows={4}
              />
              <button
                className="watermark-apply-btn"
                onClick={() => setTextModalAlbum(null)}
                style={{ marginTop: 12 }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Watermark Selection Modal */}
      {watermarkModalTarget && (
        <WatermarkModal
          photoSrc={watermarkModalTarget.photoSrc}
          watermarks={watermarks}
          onClose={() => setWatermarkModalTarget(null)}
          onApply={(wmIdx) => applyWatermarkWithIndex(wmIdx)}
        />
      )}
    </div>
  );
};

export default BilderTab;
