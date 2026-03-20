import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const CustomerView = ({ domainMode = null }) => {
  const { slug } = useParams();
  const [gallery, setGallery] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('galleries').select('*').eq('slug', slug).maybeSingle();
      setGallery(data);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}>Lade...</div>;
  if (!gallery) return <div style={{ padding: '3rem', textAlign: 'center' }}>Galerie nicht gefunden (Slug: {slug})</div>;

  return (
    <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
      <h1>{gallery.title}</h1>
      <p>Gallery ID: {gallery.id}</p>
      <p>Slug: {gallery.slug}</p>
      <p>Passwort: {gallery.password ? 'geschützt' : 'offen'}</p>
      <p style={{ color: 'green', fontSize: '1.2em', marginTop: '2rem' }}>
        ✅ CustomerView lädt korrekt! Kein Error #300.
      </p>
    </div>
  );
};

export default CustomerView;
