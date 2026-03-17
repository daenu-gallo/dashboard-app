import React, { useRef, useState, useEffect } from 'react';
import { Copy, Mail, Facebook, Twitter, MessageCircle, Image as ImageIcon, X, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useBrand } from '../../contexts/BrandContext';

const DEFAULT_TEMPLATES = [
  {
    id: 'auswahlgalerie',
    name: 'Auswahlgalerie',
    betreff: 'Eure Auswahlgalerie ist fertig!',
    body: 'Hey!\n\nvielen Dank für das tolle Shooting mit euch!\nHeute bekommt ihr eure Auswahlgalerie von mir.\n\nBitte markiert eure Favoriten mit einem Herz, so dass ich die ausgewählten Bilder final bearbeiten kann.',
  },
  {
    id: 'finale-galerie',
    name: 'Finale Galerie',
    betreff: 'Hier kommt eure Online-Galerie!',
    body: 'Hey!\n\nIch melde mich heute mit tollen Neuigkeiten bei euch, denn eure Fotos liegen nun in eurer persönlichen Online-Galerie für euch bereit.\n\nKlickt einfach auf den Link, um direkt zur Galerie zu gelangen:',
  },
];

const VerschickenTab = ({ gallery, galleryKey, settings, uploadedImages, appIconSrc }) => {
  const qrCanvasRef = useRef(null);
  const [showPassword, setShowPassword] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [betreff, setBetreff] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [templates, setTemplates] = usePersistedState('email_templates', DEFAULT_TEMPLATES);
  const { globalBrand } = useBrand();

  // Template modal state
  const [editName, setEditName] = useState('');
  const [editBetreff, setEditBetreff] = useState('');
  const [editBody, setEditBody] = useState('');
  const [selectedEditId, setSelectedEditId] = useState(null);

  const displayTitle = settings?.titel || gallery?.title || 'Galerie';
  const galleryUrl = settings?.domain ? `https://${settings.domain}/${settings?.domainpfad || galleryKey}` : '';
  const password = settings?.passwort || settings?.password || '';

  // Get selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Generate QR code on canvas
  useEffect(() => {
    if (qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, galleryUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });
    }
  }, [galleryUrl]);

  // Get first uploaded image for preview
  const getFirstImage = () => {
    if (!uploadedImages) return null;
    for (const key of Object.keys(uploadedImages)) {
      const imgs = uploadedImages[key];
      if (Array.isArray(imgs) && imgs.length > 0 && imgs[0]?.src) {
        return imgs[0].src;
      }
    }
    return null;
  };
  const previewImage = getFirstImage();

  const handleDownloadQR = async () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'qr-code.png',
            types: [{ description: 'PNG Bild', accept: { 'image/png': ['.png'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, 'image/png');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(galleryUrl);
  };

  // Template dropdown change
  const handleTemplateChange = (e) => {
    const val = e.target.value;
    if (val === '__manage__') {
      setShowTemplateModal(true);
      setSelectedEditId(null);
      setEditName('');
      setEditBetreff('');
      setEditBody('');
      return;
    }
    setSelectedTemplateId(val);
    const tmpl = templates.find(t => t.id === val);
    if (tmpl) {
      setBetreff(tmpl.betreff);
      setEmailBody(tmpl.body);
    }
  };

  // Template management
  const handleSelectEditTemplate = (tmpl) => {
    setSelectedEditId(tmpl.id);
    setEditName(tmpl.name);
    setEditBetreff(tmpl.betreff);
    setEditBody(tmpl.body);
  };

  const handleSaveTemplate = () => {
    if (!editName.trim()) return;
    if (selectedEditId) {
      // Update existing
      setTemplates(prev => prev.map(t =>
        t.id === selectedEditId
          ? { ...t, name: editName, betreff: editBetreff, body: editBody }
          : t
      ));
    } else {
      // Create new
      const newId = 'tmpl_' + Date.now();
      setTemplates(prev => [...prev, { id: newId, name: editName, betreff: editBetreff, body: editBody }]);
      setSelectedEditId(newId);
    }
  };

  const handleDeleteTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selectedEditId === id) {
      setSelectedEditId(null);
      setEditName('');
      setEditBetreff('');
      setEditBody('');
    }
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
      setBetreff('');
    }
  };

  const handleNewTemplate = () => {
    setSelectedEditId(null);
    setEditName('');
    setEditBetreff('');
    setEditBody('');
  };

  return (
    <div className="verschicken-tab">
      {/* Left - Share Links */}
      <div className="share-section">
        <h3>Teilen</h3>

        <div className="share-link-box">
          <label>Link</label>
          <input className="share-link-input" readOnly value={galleryUrl} />
        </div>

        <button className="share-btn primary" onClick={handleCopyLink}>
          <Copy size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
          Link kopieren
        </button>

        <button className="share-btn outline" onClick={() => window.location.href = `mailto:?subject=${encodeURIComponent(displayTitle)}&body=${encodeURIComponent(galleryUrl)}`}>
          <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.35rem' }} />
          E-Mail senden
        </button>

        <div style={{ marginTop: '0.5rem' }}>
          <span className="form-label">QR Code:</span>
          <div className="qr-code-box">
            <canvas ref={qrCanvasRef} style={{ display: 'block' }} />
          </div>
          <button className="share-btn outline" style={{ marginTop: '0.5rem' }} onClick={handleDownloadQR}>
            Download QR-Code
          </button>
        </div>

        <div style={{ marginTop: '0.5rem' }}>
          <span className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Teilen auf:</span>
          <div className="social-buttons">
            <button className="social-btn" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(galleryUrl)}`, '_blank')}>
              <Facebook size={16} /> Facebook
            </button>
            <button className="social-btn" onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(galleryUrl)}&text=${encodeURIComponent(displayTitle)}`, '_blank')}>
              <Twitter size={16} /> Twitter
            </button>
            <button className="social-btn" onClick={() => window.open(`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(galleryUrl)}&description=${encodeURIComponent(displayTitle)}`, '_blank')}>
              <MessageCircle size={16} /> Pinterest
            </button>
            <button className="social-btn" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(displayTitle + ' ' + galleryUrl)}`, '_blank')}>
              <MessageCircle size={16} /> WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* Center - Email */}
      <div className="email-section">
        <h3>E-Mail versenden</h3>

        <div className="form-group">
          <div className="form-label">E-Mail Vorlage</div>
          <select className="form-select" value={selectedTemplateId} onChange={handleTemplateChange}>
            <option value="">E-Mail Vorlage auswählen...</option>
            <option value="__manage__">E-Mail Vorlagen verwalten</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <div className="form-label">Betreff</div>
          <input className="form-input" placeholder="Betreff eingeben" value={betreff} onChange={e => setBetreff(e.target.value)} />
        </div>

        <div className="form-group">
          <div className="form-label">Empfänger</div>
          <input className="form-input" placeholder="🔍 E-Mail Adresse eintragen" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <input type="checkbox" defaultChecked id="emailInfo" style={{ accentColor: 'var(--color-primary)' }} />
          <label htmlFor="emailInfo" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            E-Mail Adressen werden in Zusammenhang mit einem Kauf ermittelt ⓘ
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" id="emailCopy" style={{ accentColor: 'var(--color-primary)' }} />
          <label htmlFor="emailCopy" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Schicke mir diese E-Mail als Kopie zu
          </label>
        </div>

        <button className="share-btn primary" style={{ marginTop: '0.5rem' }}>
          E-Mail absenden
        </button>

        {password && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="showPw"
              checked={showPassword}
              onChange={e => setShowPassword(e.target.checked)}
              style={{ accentColor: 'var(--color-primary)' }}
            />
            <label htmlFor="showPw" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Passwort in Mail anzeigen
            </label>
          </div>
        )}
      </div>

      {/* Right - Preview */}
      <div className="preview-section">
        <div className="preview-card">
           {/* Logo */}
           <div className="preview-card-header">
             <div className="preview-card-logo">
               {(globalBrand.logoDark || appIconSrc) ? (
                <img src={globalBrand.logoDark || appIconSrc} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
              ) : (
                <ImageIcon size={24} />
              )}
            </div>
          </div>

          <div className="preview-card-body">
            {/* Gallery Image */}
            {previewImage ? (
              <img
                src={previewImage}
                alt={displayTitle}
                style={{
                  width: '100%',
                  height: '160px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '160px',
                background: 'linear-gradient(135deg, #e0e0e0, #c0c0c0)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(0,0,0,0.3)'
              }}>
                <ImageIcon size={28} />
              </div>
            )}

            <h4>{displayTitle}</h4>

            {/* Email body text - editable */}
            <textarea
              style={{
                background: '#f0f4f8',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                textAlign: 'left',
                fontSize: '0.8125rem',
                lineHeight: '1.6',
                color: '#4a5568',
                margin: '1rem 0',
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Bitte wähle eine Vorlage aus dem Dropdown oder tippe hier..."
            />

            <button className="share-btn primary" style={{ background: '#333', borderColor: '#333' }}>
              GALERIE ÖFFNEN
            </button>

            {password && showPassword && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Passwort zum Öffnen der Galerie: <strong>{password}</strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Template Management Modal */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="template-modal" onClick={e => e.stopPropagation()}>
            <div className="template-modal-header">
              <h3>E-Mail Vorlagen verwalten</h3>
              <button className="modal-close-btn" onClick={() => setShowTemplateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="template-modal-body">
              {/* Left sidebar - template list */}
              <div className="template-list">
                {templates.map(t => (
                  <div
                    key={t.id}
                    className={`template-list-item ${selectedEditId === t.id ? 'active' : ''}`}
                    onClick={() => handleSelectEditTemplate(t)}
                  >
                    <span>{t.name}</span>
                    <button
                      className="template-delete-btn"
                      onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      title="Vorlage löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button className="share-btn primary" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }} onClick={handleNewTemplate}>
                  Neue Vorlage erstellen
                </button>
              </div>

              {/* Right side - edit form */}
              <div className="template-edit-form">
                <div className="template-edit-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <div className="form-label">Name der E-Mail Vorlage</div>
                    <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Vorlagenname..." />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <div className="form-label">Betreff der Vorlage</div>
                    <input className="form-input" value={editBetreff} onChange={e => setEditBetreff(e.target.value)} placeholder="Betreff..." />
                  </div>
                </div>
                <div className="form-group">
                  <textarea
                    className="form-input"
                    style={{ minHeight: '180px', resize: 'vertical' }}
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    placeholder="E-Mail verfassen..."
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="share-btn primary" style={{ fontSize: '0.8rem' }} onClick={handleSaveTemplate}>
                    Speichern
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerschickenTab;
