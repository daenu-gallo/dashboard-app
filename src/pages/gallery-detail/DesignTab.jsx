import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Edit2, ChevronLeft, ChevronRight, ExternalLink, Monitor, Smartphone, HelpCircle } from 'lucide-react';


// ── Template Definitions ──
const TEMPLATES = [
  {
    id: 'atelier',
    name: 'Atelier',
    primaryColor: '#f0f0f4',
    secondaryColor: '#1a1a1a',
    font: 'Inter',
    spacing: 'klein',
    display: 'standard',
  },
  {
    id: 'dark-shark',
    name: 'Dark Shark',
    primaryColor: '#1a1a2e',
    secondaryColor: '#e8d5b7',
    font: 'Josefin Sans',
    spacing: 'klein',
    display: 'standard',
  },
  {
    id: 'lazy-r',
    name: 'Lazy R',
    primaryColor: '#f5f0eb',
    secondaryColor: '#2d4a3e',
    font: 'Playfair Display',
    spacing: 'mittel',
    display: 'standard',
  },
  {
    id: 'luminance',
    name: 'Luminance',
    primaryColor: '#1a0a10',
    secondaryColor: '#d4a0a0',
    font: 'Cormorant Garamond',
    spacing: 'klein',
    display: 'standard',
  },
  {
    id: 'noir-classique',
    name: 'Noir Classique',
    primaryColor: '#111111',
    secondaryColor: '#ffffff',
    font: 'Montserrat',
    spacing: 'mittel',
    display: 'kacheln',
  },
];

const FONTS = [
  'Inter',
  'Josefin Sans',
  'Playfair Display',
  'Cormorant Garamond',
  'Montserrat',
  'Lora',
  'Raleway',
  'Outfit',
  'DM Serif Display',
  'Libre Baskerville',
];

const SPACING_OPTIONS = [
  { value: 'klein', label: 'Klein' },
  { value: 'mittel', label: 'Mittel' },
  { value: 'gross', label: 'Groß' },
];

const DISPLAY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'kacheln', label: 'Kacheln' },
];

