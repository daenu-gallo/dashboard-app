import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit3, ExternalLink, Image as ImageIcon, Trash2, Plus, Link2, HelpCircle, Tag, Monitor, Smartphone, ArrowLeft, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import './Galleries.css';
import './Portfolio.css';

/* ——— Portfolio Detail View ——— */
const PortfolioDetail = ({ portfolio, onBack, onSave }) => {
  const [formData, setFormData] = useState({
    title: portfolio.title || '',
    description: portfolio.description || '',
    brand: portfolio.brand || '',
    password: portfolio.password || '',
    language: portfolio.language || 'Deutsch',
    domain: portfolio.domain || '',
    domain_path: portfolio.domain_path || '',
    tags: (portfolio.tags || []).join(', '),
    cover_image: portfolio.cover_image || null,
    cover_image_name: portfolio.cover_image_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const titelbildInputRef = useRef(null);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const previewUrl = `https://${formData.domain || 'fotohahn.ch'}/p/${formData.domain_path || 'portfolio'}`;

  const handleTitelbildUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFormData(prev => ({ ...prev, cover_image: ev.target.result, cover_image_name: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTitelbildDelete = () => {
    setFormData(prev => ({ ...prev, cover_image: null, cover_image_name: '' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        title: formData.title,
        description: formData.description,
        brand: formData.brand,
        password: formData.password,
        language: formData.language,
        domain: formData.domain,
        domain_path: formData.domain_path,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        cover_image: formData.cover_image,
        cover_image_name: formData.cover_image_name,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('portfolios')
        .update(updates)
        .eq('id', portfolio.id);
      if (error) throw error;
      onSave?.();
    } catch (err) {
      console.error('[Portfolio] Save error:', err);
      alert('Fehler beim Speichern: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="portfolio-detail">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '0.5rem 0.8rem', color: '#ccc', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem',
        }}>
          <ArrowLeft size={14} /> Zurück
        </button>
        <h1 className="text-h1" style={{ margin: 0 }}>Portfolio bearbeiten</h1>
        <button onClick={handleSave} disabled={saving} style={{
          marginLeft: 'auto', background: '#528c68', border: 'none', borderRadius: 8,
          padding: '0.5rem 1.2rem', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600,
          opacity: saving ? 0.6 : 1,
        }}>
          <Save size={14} /> {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>

      <div className="portfolio-detail-layout">
        {/* Left: Form */}
        <div className="portfolio-form">
          <div className="pf-field">
            <label>Titel</label>
            <input className="pf-input" value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Interne Beschreibung <HelpCircle size={13} className="help-icon" /></label>
            <input className="pf-input" placeholder="z.B. 01-01-20 - Drehort" value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Marke</label>
            <input className="pf-input" placeholder="z.B. Fotohahn" value={formData.brand} onChange={(e) => updateField('brand', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Passwort</label>
            <input className="pf-input" placeholder="Optional" type="password" value={formData.password} onChange={(e) => updateField('password', e.target.value)} />
          </div>

          <div className="pf-field">
            <label>Sprache</label>
            <select className="pf-input" value={formData.language} onChange={(e) => updateField('language', e.target.value)}>
              <option>Deutsch</option>
              <option>English</option>
              <option>Français</option>
              <option>Italiano</option>
            </select>
          </div>

          <div className="pf-field">
            <label>Domain</label>
            <div className="pf-domain-row">
              <input className="pf-input" style={{ flex: '0 0 45%' }} placeholder="fotohahn.ch" value={formData.domain} onChange={(e) => updateField('domain', e.target.value)} />
              <div>
                <span className="pf-domain-label">Pfad</span>
                <input className="pf-input" value={formData.domain_path} onChange={(e) => updateField('domain_path', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="pf-field">
            <label>Tags</label>
            <div className="pf-tags-input">
              <Tag size={14} className="text-primary" />
              <input placeholder="Kommagetrennt: Hochzeit, Portrait" value={formData.tags} onChange={(e) => updateField('tags', e.target.value)} />
            </div>
          </div>

          <input ref={titelbildInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleTitelbildUpload} />
          <button className="pf-btn-upload" onClick={() => titelbildInputRef.current?.click()}>
            Titelbild hochladen
          </button>
          {formData.cover_image_name && (
            <div className="pf-titelbild-row">
              <span>{formData.cover_image_name}</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button className="icon-btn" onClick={handleTitelbildDelete} title="Bild löschen"><Trash2 size={14} /></button>
              </div>
            </div>
          )}
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
              <div className="pf-sim-header">
                <div className="pf-sim-logo">
                  <span style={{ fontSize: 10, fontWeight: 600 }}>F</span>
                </div>
                <div className="pf-sim-social">
                  <Link2 size={14} />
                  <ImageIcon size={14} />
                </div>
              </div>
              <div className="pf-sim-hero">
                <div className="pf-sim-hero-img">
                  {formData.cover_image ? (
                    <img src={formData.cover_image} alt="Titelbild" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <ImageIcon size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  )}
                </div>
              </div>
              <h3 className="pf-sim-title">{formData.title || 'Portfolio'}</h3>
              <div className="pf-sim-controls">
                <select className="pf-sim-sort"><option>Sortieren nach</option></select>
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
  const { user } = useAuth();
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [portfolioList, setPortfolioList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load portfolios from Supabase
  const loadPortfolios = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPortfolioList(data || []);
    } catch (err) {
      console.error('[Portfolios] Load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadPortfolios(); }, [user]);

  const handleDelete = async (id) => {
    if (!window.confirm('Portfolio wirklich löschen?')) return;
    try {
      const { error } = await supabase.from('portfolios').delete().eq('id', id);
      if (error) throw error;
      setPortfolioList(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('[Portfolio] Delete error:', err);
    }
  };

  const handleCreate = async () => {
    const title = prompt('Portfolio-Titel eingeben:');
    if (!title?.trim() || !user) return;
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({ title: title.trim(), user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      setPortfolioList(prev => [data, ...prev]);
    } catch (err) {
      console.error('[Portfolio] Create error:', err);
      alert('Fehler beim Erstellen: ' + err.message);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('de-CH') + ' - ' + d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter
  const filtered = portfolioList.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
  });

  if (selectedPortfolio) {
    return (
      <PortfolioDetail
        portfolio={selectedPortfolio}
        onBack={() => { setSelectedPortfolio(null); loadPortfolios(); }}
        onSave={loadPortfolios}
      />
    );
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
            <input
              type="text" placeholder="Suche" className="search-input"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
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
            {loading && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>Laden...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                {searchQuery ? 'Keine Ergebnisse' : 'Keine Portfolios vorhanden. Erstelle dein erstes Portfolio!'}
              </td></tr>
            )}
            {filtered.map((portfolio) => (
              <tr key={portfolio.id}>
                <td className="img-col">
                  <div className="gallery-thumbnail">
                    {portfolio.cover_image ? (
                      <img src={portfolio.cover_image} alt={portfolio.title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                    ) : (
                      <ImageIcon size={16} className="text-muted" />
                    )}
                  </div>
                </td>
                <td className="font-medium" style={{ color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setSelectedPortfolio(portfolio)}>{portfolio.title}</td>
                <td className="text-muted">{portfolio.description}</td>
                <td className="text-muted text-sm">{formatDate(portfolio.created_at)}</td>
                <td className="text-muted text-sm">{formatDateTime(portfolio.updated_at)}</td>
                <td className="actions">
                  <button title="Bearbeiten" onClick={() => setSelectedPortfolio(portfolio)}><Edit3 size={16} /></button>
                  <button title="Löschen" className="text-red" onClick={() => handleDelete(portfolio.id)}><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
          <span className="text-sm text-muted">{filtered.length} Portfolio{filtered.length !== 1 ? 's' : ''}</span>
          <button className="btn-outline" style={{ border: 'none', color: 'var(--color-primary)' }} onClick={handleCreate}>
            <Plus size={16} /> Neues Portfolio erstellen
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfoliosPage;
