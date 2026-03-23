import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import LazyImage from '../components/LazyImage';
import './GalleryHome.css';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

/**
 * GalleryHomePage — shown when a custom/subdomain is visited without a slug.
 * Lists all public galleries of the domain owner.
 * If only 1 gallery exists, redirects directly to it.
 */
const GalleryHomePage = ({ domainMode }) => {
  const navigate = useNavigate();
  const [galleries, setGalleries] = useState([]);
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!domainMode) return;
    (async () => {
      try {
        let userId = null;

        if (domainMode.type === 'subdomain') {
          // subdomain: e.g. "kunde.galerie.fotohahn.ch" → slug = "kunde"
          // Load gallery directly by slug
          navigate(`/${domainMode.slug}`, { replace: true });
          return;
        }

        if (domainMode.type === 'custom') {
          // Custom domain: strip "galerie." prefix to find brand website
          const brandDomain = domainMode.domain.replace(/^galerie\./, '').replace(/^app\./, '');
          const { data: brandData } = await supabase
            .from('brands')
            .select('*')
            .eq('website', brandDomain)
            .eq('active', true)
            .maybeSingle();

          if (brandData) {
            userId = brandData.user_id;
            setBrand(brandData);
          }
        }

        if (!userId) {
          setLoading(false);
          return;
        }

        // Load all galleries for this user
        const { data: galleriesData } = await supabase
          .from('galleries')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (galleriesData) {
          // If only one gallery, redirect directly
          if (galleriesData.length === 1) {
            navigate(`/${galleriesData[0].slug}`, { replace: true });
            return;
          }
          setGalleries(galleriesData);
        }

        // Load brand settings for styling
        const { data: settingsRow } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', userId)
          .eq('key', 'global_brand_settings')
          .maybeSingle();

        if (settingsRow?.value) {
          setBrand(prev => ({ ...prev, ...settingsRow.value }));
        }
      } catch (err) {
        console.error('[GalleryHomePage] Error:', err);
      }
      setLoading(false);
    })();
  }, [domainMode, navigate]);

  // Load first image for each gallery (cover image)
  const [coverImages, setCoverImages] = useState({});
  useEffect(() => {
    if (galleries.length === 0) return;
    (async () => {
      const covers = {};
      for (const g of galleries) {
        const { data } = await supabase
          .from('images')
          .select('thumb_url')
          .eq('gallery_id', g.id)
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data?.thumb_url) {
          covers[g.id] = UPLOAD_API + data.thumb_url;
        }
      }
      setCoverImages(covers);
    })();
  }, [galleries]);

  if (loading) {
    return (
      <div className="gallery-home-loading">
        <div className="gallery-home-spinner" />
        <p>Laden...</p>
      </div>
    );
  }

  if (galleries.length === 0) {
    return (
      <div className="gallery-home-empty">
        <h2>Keine Galerien verfügbar</h2>
        <p>Aktuell sind keine öffentlichen Galerien vorhanden.</p>
      </div>
    );
  }

  const brandName = brand?.firmenname || brand?.name || '';

  return (
    <div className="gallery-home" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="gallery-home-header">
        {brand?.logoDark && (
          <img src={brand.logoDark} alt={brandName} className="gallery-home-logo" />
        )}
        <h1>{brandName ? `Galerien von ${brandName}` : 'Fotogalerien'}</h1>
      </header>

      {/* Gallery Grid */}
      <div className="gallery-home-grid">
        {galleries.map(g => (
          <div
            key={g.id}
            className="gallery-home-card"
            onClick={() => navigate(`/${g.slug}`)}
          >
            <div className="gallery-home-card-image">
              {coverImages[g.id] ? (
                <LazyImage src={coverImages[g.id]} alt={g.title} />
              ) : (
                <div className="gallery-home-card-placeholder">📷</div>
              )}
            </div>
            <div className="gallery-home-card-info">
              <h3>{g.title}</h3>
              {g.shooting_date && (
                <span className="gallery-home-card-date">
                  {new Date(g.shooting_date).toLocaleDateString('de-CH')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="gallery-home-footer">
        <p>
          {brandName && <span>{brandName} · </span>}
          Powered by <a href="https://fotohahn.ch" target="_blank" rel="noopener noreferrer">Fotohahn</a>
        </p>
      </footer>
    </div>
  );
};

export default GalleryHomePage;
