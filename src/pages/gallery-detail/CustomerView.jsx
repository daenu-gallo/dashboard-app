import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft, ChevronDown, Share2, LogIn, UserPlus, Mail, Image as ImageIcon, Play, X, Facebook, Twitter, Instagram, Youtube, Heart, User, Download, Lock, Eye, EyeOff, Send } from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';
import { useBrand } from '../../contexts/BrandContext';
import { useMetaTags } from '../../hooks/useMetaTags';
import { useTrackView } from '../../hooks/useTrackView';
import { supabase } from '../../lib/supabaseClient';
import JSZip from 'jszip';
import NotFoundPage from '../NotFoundPage';
import './CustomerView.css';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

const toSlug = (title) => title.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

// Translation strings
const translations = {
  Deutsch: {
    gallery: 'Galerie',
    selections: 'Auswahlen',
    contact: 'Kontakt',
    downloadPhotos: 'Bilder herunterladen',
    createAccount: 'Account erstellen',
    accountLogin: 'Account login',
    faq: "Hier geht's zu den FAQs",
    passwordTitle: 'Passwortgeschützte Galerie',
    passwordPlaceholder: 'Passwort eingeben',
    passwordButton: 'Galerie anschauen',
    passwordError: 'Falsches Passwort',
    pinTitle: 'Download PIN eingeben',
    pinPlaceholder: 'PIN eingeben',
    pinButton: 'Download starten',
    pinError: 'Falscher PIN',
    share: 'Teilen',
    weddingVideo: 'Hochzeitsvideo',
    appInstallTitle: 'App installieren',
    appInstallText: 'Installiere diese Galerie als App auf deinem Gerät für schnelleren Zugriff.',
    appInstallButton: 'Jetzt installieren',
    appInstallDismiss: 'Später',
    noPhotos: 'Noch keine Bilder',
    downloadStarted: 'Download wird gestartet...',
    photosBy: 'Fotos von',
  },
  English: {
    gallery: 'Gallery',
    selections: 'Selections',
    contact: 'Contact',
    downloadPhotos: 'Download photos',
    createAccount: 'Create account',
    accountLogin: 'Account login',
    faq: 'Go to FAQs',
    passwordTitle: 'Password protected gallery',
    passwordPlaceholder: 'Enter password',
    passwordButton: 'View gallery',
    passwordError: 'Wrong password',
    pinTitle: 'Enter download PIN',
    pinPlaceholder: 'Enter PIN',
    pinButton: 'Start download',
    pinError: 'Wrong PIN',
    share: 'Share',
    weddingVideo: 'Wedding video',
    appInstallTitle: 'Install App',
    appInstallText: 'Install this gallery as an app on your device for faster access.',
    appInstallButton: 'Install now',
    appInstallDismiss: 'Later',
    noPhotos: 'No photos yet',
    downloadStarted: 'Starting download...',
    photosBy: 'Photos by',
  },
  'Français': {
    gallery: 'Galerie',
    selections: 'Sélections',
    contact: 'Contact',
    downloadPhotos: 'Télécharger les photos',
    createAccount: 'Créer un compte',
    accountLogin: 'Connexion',
    faq: 'Accéder aux FAQs',
    passwordTitle: 'Galerie protégée par mot de passe',
    passwordPlaceholder: 'Entrer le mot de passe',
    passwordButton: 'Voir la galerie',
    passwordError: 'Mot de passe incorrect',
    pinTitle: 'Entrer le code PIN',
    pinPlaceholder: 'Entrer le PIN',
    pinButton: 'Démarrer le téléchargement',
    pinError: 'PIN incorrect',
    share: 'Partager',
    weddingVideo: 'Vidéo de mariage',
    appInstallTitle: "Installer l'application",
    appInstallText: 'Installez cette galerie en tant qu\'application pour un accès plus rapide.',
    appInstallButton: 'Installer maintenant',
    appInstallDismiss: 'Plus tard',
    noPhotos: 'Pas encore de photos',
    downloadStarted: 'Téléchargement en cours...',
    photosBy: 'Photos par',
  },
  Italiano: {
    gallery: 'Galleria',
    selections: 'Selezioni',
    contact: 'Contatto',
    downloadPhotos: 'Scarica le foto',
    createAccount: 'Crea un account',
    accountLogin: 'Accedi',
    faq: 'Vai alle FAQ',
    passwordTitle: 'Galleria protetta da password',
    passwordPlaceholder: 'Inserisci la password',
    passwordButton: 'Visualizza la galleria',
    passwordError: 'Password errata',
    pinTitle: 'Inserisci il PIN',
    pinPlaceholder: 'Inserisci il PIN',
    pinButton: 'Avvia il download',
    pinError: 'PIN errato',
    share: 'Condividi',
    weddingVideo: 'Video del matrimonio',
    appInstallTitle: "Installa l'app",
    appInstallText: 'Installa questa galleria come app per un accesso più rapido.',
    appInstallButton: 'Installa ora',
    appInstallDismiss: 'Più tardi',
    noPhotos: 'Nessuna foto ancora',
    downloadStarted: 'Download in corso...',
    photosBy: 'Foto di',
  },
};

