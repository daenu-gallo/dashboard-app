import React, { useState } from 'react';
import { Search, Edit3, ExternalLink, Image as ImageIcon, Trash2, Plus, Link2, HelpCircle, Tag, Monitor, Smartphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePersistedState } from '../hooks/usePersistedState';
import './Galleries.css';
import './Portfolio.css';




/* ——— Portfolio Detail View ——— */
const PortfolioDetail = ({ portfolio, onBack }) => {
  const pKey = `portfolio_${portfolio.id}`;
  const [formData, setFormData] = usePersistedState(`${pKey}_settings`, {
    titel: portfolio.title,
    beschreibung: '',
    marken: 'Fotohahn',
    passwort: '',
    sprache: 'Deutsch',
    domain: 'app.fotohahn.ch',
    domainpfad: 'Hochzeitsfotos',
    tags: '',
    titelbild: null,
    titelbildName: '',
  });
  const [previewMode, setPreviewMode] = useState('desktop');
  const titelbildInputRef = React.useRef(null);
  const [brands] = usePersistedState('settings_brands', [{ id: 1, name: 'Fotohahn', active: true }]);
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const previewUrl = `https://${formData.domain}/p/${formData.domainpfad}`;

  const handleTitelbildUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, titelbild: ev.target.result, titelbildName: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTitelbildDelete = () => {
    setFormData(prev => ({ ...prev, titelbild: null, titelbildName: '' }));
  };

  const handleTitelbildOpen = () => {
    if (formData.titelbild) {
      window.open(formData.titelbild, '_blank');
    }
  };

  return (
    <div className="portfolio-detail">
      <div className="portfolio-detail-layout">
        {/* Left: Form */}
        <div className="portfolio-form">
          <h1 className="text-h1" style={{ marginBottom: '1.5rem' }}>Portfolio</h1>

          <div className="pf-field">
            <label>Titel</label>
            <input className="pf-input" value={formData.titel} onChange={(e) => updateField('titel', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Interne Beschreibung <HelpCircle size={13} className="help-icon" /></label>
            <input className="pf-input" placeholder="z.B. 01-01-20 - Drehort" value={formData.beschreibung} onChange={(e) => updateField('beschreibung', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Marken</label>
            <select className="pf-input" value={formData.marken} onChange={(e) => updateField('marken', e.target.value)}>
              {brands.map(b => <option key={b.id} value={globalBrand.firmenname || b.name}>{globalBrand.firmenname || b.name}</option>)}
            </select>
          </div>

          <div className="pf-field">
            <label>Passwort</label>
            <div style={{ position: 'relative' }}>
              <input className="pf-input" placeholder="Passwort" type="password" value={formData.passwort} onChange={(e) => updateField('passwort', e.target.value)} />
              <HelpCircle size={13} className="help-icon" style={{ position: 'absolute', right: 10, top: 12, color: '#7fb5ff' }} />
            </div>
          </div>

          <div className="pf-field">
            <label>Sprache auswählen</label>
            <select className="pf-input" value={formData.sprache} onChange={(e) => updateField('sprache', e.target.value)}>
              <option>Deutsch</option>
              <option>English</option>
              <option>Français</option>
            </select>
          </div>

          <div className="pf-field">
            <label>Domain</label>
            <div className="pf-domain-row">
              <select className="pf-input" style={{ flex: '0 0 45%' }} value={formData.domain} onChange={(e) => updateField('domain', e.target.value)}>
                <option>app.fotohahn.ch</option>
              </select>
              <div>
                <span className="pf-domain-label">Domainpfad</span>
                <input className="pf-input" value={formData.domainpfad} onChange={(e) => updateField('domainpfad', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="pf-field">
            <label>Tags</label>
            <div className="pf-tags-input">
              <Tag size={14} className="text-primary" />
              <input placeholder="Nach Galerie Tags filtern" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} />
              <HelpCircle size={13} className="help-icon" />
            </div>
          </div>

          <input
            ref={titelbildInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleTitelbildUpload}
          />
          <button className="pf-btn-upload" onClick={() => titelbildInputRef.current?.click()}>
            Titelbild hochladen
          </button>
          {formData.titelbildName && (
            <div className="pf-titelbild-row">
              <span>{formData.titelbildName}</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="icon-btn" onClick={handleTitelbildOpen} title="Bild öffnen"><ExternalLink size={14} /></button>
                <button className="icon-btn" onClick={handleTitelbildDelete} title="Bild löschen"><Trash2 size={14} /></button>
              </div>
            </div>
          )}

          <a href={previewUrl} className="pf-preview-link" target="_blank" rel="noreferrer">{previewUrl}</a>
          <button className="pf-btn-preview" onClick={() => window.open(previewUrl, '_blank')}>Vorschau</button>
        </div>

        {/* Right: Live Preview */}
        <div className="portfolio-preview">
          <div className="pf-preview-header">
            <span>Live Vorschau</span>
            <ExternalLink size={14} />
            <div className="pf-device-toggle">
              <button className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')} title="Desktop">
                <Monitor size={16} />
              </button>
              <button className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')} title="Mobile">
                <Smartphone size={16} />
              </button>
            </div>
          </div>
          <div className={`pf-browser-frame ${previewMode}`}>
            <div className="pf-browser-topbar">
              <div className="pf-browser-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
            </div>
            <div className="pf-browser-content">
              {/* Simulated portfolio page */}
              <div className="pf-sim-header">
                <div className="pf-sim-logo">
                  {globalBrand.logoDark ? (
                    <img src={globalBrand.logoDark} alt="Logo" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: 10, fontWeight: 600 }}>F</span>
                  )}
                </div>
                <div className="pf-sim-social">
                  <Link2 size={14} />
                  <span style={{ fontWeight: 600 }}>f</span>
                  <ImageIcon size={14} />
                </div>
              </div>
              <div className="pf-sim-hero">
                <div className="pf-sim-hero-img">
                  {formData.titelbild ? (
                    <img src={formData.titelbild} alt="Titelbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  )}
                </div>
              </div>
              <h3 className="pf-sim-title">{formData.titel}</h3>
              <div className="pf-sim-controls">
                <select className="pf-sim-sort">
                  <option>Sortieren nach</option>
                </select>
                <div className="pf-sim-search">
                  <input placeholder="Suchen..." />
                  <Search size={12} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ——— Portfolio List View ——— */
const PortfoliosPage = () => {
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [portfolioList, setPortfolioList] = usePersistedState('portfolios_list', []);
  // Read settings for each portfolio to get cover images
  const [p1Settings] = usePersistedState('portfolio_1_settings', { titelbild: null });

  const getCoverImage = (portfolioId) => {
    if (portfolioId === 1) return p1Settings?.titelbild;
    return null;
  };

  const handleDelete = (id) => {
    if (window.confirm('Portfolio wirklich löschen?')) {
      setPortfolioList(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleCreate = () => {
    const title = prompt('Portfolio-Titel eingeben:');
    if (title && title.trim()) {
      const maxId = portfolioList.reduce((max, p) => Math.max(max, p.id || 0), 0);
      setPortfolioList(prev => [...prev, {
        id: maxId + 1,
        title: title.trim(),
        description: '',
        created: new Date().toLocaleDateString('de-DE'),
        lastEdit: new Date().toLocaleDateString('de-DE') + ' - ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      }]);
    }
  };

  if (selectedPortfolio) {
    return <PortfolioDetail portfolio={selectedPortfolio} onBack={() => setSelectedPortfolio(null)} />;
  }

  return (
    <div className="galleries-page">
      <div className="page-header">
        <h1 className="text-h1">Portfolios</h1>
      </div>

      <div className="galleries-card">
        <div className="galleries-toolbar">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input type="text" placeholder="Suche" className="search-input" />
          </div>
        </div>

        <table className="galleries-table">
          <thead>
            <tr>
              <th className="img-col"></th>
              <th>Titel</th>
              <th>Beschreibung</th>
              <th>Erstellt</th>
              <th>Letzte Änderung</th>
              <th className="action-col">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {portfolioList.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Keine Portfolios vorhanden</td></tr>
            )}
            {portfolioList.map((portfolio) => {
              const titelbild = getCoverImage(portfolio.id);
              return (
              <tr key={portfolio.id}>
                <td className="img-col">
                  <div className="gallery-thumbnail">
                    {titelbild ? (
                      <img src={titelbild} alt={portfolio.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <ImageIcon size={16} className="text-muted" />
                    )}
                  </div>
                </td>
                <td className="font-medium" style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setSelectedPortfolio(portfolio)}>{portfolio.title}</td>
                <td className="text-muted">{portfolio.description}</td>
                <td className="text-muted text-sm">{portfolio.created}</td>
                <td className="text-muted text-sm">{portfolio.lastEdit}</td>
                <td className="actions">
                  <button title="Bearbeiten" onClick={() => setSelectedPortfolio(portfolio)}><Edit3 size={16} /></button>
                  <button title="Öffnen"><ExternalLink size={16} /></button>
                  <button title="Löschen" className="text-red" onClick={() => handleDelete(portfolio.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
            <span className="text-sm text-muted">{portfolioList.length}</span>
            
            <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <button className="btn-outline" style={{ border: 'none', color: 'var(--color-primary)' }} onClick={handleCreate}>
                    <Plus size={16} /> Neues Portfolio erstellen
                </button>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                   <span className="text-sm text-muted">Ergebnisse pro Seite</span>
                   <select className="btn-outline" style={{padding: '0.25rem 0.5rem', borderRadius: '4px'}}>
                       <option>10</option>
                       <option>20</option>
                       <option>50</option>
                       <option>100</option>
                   </select>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PortfoliosPage;
