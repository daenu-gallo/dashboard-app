import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageCircle, Trash2 } from 'lucide-react';

const KommentareTab = ({ galleryId }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComments();
  }, [galleryId]);

  async function loadComments() {
    if (!galleryId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('gallery_comments')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_at', { ascending: false });
    
    if (error) console.error(error);
    else setComments(data || []);
    setLoading(false);
  }

  async function deleteComment(id) {
    if (!window.confirm('Kommentar wirklich löschen?')) return;
    await supabase.from('gallery_comments').delete().eq('id', id);
    loadComments();
  }

  if (loading) return <div style={{ padding: '2rem' }}>Lade Kommentare...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={24} color="#5a8a5c" /> Kommentare ({comments.length})
        </h3>
        <button onClick={loadComments} style={{ padding: '0.5rem 1rem', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }}>
          Aktualisieren
        </button>
      </div>

      {comments.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#888', background: '#f8f9fa', borderRadius: 8 }}>
          <MessageCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
          <p>Noch keine Kommentare für diese Galerie vorhanden.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: 8, border: '1px solid #eee' }}>
              <img src={c.photo_src} alt={c.photo_name} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{c.customer_name} ({c.customer_email})</strong>
                  <span style={{ fontSize: '0.8rem', color: '#999' }}>{new Date(c.created_at).toLocaleString('de-CH')}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Zu Bild: {c.photo_name}</div>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>{c.comment}</p>
              </div>
              <button onClick={() => deleteComment(c.id)} style={{ background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', alignSelf: 'flex-start' }}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default KommentareTab;