const DesignTab = ({ gallery, supabaseGallery, updateGallery }) => {
  const galleryKey = gallery?.title || 'default';

  // ── Initialize from Supabase design JSONB ──
  const sbDesign = supabaseGallery?.design || {};
  const [selectedTemplate, setSelectedTemplate] = useState(sbDesign.template || 'atelier');
  const [primaryColor, setPrimaryColor] = useState(sbDesign.primaryColor || '#f0f0f4');
  const [secondaryColor, setSecondaryColor] = useState(sbDesign.secondaryColor || '#1a1a1a');
  const [font, setFont] = useState(sbDesign.font || 'Inter');
  const [spacing, setSpacing] = useState(sbDesign.spacing || 'klein');
  const [displayMode, setDisplayMode] = useState(sbDesign.display || 'standard');

  // ── Sync from Supabase when gallery data arrives after mount ──
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!supabaseGallery?.design || initializedRef.current) return;
    const d = supabaseGallery.design;
    initializedRef.current = true;
    if (d.template) setSelectedTemplate(d.template);
    if (d.primaryColor) setPrimaryColor(d.primaryColor);
    if (d.secondaryColor) setSecondaryColor(d.secondaryColor);
    if (d.font) setFont(d.font);
    if (d.spacing) setSpacing(d.spacing);
    if (d.display) setDisplayMode(d.display);
  }, [supabaseGallery?.design]);

  // ── Sync design changes to Supabase (debounced) ──
  const syncTimer = useRef(null);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (!supabaseGallery?.id || !updateGallery) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await updateGallery(supabaseGallery.id, {
          design: {
            template: selectedTemplate,
            primaryColor,
            secondaryColor,
            font,
            spacing,
            display: displayMode,
          },
        });
      } catch (err) {
        console.error('[DesignTab] Supabase sync error:', err);
      }
    }, 1500);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [selectedTemplate, primaryColor, secondaryColor, font, spacing, displayMode]);

  // ── Local UI State ──
  const [previewMode, setPreviewMode] = useState('desktop');
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const [tooltipVisible, setTooltipVisible] = useState(null);
  const iframeRef = useRef(null);

  // ── Apply template ──
  const applyTemplate = (templateId) => {
    const tmpl = TEMPLATES.find(t => t.id === templateId);
    if (!tmpl) return;
    setSelectedTemplate(templateId);
    setPrimaryColor(tmpl.primaryColor);
    setSecondaryColor(tmpl.secondaryColor);
    setFont(tmpl.font);
    setSpacing(tmpl.spacing);
    setDisplayMode(tmpl.display);
  };

  // ── Reset to template defaults ──
  const resetField = (field) => {
    const tmpl = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];
    switch (field) {
      case 'primaryColor': setPrimaryColor(tmpl.primaryColor); break;
      case 'secondaryColor': setSecondaryColor(tmpl.secondaryColor); break;
      case 'font': setFont(tmpl.font); break;
      case 'spacing': setSpacing(tmpl.spacing); break;
      case 'display': setDisplayMode(tmpl.display); break;
    }
  };

  const activeTemplate = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

  // Template mini-preview colors for carousel
  const getTemplatePreviewStyle = (tmpl) => ({
    background: tmpl.primaryColor,
    color: tmpl.secondaryColor,
    border: selectedTemplate === tmpl.id ? '2px solid var(--color-primary)' : '2px solid transparent',
  });

  // Customer view URL — use sanitized slug matching the route
  const toSlug = (t) => t.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const previewUrl = `/${toSlug(galleryKey)}`;

  return (
    <div className="design-tab">
      {/* ════ Controls Panel ════ */}
      <div className="design-controls">

        {/* Vorlagen Dropdown */}
        <div className="form-group">
          <div className="form-label">Vorlagen</div>
          <select
            className="form-select"
            value={selectedTemplate}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            {TEMPLATES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Template Carousel */}
        <div className="template-carousel">
          <button
            className="carousel-arrow"
            onClick={() => setCarouselOffset(Math.max(0, carouselOffset - 1))}
            disabled={carouselOffset === 0}
          >
            <ChevronLeft size={18} />
          </button>
          <div className="template-carousel-viewport">
            <div className="template-carousel-track" style={{ transform: `translateX(-${carouselOffset * 132}px)` }}>
              {TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  className={`template-thumb ${selectedTemplate === t.id ? 'active' : ''}`}
                  onClick={() => applyTemplate(t.id)}
                  style={getTemplatePreviewStyle(t)}
                >
                  <span className="template-thumb-label">{t.name.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="carousel-arrow"
            onClick={() => setCarouselOffset(Math.min(TEMPLATES.length - 3, carouselOffset + 1))}
            disabled={carouselOffset >= TEMPLATES.length - 3}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Schriftart */}
        <div className="form-group">
          <div className="form-label">
            Schriftart
            <RotateCcw size={12} className="settings-icon reset-btn" onClick={() => resetField('font')} title="Zurücksetzen" />
          </div>
          <select
            className="form-select"
            value={font}
            onChange={(e) => setFont(e.target.value)}
            style={{ fontFamily: font }}
          >
            {FONTS.map(f => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
        </div>

        {/* Primär / Sekundärfarbe */}
        <div className="color-picker-row">
          <div className="color-field">
            <label>
              Primärfarbe
              <RotateCcw size={10} className="reset-btn" onClick={() => resetField('primaryColor')} title="Zurücksetzen" />
            </label>
            <div className="color-input-row">
              <div className="color-swatch-wrapper">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="color-native-picker"
                />
                <div className="color-swatch" style={{ background: primaryColor }} />
              </div>
              <input
                className="form-input"
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
              <Edit2 size={12} className="settings-icon" />
            </div>
          </div>
          <div className="color-field">
            <label>
              Sekundärfarbe
              <RotateCcw size={10} className="reset-btn" onClick={() => resetField('secondaryColor')} title="Zurücksetzen" />
            </label>
            <div className="color-input-row">
              <div className="color-swatch-wrapper">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="color-native-picker"
                />
                <div className="color-swatch" style={{ background: secondaryColor }} />
              </div>
              <input
                className="form-input"
                style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
              <Edit2 size={12} className="settings-icon" />
            </div>
          </div>
        </div>

        {/* Bildabstand */}
        <div className="form-group">
          <div className="form-label">
            Bildabstand
            <RotateCcw size={12} className="settings-icon reset-btn" onClick={() => resetField('spacing')} title="Zurücksetzen" />
          </div>
          <select
            className="form-select"
            value={spacing}
            onChange={(e) => setSpacing(e.target.value)}
          >
            {SPACING_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Bilddarstellung */}
        <div className="form-group">
          <div className="form-label">
            Bilddarstellung
          </div>
          <select
            className="form-select"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value)}
          >
            {DISPLAY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

      </div>

      {/* ════ Live Preview ════ */}
      <div className="design-preview">
        <div className="preview-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            Live Vorschau
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
              <ExternalLink size={12} />
            </a>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="preview-mode-btn"
              onClick={() => {
                if (iframeRef.current) {
                  iframeRef.current.src = iframeRef.current.src;
                }
              }}
              title="Vorschau aktualisieren"
            >
              <RotateCcw size={14} />
            </button>
            <button
              className={`preview-mode-btn ${previewMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setPreviewMode('desktop')}
              title="Desktop"
            >
              <Monitor size={16} />
            </button>
            <button
              className={`preview-mode-btn ${previewMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setPreviewMode('mobile')}
              title="Mobile"
            >
              <Smartphone size={16} />
            </button>
          </div>
        </div>
        <div className="preview-browser">
          <div className="browser-dots">
            <div className="browser-dot red" />
            <div className="browser-dot yellow" />
            <div className="browser-dot green" />
          </div>
        <div className={`preview-iframe-container ${previewMode}`}>
            <div
              style={{
                width: '100%', height: '100%', overflow: 'hidden',
                background: primaryColor, color: secondaryColor,
                fontFamily: font + ', sans-serif',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Mock header */}
              <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${secondaryColor}22` }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1, textTransform: 'uppercase' }}>{galleryKey}</span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', opacity: 0.6 }}>
                  <span>Galerie</span><span>Kontakt</span>
                </div>
              </div>
              {/* Mock hero */}
              <div style={{
                height: '40%', background: `linear-gradient(135deg, ${secondaryColor}33, ${secondaryColor}11)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{galleryKey}</div>
                  <div style={{ fontSize: '0.65rem', marginTop: '0.4rem', opacity: 0.5 }}>Fotos von Fotograf</div>
                </div>
              </div>
              {/* Mock image grid */}
              <div style={{
                flex: 1, padding: spacing === 'gross' ? '12px' : spacing === 'mittel' ? '8px' : '5px',
                display: 'grid',
                gridTemplateColumns: displayMode === 'kacheln' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                gap: spacing === 'gross' ? '12px' : spacing === 'mittel' ? '8px' : '5px',
              }}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} style={{
                    background: `${secondaryColor}15`,
                    borderRadius: 4,
                    aspectRatio: displayMode === 'kacheln' ? '1' : '3/2',
                  }} />
                ))}
              </div>
              {/* Mock footer */}
              <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.6rem', opacity: 0.4, borderTop: `1px solid ${secondaryColor}11` }}>
                Powered by fotohahn.ch
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignTab;