const CustomerView = ({ domainMode = null }) => {
  const { slug: urlSlug } = useParams();

  // ── Resolve gallery slug or custom domain ──
  // Priority: domainMode > URL slug
  const [resolvedSlug, setResolvedSlug] = useState(
    domainMode?.type === 'subdomain' ? domainMode.slug
    : domainMode?.type === 'gallery-home' ? urlSlug  // galerie.fotohahn.ch/:slug
    : urlSlug
  );
  const [domainLookupDone, setDomainLookupDone] = useState(!domainMode || domainMode.type === 'subdomain' || domainMode.type === 'gallery-home');

  // ── Load gallery + albums from Supabase ──
  const [supaGallery, setSupaGallery] = useState(null);
  const [supaAlbums, setSupaAlbums] = useState([]);
  const [supaLoading, setSupaLoading] = useState(true);
  const [supaBrand, setSupaBrand] = useState(null);

  // Custom domain lookup: resolve domain → brand → user's galleries
  useEffect(() => {
    if (!domainMode || domainMode.type !== 'custom') return;
    (async () => {
      try {
        // Strip 'app.' prefix to find brand website: app.muellerfoto.ch → muellerfoto.ch
        const brandDomain = domainMode.domain.replace(/^app\./, '');
        const { data: brand } = await supabase
          .from('brands')
          .select('user_id')
          .eq('website', brandDomain)
          .eq('active', true)
          .maybeSingle();
        if (brand && urlSlug) {
          // URL has slug: app.muellerfoto.ch/hochzeit-2025 → load that gallery
          setResolvedSlug(urlSlug);
        } else if (brand) {
          // No slug in URL: app.muellerfoto.ch/ → load first gallery for this user
          const { data: firstGallery } = await supabase
            .from('galleries')
            .select('slug')
            .eq('user_id', brand.user_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (firstGallery) setResolvedSlug(firstGallery.slug);
        }
      } catch (err) {
        console.error('[CustomerView] Custom domain lookup error:', err);
      }
      setDomainLookupDone(true);
    })();
  }, [domainMode]);

  // Use resolvedSlug for everything (could come from URL, subdomain, or domain lookup)
  const slug = resolvedSlug || urlSlug;

  useEffect(() => {
    if (!domainLookupDone || !slug) return;
    (async () => {
      try {
        // Fetch gallery by slug (public, no auth needed)
        const { data: gallery } = await supabase
          .from('galleries').select('*').eq('slug', slug).maybeSingle();
        if (gallery) {
          setSupaGallery(gallery);
          // Fetch albums for this gallery
          const { data: albumData } = await supabase
            .from('albums').select('*').eq('gallery_id', gallery.id).order('sort_order', { ascending: true });
          if (albumData) setSupaAlbums(albumData);
          // Fetch brand if gallery has a user_id
          if (gallery.user_id) {
            const { data: brands } = await supabase
              .from('brands').select('*').eq('user_id', gallery.user_id).eq('active', true).limit(1);
            if (brands?.[0]) setSupaBrand(brands[0]);
          }
        }
      } catch (err) { console.error('[CustomerView] Supabase load error:', err); }
      setSupaLoading(false);
    })();
  }, [slug, domainLookupDone]);

  // Gallery key for localStorage fallback (videos only)
  const galleryKey = supaGallery?.title || slug;

  // Track gallery page view (anonymous, non-blocking)
  useTrackView(supaGallery?.id);

  // Settings directly from Supabase (no localStorage fallback needed)
  const settings = supaGallery ? {
    titel: supaGallery.title || slug,
    domain: supaGallery.domain || '',
    domainpfad: supaGallery.domain_path || slug,
    passwort: supaGallery.password || '',
    sprache: supaGallery.language || 'Deutsch',
    mitteilung: supaGallery.message || '',
    downloadPinCode: supaGallery.download_pin_code || '',
    shootingdatum: supaGallery.shooting_date || '',
  } : {
    titel: slug || '', domain: '', domainpfad: toSlug(slug || ''), passwort: '',
    sprache: 'Deutsch', mitteilung: '', downloadPinCode: '', shootingdatum: '',
  };

  const toggles = supaGallery?.toggles || {
    appHinweis: true, teilen: true, kommentarfunktion: false,
    dateienamen: false, download: true, downloadPin: false, wasserzeichen: false,
  };

  // Albums from Supabase
  const albums = supaAlbums.map(a => ({ name: a.name, count: 0, previewCount: 2, totalPhotos: 2 }));
  const albumNames = supaAlbums.reduce((acc, a, idx) => ({ ...acc, [idx]: a.name }), {});
  const albumToggles = supaAlbums.reduce((acc, a, idx) => ({ ...acc, [idx]: a.toggles || {} }), {});

  // ── Images from Supabase images table (NAS storage) ──
  const [uploadedImages, setUploadedImages] = useState({});
  useEffect(() => {
    if (!supaGallery?.id) return;
    (async () => {
      const { data } = await supabase
        .from('images')
        .select('*')
        .eq('gallery_id', supaGallery.id)
        .order('sort_order', { ascending: true });
      if (data) {
        const grouped = {};
        data.forEach(img => {
          const idx = img.album_index;
          if (!grouped[idx]) grouped[idx] = [];
          grouped[idx].push({
            src: UPLOAD_API + img.original_url,
            thumbSrc: UPLOAD_API + img.thumb_url,
            name: img.filename,
            id: img.id,
          });
        });
        setUploadedImages(grouped);
      }
    })();
  }, [supaGallery?.id]);

  // Videos still from localStorage (embeds/YouTube URLs)
  const [uploadedVideos] = usePersistedState(`gallery_${galleryKey}_videos`, {});

  // Brand: use Supabase data (must be before useMetaTags which references brandName)
  const activeBrand = supaBrand || { name: '' };
  const brandName = activeBrand.name;

  // ── SEO: Dynamic Open Graph meta tags for sharing ──
  const totalPhotos = Object.values(uploadedImages).reduce((sum, imgs) => sum + imgs.length, 0);
  const firstImage = Object.values(uploadedImages).find(a => a?.length > 0)?.[0]?.src || null;
  useMetaTags({
    title: settings.titel ? `${settings.titel} | Fotogalerie` : 'Fotogalerie',
    description: `${totalPhotos} Fotos${brandName ? ` von ${brandName}` : ''}. Galerie ansehen und Bilder herunterladen.`,
    image: firstImage,
    url: typeof window !== 'undefined' ? window.location.href : '',
    type: 'website',
    siteName: brandName || 'Fotohahn Gallery',
  });

  // Legal links – use internal routes
  const impressumUrl = '/legal/impressum';
  const datenschutzUrl = '/legal/datenschutz';

  // Global brand settings (logos, contact, social) - still localStorage for now
  const { globalBrand } = useBrand();

  // Watermarks from settings
  const [watermarks] = usePersistedState('settings_watermarks_v2', []);
  const selectedWm = watermarks.find(wm => String(wm.id) === String(toggles.selectedWatermarkId)) || null;

  // Dynamic watermark overlay component with hierarchy:
  // Album-level watermark → Gallery-level watermark → none
  const WatermarkOverlay = ({ className, variant, albumIdx }) => {
    // Hierarchy: check album-level first, then gallery-level
    const albumWmEnabled = albumIdx != null && !!albumToggles[albumIdx]?.watermark;
    const galleryWmEnabled = !!toggles.wasserzeichen;
    const isEnabled = albumWmEnabled || galleryWmEnabled;
    if (!isEnabled) return null;

    // Resolve watermark: album-level override → gallery-level → null
    const albumWmId = albumIdx != null ? albumToggles[albumIdx]?.watermarkId : null;
    const galleryWmId = toggles.selectedWatermarkId;
    const resolvedId = albumWmId || galleryWmId;
    const wm = resolvedId ? watermarks.find(w => String(w.id) === String(resolvedId)) : null;

    if (!wm) return <span className={className}>{brandName || 'Wasserzeichen'}</span>;

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
    const opacityVal = (wm.transparency ?? 50) / 100;
    const pos = wm.position || 'mitte';

    if (wm.wmType === 'image' && wm.image) {
      const scaleVal = (wm.scale ?? 100) / 100;
      return (
        <img src={wm.image} alt="" style={{
          position: 'absolute', maxWidth: '35%', maxHeight: '35%', objectFit: 'contain',
          opacity: opacityVal, pointerEvents: 'none', zIndex: 5,
          transform: (posMap[pos]?.transform || '') + ` scale(${scaleVal})`,
          ...posMap[pos],
        }} />
      );
    }

    if (wm.wmType === 'text') {
      const fontStr = wm.font || 'Open Sans, 64px, weiß';
      const [fontName, fontSizeStr] = fontStr.split(',').map(s => s.trim());
      const fontPx = parseInt(fontSizeStr) || 64;
      const scaledSize = variant === 'lightbox' ? fontPx * 0.6 : variant === 'hero' ? fontPx * 0.5 : fontPx * 0.25;
      const fontColor = fontStr.includes('schwarz') ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)';
      return (
        <span style={{
          position: 'absolute', fontFamily: `'${fontName}', sans-serif`, fontSize: scaledSize,
          fontWeight: 700, color: fontColor, opacity: opacityVal, pointerEvents: 'none', zIndex: 5,
          textShadow: '0 2px 8px rgba(0,0,0,0.4)', whiteSpace: 'nowrap',
          ...posMap[pos],
        }}>
          {wm.text || wm.name}
        </span>
      );
    }

    if (wm.wmType === 'tile' && wm.image) {
      const spacing = wm.tileSpacing ?? 120;
      const size = wm.tileSize ?? 60;
      const containerH = variant === 'lightbox' ? 600 : variant === 'hero' ? 400 : 250;
      const containerW = variant === 'lightbox' ? 900 : variant === 'hero' ? 800 : 350;
      const tiles = [];
      for (let row = -1; row < Math.ceil(containerH / spacing) + 1; row++) {
        for (let col = -1; col < Math.ceil(containerW / spacing) + 1; col++) {
          const x = col * spacing + (row % 2 ? spacing / 2 : 0);
          const y = row * spacing;
          tiles.push(
            <img key={`${row}-${col}`} src={wm.image} alt="" style={{
              position: 'absolute', width: size, height: size, objectFit: 'contain',
              left: x, top: y, opacity: opacityVal, transform: 'rotate(-15deg)', pointerEvents: 'none',
            }} />
          );
        }
      }
      return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 5, pointerEvents: 'none' }}>{tiles}</div>;
    }

    // Fallback
    return <span className={className}>{wm.text || wm.name || `${brandName}.ch`}</span>;
  };

  // Design: from Supabase gallery.design (DesignTab syncs there already)
  const sbDesign = supaGallery?.design || {};
  const designTemplate = sbDesign.template || sbDesign.vorlage || 'atelier';
  const designPrimary = sbDesign.primaryColor || sbDesign.primaerfarbe || '#f0f0f4';
  const designSecondary = sbDesign.secondaryColor || sbDesign.sekundaerfarbe || '#1a1a1a';
  const designFont = sbDesign.font || sbDesign.schriftart || 'Inter';
  const designSpacing = sbDesign.spacing || sbDesign.bildabstand || 'klein';
  const designDisplay = sbDesign.display || sbDesign.bilddarstellung || 'standard';

  // Load Google Font
  React.useEffect(() => {
    const fontLink = document.getElementById('cv-google-font');
    const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(designFont)}:wght@300;400;500;600;700&display=swap`;
    if (fontLink) {
      fontLink.href = fontUrl;
    } else {
      const link = document.createElement('link');
      link.id = 'cv-google-font';
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }, [designFont]);

  // Spacing value
  const spacingPx = designSpacing === 'gross' ? '12px' : designSpacing === 'mittel' ? '8px' : '5px';

  // CSS custom properties for design
  const designStyles = {
    '--cv-primary': designPrimary,
    '--cv-secondary': designSecondary,
    '--cv-font': designFont + ', sans-serif',
    '--cv-spacing': spacingPx,
    fontFamily: designFont + ', sans-serif',
  };

  // Language
  const lang = settings.sprache === 'English' ? 'English' : settings.sprache === 'Français' ? 'Français' : settings.sprache === 'Italiano' ? 'Italiano' : 'Deutsch';
  const t = translations[lang];

  // No slug available: show 404 (e.g. galerie.fotohahn.ch without a gallery path)
  if (!supaLoading && !supaGallery && !slug) {
    return <NotFoundPage />;
  }

  // 404: Gallery not found
  if (!supaLoading && !supaGallery) {
    return <NotFoundPage />;
  }

  const [menuOpen, setMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [showSelectionView, setShowSelectionView] = useState(false);
  const [showActionPopup, setShowActionPopup] = useState(false);
  const [showSendForm, setShowSendForm] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadChoice, setDownloadChoice] = useState('');
  const [downloadAlbumChecks, setDownloadAlbumChecks] = useState({});
  const [sendMessage, setSendMessage] = useState('');
  const [selectionName, setSelectionName] = useState('');

  // Password gate
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // App install hint
  const [showAppHint, setShowAppHint] = useState(() => window.innerWidth < 768);
  const [showInstallPopup, setShowInstallPopup] = useState(false);

  // Sidebar visibility — only show after scrolling past hero
  const [showSidebar, setShowSidebar] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show sidebar when hero is NOT fully visible (scrolled past)
        setShowSidebar(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    const heroEl = heroRef.current;
    if (heroEl) observer.observe(heroEl);
    return () => { if (heroEl) observer.unobserve(heroEl); };
  }, []);

  // Download toast
  const [downloadToast, setDownloadToast] = useState(false);
  const downloadToastTimer = useRef(null);

  // Customer login & selection
  const [customerUser, setCustomerUser] = useState(() => {
    try {
      const stored = localStorage.getItem(`gallery_${galleryKey}_customerUser`);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [selections, setSelections] = usePersistedState(`gallery_${galleryKey}_selections`, []);
  // selections = [{ userId: 'email', userName: 'Name', userEmail: 'email', photos: [{src, name, albumIdx, photoIdx}] }]

  const saveCustomerUser = (user) => {
    setCustomerUser(user);
    localStorage.setItem(`gallery_${galleryKey}_customerUser`, JSON.stringify(user));
  };

  const handleCustomerLogin = (e) => {
    e.preventDefault();
    if (!loginName.trim() || !loginEmail.trim()) return;
    const user = { name: loginName.trim(), email: loginEmail.trim().toLowerCase() };
    saveCustomerUser(user);
    setShowLoginModal(false);
    // Ensure this user exists in selections
    setSelections(prev => {
      const existing = prev.find(s => s.userEmail === user.email);
      if (!existing) return [...prev, { userId: user.email, userName: user.name, userEmail: user.email, photos: [] }];
      return prev;
    });
    // If there was a pending photo selection, do it now
    if (pendingSelection.current) {
      const { src, name, albumIdx, photoIdx } = pendingSelection.current;
      togglePhotoSelection(src, name, albumIdx, photoIdx, user);
      pendingSelection.current = null;
    }
  };

  const pendingSelection = useRef(null);

  const isPhotoSelected = (src) => {
    if (!customerUser) return false;
    const userSel = selections.find(s => s.userEmail === customerUser.email);
    return userSel?.photos?.some(p => p.src === src) || false;
  };

  const togglePhotoSelection = (src, name, albumIdx, photoIdx, user) => {
    const u = user || customerUser;
    if (!u) return;
    setSelections(prev => {
      const updated = [...prev];
      let userIdx = updated.findIndex(s => s.userEmail === u.email);
      if (userIdx === -1) {
        updated.push({ userId: u.email, userName: u.name, userEmail: u.email, photos: [] });
        userIdx = updated.length - 1;
      }
      const photos = [...updated[userIdx].photos];
      const existIdx = photos.findIndex(p => p.src === src);
      if (existIdx >= 0) {
        photos.splice(existIdx, 1);
      } else {
        photos.push({ src, name: name || '', albumIdx, photoIdx });
      }
      updated[userIdx] = { ...updated[userIdx], photos };
      return updated;
    });
  };

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxPhotos, setLightboxPhotos] = useState([]);

  // Build flat list of all photos for lightbox
  const getAllPhotos = () => {
    const all = [];
    albums.forEach((album, aIdx) => {
      if (albumToggles[aIdx]?.hidden) return;
      const imgs = uploadedImages[aIdx] || [];
      imgs.forEach(img => { if (img && img.src) all.push(img); });
    });
    return all;
  };

  const openLightbox = (aIdx, pIdx) => {
    const allImgs = getAllPhotos();
    // Find the global index for this photo
    let globalIdx = 0;
    for (let a = 0; a < albums.length; a++) {
      if (albumToggles[a]?.hidden) continue;
      const imgs = uploadedImages[a] || [];
      if (a === aIdx) { globalIdx += pIdx; break; }
      globalIdx += imgs.filter(i => i && i.src).length;
    }
    setLightboxPhotos(allImgs);
    setLightboxIndex(globalIdx);
    setLightboxOpen(true);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(i + 1, lightboxPhotos.length - 1));
      if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxOpen, lightboxPhotos.length]);
  const triggerDownloadToast = () => {
    setDownloadToast(true);
    if (downloadToastTimer.current) clearTimeout(downloadToastTimer.current);
    downloadToastTimer.current = setTimeout(() => setDownloadToast(false), 3000);
  };

  // Download PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);

  const handleDownloadClick = () => {
    if (toggles.downloadPin && settings.downloadPinCode && !pinVerified) {
      setShowPinModal(true);
      setPinInput('');
      setPinError(false);
    } else {
      setShowDownloadModal(true);
      setDownloadChoice('');
      setZipReady(null);
    }
  };

  // Prepare a ZIP and save it using native Save As dialog
  const [zipReady, setZipReady] = useState(null); // { url, filename } — fallback only

  const prepareZipDownload = async (images, zipName) => {
    if (!images || images.length === 0) return;

    const zip = new JSZip();

    // Fetch images from URLs (NAS) and add to ZIP
    for (let idx = 0; idx < images.length; idx++) {
      const img = images[idx];
      const name = img.name || `IMG_${String(idx + 1).padStart(4, '0')}.jpg`;
      try {
        const response = await fetch(img.src);
        const blob = await response.blob();
        zip.file(name, blob);
      } catch (err) {
        console.warn(`[ZIP] Failed to fetch image ${name}:`, err);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = (zipName || galleryKey || 'Galerie') + '.zip';

    // Use native Save As dialog (File System Access API)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'ZIP Archiv',
            accept: { 'application/zip': ['.zip'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setShowDownloadModal(false);
        triggerDownloadToast();
        return;
      } catch (e) {
        // User cancelled the dialog — do nothing
        if (e.name === 'AbortError') return;
      }
    }

    // Fallback: show clickable link
    const url = URL.createObjectURL(blob);
    setZipReady({ url, filename });
  };

  const handleDownloadSubmit = async () => {
    if (!downloadChoice) return;
    setZipReady(null);

    let images = [];
    let zipName = galleryKey;

    if (downloadChoice === 'gallery') {
      images = getAllPhotos();
    } else if (downloadChoice === 'albums') {
      albums.forEach((album, aIdx) => {
        if (albumToggles[aIdx]?.hidden) return;
        if (!downloadAlbumChecks[aIdx]) return;
        const albumImgs = uploadedImages[aIdx] || [];
        albumImgs.forEach(img => { if (img && img.src) images.push(img); });
      });
    } else if (downloadChoice === 'selection') {
      const userSel = customerUser ? selections.find(s => s.userEmail === customerUser.email) : null;
      images = userSel?.photos || [];
      zipName = (galleryKey || 'Auswahl') + '_Auswahl';
    } else if (downloadChoice === 'single') {
      const all = getAllPhotos();
      if (all.length > 0) images = [all[0]];
    }

    if (images.length > 0) {
      await prepareZipDownload(images, zipName);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput.toUpperCase() === (settings.downloadPinCode || '').toUpperCase()) {
      setPinVerified(true);
      setShowPinModal(false);
      triggerDownloadToast();
    } else {
      setPinError(true);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === settings.passwort) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const displayTitle = (settings.titel || galleryKey).toUpperCase();

  // Collect ALL photos from all visible albums for hero slider
  const allPhotos = [];
  albums.forEach((album, idx) => {
    if (albumToggles[idx]?.hidden) return;
    const imgs = uploadedImages[idx] || [];
    imgs.forEach(img => {
      if (img && img.src) allPhotos.push(img);
    });
  });

  // Auto-advance hero slider every 3 seconds
  useEffect(() => {
    if (allPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % allPhotos.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [allPhotos.length]);

  // Reset slide if it goes out of bounds
  useEffect(() => {
    if (allPhotos.length > 0 && currentSlide >= allPhotos.length) {
      setCurrentSlide(0);
    }
  }, [allPhotos.length, currentSlide]);

  // Check if any album has download enabled
  const anyAlbumDownload = Object.values(albumToggles).some(t => t?.download);
  const showDownloadMenu = toggles.download || anyAlbumDownload;

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % Math.max(1, allPhotos.length));
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + Math.max(1, allPhotos.length)) % Math.max(1, allPhotos.length));

  // Password gate
  if (settings.passwort && !isAuthenticated) {
    return (
      <div className="customer-view cv-password-gate">
        <div className="cv-password-modal">
          <div className="cv-password-icon"><Lock size={40} /></div>
          <h2 className="cv-password-title">{settings.titel || galleryKey}</h2>
          <p className="cv-password-subtitle">{t.passwordTitle}</p>
          <form onSubmit={handlePasswordSubmit} className="cv-password-form">
            <input
              type="password"
              className="cv-password-input"
              placeholder={t.passwordPlaceholder}
              value={passwordInput}
              onChange={e => { setPasswordInput(e.target.value); setPasswordError(false); }}
              autoFocus
            />
            {passwordError && <p className="cv-password-error">{t.passwordError}</p>}
            <button type="submit" className="cv-password-btn">{t.passwordButton}</button>
          </form>
        </div>
      </div>
    );
  }

  // Extract embed URL from embed code
  const getEmbedSrc = (video) => {
    if (!video) return null;
    if (video.type === 'embed' && video.url) {
      // Try to extract src from iframe
      const match = video.url.match(/src=["']([^"']+)["']/);
      if (match) return match[1];
      // If it's a raw URL
      if (video.url.startsWith('http')) return video.url;
    }
    return null;
  };

  // ── Scroll Fade-In Animations ──
  React.useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('cv-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px 50px 0px' });

    const observeElements = () => {
      const container = document.querySelector('.customer-view');
      if (!container) return;
      container.querySelectorAll('.cv-photo, .cv-album-title, .cv-footer').forEach(el => {
        if (!el.classList.contains('cv-fade-in') && !el.classList.contains('cv-slide-in')) {
          if (el.classList.contains('cv-album-title')) {
            el.classList.add('cv-slide-in');
          } else if (el.classList.contains('cv-footer')) {
            el.classList.add('cv-fade-in');
          } else {
            el.classList.add('cv-fade-in');
          }
          observer.observe(el);
        }
      });
    };

    // Initial observe
    const timer = setTimeout(observeElements, 300);

    // Re-observe when DOM changes (new albums rendered)
    const mutationObserver = new MutationObserver(() => {
      observeElements();
    });
    const cv = document.querySelector('.customer-view');
    if (cv) {
      mutationObserver.observe(cv, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return (
    <div className="customer-view" style={designStyles}>
      {/* App Install Hint */}
      {showAppHint && toggles.appHinweis && (
        <div className="cv-app-hint">
          <div className="cv-app-hint-content">
            <strong>{t.appInstallTitle}</strong>
            <p>{t.appInstallText}</p>
          </div>
          <div className="cv-app-hint-actions">
            <button className="cv-app-hint-btn" onClick={() => { setShowAppHint(false); setShowInstallPopup(true); }}>{t.appInstallButton}</button>
            <button className="cv-app-hint-dismiss" onClick={() => setShowAppHint(false)}>{t.appInstallDismiss}</button>
          </div>
        </div>
      )}

      {/* App Install Instructions Popup */}
      {showInstallPopup && (
        <div className="cv-modal-overlay" onMouseDown={() => setShowInstallPopup(false)}>
          <div className="cv-install-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="cv-install-close" onClick={() => setShowInstallPopup(false)}><X size={18} /></button>
            <h3>App installieren</h3>
            <div className="cv-install-section">
              <h4>Android (Chrome)</h4>
              <ol>
                <li>Öffnen Sie Chrome und die Website.</li>
                <li>Tippen Sie rechts oben auf die drei Punkte.</li>
                <li>Wählen Sie „Zum Startbildschirm hinzufügen".</li>
                <li>Namen eingeben und auf „Hinzufügen" klicken.</li>
              </ol>
            </div>
            <div className="cv-install-section">
              <h4>iOS / iPhone (Safari)</h4>
              <ol>
                <li>Öffnen Sie Safari und die Website.</li>
                <li>Tippen Sie unten auf das Teilen-Symbol (Viereck mit Pfeil nach oben).</li>
                <li>Wählen Sie „Zum Home-Bildschirm".</li>
                <li>Namen eingeben und auf „Hinzufügen" tippen.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Icon Sidebar — only visible after scrolling past hero */}
      <div className={`cv-icon-sidebar ${showSidebar ? 'cv-sidebar-visible' : ''}`}>
        <button className="cv-icon-btn" title={t.gallery} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(!menuOpen); }}>
          <ImageIcon size={22} />
        </button>
        <button className={`cv-icon-btn ${selectionMode ? 'active' : ''}`} title={t.selections} onClick={() => {
          if (!customerUser) { setShowLoginModal(true); return; }
          setSelectionMode(!selectionMode);
        }}>
          <Heart size={22} fill={selectionMode ? '#e74c3c' : 'none'} color={selectionMode ? '#e74c3c' : undefined} />
        </button>
        <button className="cv-icon-btn" title={t.contact} onClick={() => { setShowContact(true); }}>
          <Mail size={22} />
        </button>
        {showDownloadMenu && (
          <button className="cv-icon-btn" title={t.downloadPhotos} onClick={() => { handleDownloadClick(); }}>
            <Download size={22} />
          </button>
        )}
        <button className="cv-icon-btn" title={t.createAccount} onClick={() => { if (customerUser) { alert(`Angemeldet als: ${customerUser.name} (${customerUser.email})`); } else { setShowLoginModal(true); } }}>
          <User size={22} />
        </button>
        <button className="cv-icon-btn" title={customerUser ? 'Abmelden' : t.accountLogin} onClick={() => {
          if (customerUser) {
            if (window.confirm('Möchten Sie sich abmelden?')) {
              setCustomerUser(null);
              setSelectionMode(false);
            }
          } else {
            setShowLoginModal(true);
          }
        }}>
          <LogIn size={22} />
        </button>
      </div>

      {/* Expandable Menu */}
      <button className="cv-menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X size={16} /> : <ChevronRight size={16} />}
      </button>

      {menuOpen && (
        <div className="cv-menu-panel">
          <button className="cv-menu-close-top" onClick={() => setMenuOpen(false)}><X size={16} /></button>
          <nav className="cv-menu-nav">
            <button className="cv-menu-item cv-menu-header" onClick={() => { setShowSelectionView(false); window.scrollTo({ top: 0, behavior: 'smooth' }); setMenuOpen(false); }}>
              <ChevronRight size={16} /><span>Galerie</span>
            </button>
            {albums.map((album, aIdx) => {
              if (albumToggles[aIdx]?.hidden) return null;
              const albumName = albumNames[aIdx] || (typeof album === 'string' ? album : album.name) || `Album ${aIdx + 1}`;
              return (
                <button
                  key={aIdx}
                  className="cv-menu-item cv-menu-sub"
                  onClick={() => {
                    setShowSelectionView(false);
                    setTimeout(() => {
                      const el = document.getElementById(`cv-album-${aIdx}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                    setMenuOpen(false);
                  }}
                >
                  <ImageIcon size={16} /><span>{albumName}</span>
                </button>
              );
            })}

            {/* Auswahlen */}
            {(() => {
              const userSel = customerUser ? selections.find(s => s.userEmail === customerUser.email) : null;
              const selCount = userSel?.photos?.length || 0;
              return (
                <>
                  <button className="cv-menu-item cv-menu-header" onClick={() => { setShowSelectionView(true); setMenuOpen(false); }}>
                    <ChevronDown size={16} /><span>Auswahlen</span>
                  </button>
                  {selCount > 0 && (
                    <button className="cv-menu-item cv-menu-sub" onClick={() => { setShowSelectionView(true); setMenuOpen(false); }}>
                      <ImageIcon size={16} /><span>Unbenannte Auswahl ({selCount})</span>
                    </button>
                  )}
                </>
              );
            })()}

            {/* Kontakt — always visible */}
            <button className="cv-menu-item" onClick={() => { setShowContact(true); setMenuOpen(false); }}>
              <Mail size={16} /><span>{t.contact}</span>
            </button>

            {/* Account */}
            <button className="cv-menu-item" onClick={() => { if (!customerUser) setShowLoginModal(true); else alert(`Angemeldet als: ${customerUser.name}`); setMenuOpen(false); }}>
              <User size={16} /><span>{t.createAccount}</span>
            </button>
            <button className="cv-menu-item" onClick={() => { if (!customerUser) setShowLoginModal(true); else alert(`Angemeldet als: ${customerUser.name}`); setMenuOpen(false); }}>
              <LogIn size={16} /><span>{t.accountLogin}</span>
            </button>
          </nav>
          <a className="cv-faq-link" href="#">{t.faq}</a>
        </div>
      )}

      {/* Contact Modal */}
      {showContact && (
        <div className="cv-modal-overlay" onMouseDown={() => setShowContact(false)}>
          <div className="cv-contact-modal" onMouseDown={(e) => e.stopPropagation()}>
            <button className="cv-modal-close" onClick={() => setShowContact(false)}>
              <X size={18} />
            </button>
            <div className="cv-contact-photo">
              {globalBrand.teamBild ? (
                <img src={globalBrand.teamBild} alt="Team" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              ) : (
                <div className="cv-contact-photo-placeholder">
                  <ImageIcon size={40} style={{ color: '#ccc' }} />
                </div>
              )}
            </div>
            <div className="cv-contact-logo">
              <div className="cv-logo-circle">
                {(globalBrand.logoLight || activeBrand.logo) ? (
                  <img src={globalBrand.logoLight || activeBrand.logo} alt={brandName} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{brandName.charAt(0)}</span>
                )}
              </div>
            </div>
            <div className="cv-contact-info">
              <h3>{globalBrand.firmenname || brandName}</h3>
              <p className="cv-contact-name">{globalBrand.firmenname || brandName}</p>
              <p className="cv-contact-detail">{globalBrand.telefon || '+41796662009'}</p>
              <p className="cv-contact-detail">{globalBrand.email || ''}</p>
              <div className="cv-contact-socials">
                {globalBrand.facebook && <a href={globalBrand.facebook} className="cv-social-icon" target="_blank" rel="noreferrer"><Facebook size={18} /></a>}
                {globalBrand.instagram && <a href={globalBrand.instagram} className="cv-social-icon" target="_blank" rel="noreferrer"><Instagram size={18} /></a>}
                {globalBrand.twitter && <a href={globalBrand.twitter} className="cv-social-icon" target="_blank" rel="noreferrer"><Twitter size={18} /></a>}
                {globalBrand.youtube && <a href={globalBrand.youtube} className="cv-social-icon" target="_blank" rel="noreferrer"><Youtube size={18} /></a>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download PIN Modal */}
      {showPinModal && (
        <div className="cv-modal-overlay" onMouseDown={() => setShowPinModal(false)}>
          <div className="cv-password-modal" onMouseDown={e => e.stopPropagation()} style={{ background: '#1a1a2e', borderRadius: '16px', padding: '2.5rem 2rem' }}>
            <div className="cv-password-icon"><Download size={32} /></div>
            <h2 className="cv-password-title" style={{ fontSize: '1.2rem' }}>{t.pinTitle}</h2>
            <form onSubmit={handlePinSubmit} className="cv-password-form" style={{ marginTop: '1.5rem' }}>
              <input
                type="text"
                className="cv-password-input"
                placeholder={t.pinPlaceholder}
                value={pinInput}
                onChange={e => { setPinInput(e.target.value.toUpperCase()); setPinError(false); }}
                maxLength={4}
                autoFocus
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem' }}
              />
              {pinError && <p className="cv-password-error">{t.pinError}</p>}
              <button type="submit" className="cv-password-btn">{t.pinButton}</button>
            </form>
          </div>
        </div>
      )}

      {/* Vertical Brand Name - inside hero, see below */}

      {/* Hero Section */}
      <section className="cv-hero" ref={heroRef}>
        {allPhotos.length > 0 ? (
          <>
            <div className="cv-hero-slides">
              {allPhotos.map((photo, idx) => (
                <div key={idx} className={`cv-hero-slide ${currentSlide === idx ? 'active' : ''}`}>
                  <div className="cv-hero-image" style={{ overflow: 'hidden' }}>
                    <img
                      src={photo.src}
                      alt={photo.name || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <h1 className="cv-hero-title">{displayTitle}</h1>
                  {settings.shootingdatum && (
                    <p className="cv-hero-date">
                      {new Date(settings.shootingdatum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                  <div className="cv-hero-line" />
                  <WatermarkOverlay className="cv-hero-watermark" variant="hero" />
                </div>
              ))}
            </div>

            {allPhotos.length > 1 && (
              <div className="cv-slider-dots">
                {allPhotos.length <= 20 && allPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    className={`cv-slider-dot ${currentSlide === idx ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="cv-hero-slide">
            <div className="cv-hero-image" style={{ background: '#1a1a2e' }}>
              <ImageIcon size={80} style={{ color: 'rgba(255,255,255,0.1)' }} />
            </div>
            <h1 className="cv-hero-title">{displayTitle}</h1>
            {settings.shootingdatum && (
              <p className="cv-hero-date">
                {new Date(settings.shootingdatum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            )}
            <div className="cv-hero-line" />
          </div>
        )}

        <div className="cv-scroll-down" onClick={() => {
          const firstSection = document.querySelector('.cv-album-section, .cv-video-section');
          if (firstSection) {
            firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
          }
        }}>
          <ChevronDown size={32} />
        </div>
        {/* Vertical Brand Name - sticks to slider image */}
        <div className="cv-branding">{brandName.toUpperCase()}</div>
      </section>

      {/* Albums Section — synced from BilderTab */}
      {!showSelectionView && albums.map((album, aIdx) => {
        if (albumToggles[aIdx]?.hidden) return null;

        const albumName = albumNames[aIdx] || (typeof album === 'string' ? album : album.name) || `Album ${aIdx + 1}`;
        const albumImages = uploadedImages[aIdx] || [];
        const albumVideos = uploadedVideos[aIdx] || [];

        return (
          <section key={aIdx} id={`cv-album-${aIdx}`} className="cv-album-section">
          <h2 className="cv-album-title">{albumName}</h2>

            {/* Embedded Videos */}
            {albumVideos.length > 0 && (
              <div className="cv-video-section">
                {albumVideos.map((video, vIdx) => {
                  const embedSrc = getEmbedSrc(video);
                  if (video.type === 'embed' && embedSrc) {
                    return (
                      <div key={`v-${vIdx}`} className="cv-video-embed">
                        <iframe
                          src={embedSrc}
                          title={video.name || 'Video'}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    );
                  } else if (video.type === 'local' && video.src) {
                    return (
                      <div key={`v-${vIdx}`} className="cv-video-embed">
                        <video src={video.src} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}

            {/* Photo Grid — Masonry-style */}
            {albumImages.length > 0 ? (
              <div className={`cv-photo-grid ${designDisplay === 'kacheln' ? 'cv-tiles' : 'cv-masonry'}`}>
                {albumImages.map((img, pIdx) => {
                  if (!img || !img.src) return null;
                  return (
                    <div key={pIdx} className={`cv-photo ${selectionMode && isPhotoSelected(img.src) ? 'cv-photo-selected' : ''}`} onClick={() => {
                      if (selectionMode) {
                        if (!customerUser) { setShowLoginModal(true); return; }
                        togglePhotoSelection(img.src, img.name, aIdx, pIdx);
                      } else {
                        openLightbox(aIdx, pIdx);
                      }
                    }} style={{ cursor: 'pointer' }}>
                      <img src={img.src} alt={img.name || ''} loading="lazy" />
                      {isPhotoSelected(img.src) && (
                        <span className="cv-photo-heart-badge">♥</span>
                      )}
                      {selectionMode && (
                        <div className={`cv-photo-select-overlay ${isPhotoSelected(img.src) ? 'selected' : ''}`}>
                          <Heart size={24} fill={isPhotoSelected(img.src) ? '#e74c3c' : 'none'} color={isPhotoSelected(img.src) ? '#e74c3c' : 'white'} />
                        </div>
                      )}
                      {toggles.dateienamen && (
                        <span className="cv-photo-filename">
                          {img.name || `IMG_${String(pIdx + 1).padStart(4, '0')}.jpg`}
                        </span>
                      )}
                      {(!!albumToggles[aIdx]?.watermark || toggles.wasserzeichen) && (
                        <WatermarkOverlay className="cv-photo-watermark" variant="photo" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="cv-album-empty">
                <ImageIcon size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <span>{t.noPhotos}</span>
              </div>
            )}
          </section>
        );
      })}

      {/* ====== SELECTION VIEW ====== */}
      {showSelectionView && (() => {
        const userSel = customerUser ? selections.find(s => s.userEmail === customerUser.email) : null;
        const selPhotos = userSel?.photos || [];
        return (
          <section className="cv-selection-view">
            <h2 className="cv-selection-view-title">Unbenannte Auswahl</h2>
            <p className="cv-selection-view-count">{selPhotos.length} Bilder</p>
            <button className="cv-selection-add-btn" onClick={() => { setShowSelectionView(false); setSelectionMode(true); }}>
              <ImageIcon size={16} /> Bilder hinzufügen
            </button>
            {selPhotos.length > 0 ? (
              <div className={`cv-photo-grid ${designDisplay === 'kacheln' ? 'cv-tiles' : 'cv-masonry'}`} style={{ padding: '1rem 60px' }}>
                {selPhotos.map((photo, pIdx) => (
                  <div key={pIdx} className="cv-photo">
                    <img src={photo.src} alt={photo.name || ''} loading="lazy" decoding="async" />
                    <span className="cv-photo-heart-badge">♥</span>
                    {toggles.wasserzeichen && (
                      <WatermarkOverlay className="cv-photo-watermark" variant="photo" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="cv-album-empty" style={{ margin: '2rem 60px' }}>
                <Heart size={32} style={{ color: 'rgba(255,255,255,0.15)' }} />
                <span>Noch keine Bilder ausgewählt</span>
              </div>
            )}
          </section>
        );
      })()}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="cv-modal-overlay" onMouseDown={() => setShowDownloadModal(false)}>
          <div className="cv-download-modal" onMouseDown={e => e.stopPropagation()}>
            <button className="cv-download-modal-close" onClick={() => setShowDownloadModal(false)}>
              <X size={20} />
            </button>
            <h3 className="cv-download-modal-title">BILDER HERUNTERLADEN</h3>
            <div className="cv-download-modal-body">
              <label className="cv-download-modal-label">Was m&ouml;chtest du herunterladen?</label>
              <select
                className="cv-download-modal-select"
                value={downloadChoice}
                onChange={e => { setDownloadChoice(e.target.value); setDownloadAlbumChecks({}); }}
              >
                <option value="">Bitte ausw&auml;hlen</option>
                <option value="gallery">Gesamte Galerie</option>
                <option value="albums">Bestimmte Alben</option>
                <option value="selection">Eine Auswahl</option>
                <option value="single">Ein bestimmtes Bild</option>
              </select>

              {/* Album checkboxes when 'albums' is selected */}
              {downloadChoice === 'albums' && (
                <div className="cv-download-album-list">
                  {albums.map((album, aIdx) => {
                    if (albumToggles[aIdx]?.hidden) return null;
                    const name = albumNames[aIdx] || (typeof album === 'string' ? album : album.name) || `Album ${aIdx + 1}`;
                    const count = (uploadedImages[aIdx] || []).filter(i => i && i.src).length;
                    return (
                      <label key={aIdx} className="cv-download-album-check">
                        <input
                          type="checkbox"
                          checked={!!downloadAlbumChecks[aIdx]}
                          onChange={e => setDownloadAlbumChecks(prev => ({ ...prev, [aIdx]: e.target.checked }))}
                        />
                        <span>{name} ({count} Bilder)</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {!zipReady ? (
                <button
                  className="cv-download-modal-btn"
                  onClick={handleDownloadSubmit}
                  disabled={!downloadChoice || (downloadChoice === 'albums' && !Object.values(downloadAlbumChecks).some(v => v))}
                >
                  <Download size={16} /> ZIP vorbereiten
                </button>
              ) : (
                <a
                  href={zipReady.url}
                  download={zipReady.filename}
                  className="cv-download-modal-btn"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                  onClick={() => { setTimeout(() => { setShowDownloadModal(false); setZipReady(null); }, 500); }}
                >
                  <Download size={16} /> {zipReady.filename} speichern
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Download Toast */}
      {downloadToast && (
        <div className="cv-download-toast">
          <Download size={16} />
          <span>{t.downloadStarted}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="cv-footer">
        <div className="cv-footer-main">
          <div className="cv-footer-logo">
            {(globalBrand.logoDark || activeBrand.logo) ? (
              <img src={globalBrand.logoDark || activeBrand.logo} alt={brandName} />
            ) : (
              <div className="cv-footer-logo-placeholder">
                <span>{brandName.charAt(0)}</span>
              </div>
            )}
          </div>
          <div className="cv-footer-contact">
            <h4>Kontakt</h4>
            <p><strong>{globalBrand.firmenname || brandName || 'Mein Studio'}</strong></p>
            <p>{globalBrand.telefon || ''}</p>
            {(globalBrand.email || brandName) && <p>{globalBrand.email || (brandName ? `info@${brandName.toLowerCase()}.ch` : '')}</p>}
            {(globalBrand.webseite || brandName) && <p>{globalBrand.webseite || (brandName ? `https://www.${brandName.toLowerCase()}.ch` : '')}</p>}
          </div>
          <div className="cv-footer-social">
            <h4>Social Media</h4>
            <div className="cv-footer-social-icons">
              {globalBrand.facebook && <a href={globalBrand.facebook} target="_blank" rel="noreferrer"><Facebook size={18} /></a>}
              {globalBrand.instagram && <a href={globalBrand.instagram} target="_blank" rel="noreferrer"><Instagram size={18} /></a>}
              {globalBrand.twitter && <a href={globalBrand.twitter} target="_blank" rel="noreferrer"><Twitter size={18} /></a>}
              {globalBrand.pinterest && (
                <a href={globalBrand.pinterest} target="_blank" rel="noreferrer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12c0 4.25 2.67 7.9 6.44 9.34-.09-.78-.17-2 .04-2.86.18-.78 1.2-5.08 1.2-5.08s-.3-.62-.3-1.52c0-1.43.83-2.5 1.86-2.5.88 0 1.3.66 1.3 1.45 0 .88-.56 2.2-.85 3.42-.24 1.02.51 1.86 1.52 1.86 1.82 0 3.22-1.92 3.22-4.7 0-2.46-1.77-4.18-4.29-4.18-2.92 0-4.64 2.19-4.64 4.46 0 .88.34 1.83.77 2.35.08.1.1.19.07.3-.08.32-.26 1.02-.29 1.16-.05.19-.15.23-.35.14-1.3-.6-2.11-2.51-2.11-4.04 0-3.29 2.39-6.31 6.89-6.31 3.62 0 6.43 2.58 6.43 6.02 0 3.59-2.27 6.49-5.42 6.49-1.06 0-2.05-.55-2.39-1.2l-.65 2.48c-.24.91-.88 2.05-1.31 2.75A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10z"/>
                  </svg>
                </a>
              )}
              {globalBrand.youtube && <a href={globalBrand.youtube} target="_blank" rel="noreferrer"><Youtube size={18} /></a>}
            </div>
          </div>
        </div>
        <div className="cv-footer-bottom">
          <a href={impressumUrl}>Impressum</a>
          <span>|</span>
          <a href={datenschutzUrl}>Datenschutz</a>
          <span>|</span>
          <a href="#">Reset</a>
        </div>
      </footer>

      {/* Lightbox */}
      {lightboxOpen && lightboxPhotos.length > 0 && (
        <div className="cv-lightbox-overlay" onClick={() => setLightboxOpen(false)}>
          <div className="cv-lightbox-counter">{lightboxIndex + 1}/{lightboxPhotos.length}</div>
          <button className="cv-lightbox-close" onClick={() => setLightboxOpen(false)}>
            <X size={28} />
          </button>
          {lightboxIndex > 0 && (
            <button className="cv-lightbox-arrow cv-lightbox-prev" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i - 1); }}>
              <ChevronLeft size={36} />
            </button>
          )}
          {lightboxIndex < lightboxPhotos.length - 1 && (
            <button className="cv-lightbox-arrow cv-lightbox-next" onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => i + 1); }}>
              <ChevronRight size={36} />
            </button>
          )}
          <div className="cv-lightbox-image" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxPhotos[lightboxIndex]?.src} alt={lightboxPhotos[lightboxIndex]?.name || ''} />
            {toggles.wasserzeichen && (
              <WatermarkOverlay className="cv-lightbox-watermark" variant="lightbox" />
            )}
          </div>
          <div className="cv-lightbox-actions" onClick={(e) => e.stopPropagation()}>
            <button className="cv-lightbox-btn">
              <EyeOff size={16} /> Ausblenden
            </button>
            <button
              className={`cv-lightbox-btn cv-lightbox-btn-select ${isPhotoSelected(lightboxPhotos[lightboxIndex]?.src) ? 'selected' : ''}`}
              onClick={() => {
                const photo = lightboxPhotos[lightboxIndex];
                if (!photo) return;
                if (!customerUser) {
                  pendingSelection.current = { src: photo.src, name: photo.name };
                  setShowLoginModal(true);
                  return;
                }
                togglePhotoSelection(photo.src, photo.name);
              }}
            >
              <Heart size={16} fill={isPhotoSelected(lightboxPhotos[lightboxIndex]?.src) ? 'currentColor' : 'none'} />
              {isPhotoSelected(lightboxPhotos[lightboxIndex]?.src) ? 'Ausgewählt' : 'Auswählen'}
            </button>
          </div>
        </div>
      )}

      {/* Customer Login Modal */}
      {showLoginModal && (
        <div className="cv-login-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="cv-login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cv-login-close" onClick={() => setShowLoginModal(false)}>
              <X size={20} />
            </button>
            <h3>Anmelden</h3>
            <p>Melden Sie sich an, um Ihre Bildauswahl zu speichern.</p>
            <form onSubmit={handleCustomerLogin}>
              <input
                type="text"
                placeholder="Name"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="E-Mail"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
              <button type="submit" className="cv-login-submit">Anmelden</button>
            </form>
          </div>
        </div>
      )}

      {/* ====== SELECTION BOTTOM BAR ====== */}
      {(() => {
        const userSel = customerUser ? selections.find(s => s.userEmail === customerUser.email) : null;
        const selCount = userSel?.photos?.length || 0;
        if (selCount === 0 || (!selectionMode && !showSelectionView)) return null;
        return (
          <div className="cv-selection-bar">
            <div className="cv-selection-bar-thumbs">
              {userSel.photos.slice(0, 4).map((p, i) => (
                <img key={i} src={p.src} alt="" className="cv-selection-bar-thumb" />
              ))}
            </div>
            <span className="cv-selection-bar-count">{selCount} Bilder ausgewählt</span>
            <button className="cv-selection-bar-next" onClick={() => setShowActionPopup(true)}>Nächster Schritt</button>
            <button className="cv-selection-bar-close" onClick={() => { setSelectionMode(false); setShowSelectionView(false); }}>
              <X size={18} />
            </button>
          </div>
        );
      })()}

      {/* ====== ACTION POPUP: Was möchtest du tun? ====== */}
      {showActionPopup && (
        <div className="cv-login-overlay" onClick={() => setShowActionPopup(false)}>
          <div className="cv-login-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="cv-login-close" onClick={() => setShowActionPopup(false)}><X size={20} /></button>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: 2, marginBottom: '0.3rem' }}>Was möchtest du tun?</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Ausgewählte Bilder...</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="cv-action-option" onClick={() => { setShowActionPopup(false); setShowSendForm(true); }}>
                <Send size={18} /> An Fotograf senden
              </button>
              <button className="cv-action-option" onClick={() => { setShowActionPopup(false); setShowSelectionView(true); }}>
                <Heart size={18} /> Anzeigen
              </button>
              <button className="cv-action-option" onClick={() => { setShowActionPopup(false); setShowSaveForm(true); }}>
                <Download size={18} /> Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SEND TO PHOTOGRAPHER FORM ====== */}
      {showSendForm && (
        <div className="cv-login-overlay" onClick={() => setShowSendForm(false)}>
          <div className="cv-login-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <button className="cv-login-close" onClick={() => setShowSendForm(false)}><X size={20} /></button>
            <h3>An Fotograf senden</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert('Auswahl wurde an den Fotografen gesendet!'); setShowSendForm(false); setSelectionMode(false); }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="cv-form-label">Vorname</label>
                  <input type="text" placeholder="Vorname" defaultValue={customerUser?.name?.split(' ')[0] || ''} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="cv-form-label">Nachname</label>
                  <input type="text" placeholder="Nachname" defaultValue={customerUser?.name?.split(' ').slice(1).join(' ') || ''} />
                </div>
              </div>
              <label className="cv-form-label">Deine E-Mail</label>
              <input type="email" placeholder="Deine E-Mail" defaultValue={customerUser?.email || ''} required />
              <label className="cv-form-label">Name der Auswahl</label>
              <input type="text" placeholder="Favoriten, Fotobuch..." value={selectionName} onChange={e => setSelectionName(e.target.value)} />
              <label className="cv-form-label">Nachricht an deinen Fotografen</label>
              <textarea placeholder="Schreibe deine Nachricht hier..." value={sendMessage} onChange={e => setSendMessage(e.target.value)} rows={4} style={{ resize: 'vertical' }} />
              <button type="submit" className="cv-login-submit" style={{ marginTop: '1rem' }}>Absenden</button>
            </form>
          </div>
        </div>
      )}

      {/* ====== SAVE FORM ====== */}
      {showSaveForm && (
        <div className="cv-login-overlay" onClick={() => setShowSaveForm(false)}>
          <div className="cv-login-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <button className="cv-login-close" onClick={() => setShowSaveForm(false)}><X size={20} /></button>
            <h3 style={{ textTransform: 'uppercase', letterSpacing: 2 }}>Speichern</h3>
            <form onSubmit={(e) => { e.preventDefault(); alert('Auswahl gespeichert!'); setShowSaveForm(false); setSelectionMode(false); }}>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="cv-form-label">Vorname</label>
                  <input type="text" placeholder="Vorname" defaultValue={customerUser?.name?.split(' ')[0] || ''} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="cv-form-label">Nachname</label>
                  <input type="text" placeholder="Nachname" defaultValue={customerUser?.name?.split(' ').slice(1).join(' ') || ''} />
                </div>
              </div>
              <label className="cv-form-label">E-Mail Adresse</label>
              <input type="email" placeholder="Deine E-Mail" defaultValue={customerUser?.email || ''} required />
              <label className="cv-form-label">Name der Auswahl</label>
              <input type="text" placeholder="Favoriten, Fotobuch..." value={selectionName} onChange={e => setSelectionName(e.target.value)} />
              <button type="submit" className="cv-login-submit" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Download size={16} /> Speichern
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerView;
