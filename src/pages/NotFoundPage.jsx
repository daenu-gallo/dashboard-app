import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Camera } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
      color: '#fff',
      fontFamily: "'Inter', sans-serif",
      padding: '2rem',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: 480,
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(82, 140, 104, 0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
        }}>
          <Camera size={36} style={{ color: '#528c68' }} />
        </div>

        {/* 404 */}
        <h1 style={{
          fontSize: '5rem', fontWeight: 800, letterSpacing: '-2px',
          margin: '0 0 0.5rem',
          background: 'linear-gradient(135deg, #528c68, #7ab88e)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          404
        </h1>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 0.75rem', color: '#e0e0e0' }}>
          Seite nicht gefunden
        </h2>

        <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
          Die angeforderte Seite existiert leider nicht oder wurde verschoben. 
          Bitte überprüfe die URL oder kehre zur Startseite zurück.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.5rem', borderRadius: 8,
            background: '#528c68', color: '#fff',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem',
            transition: 'background 0.2s',
          }}>
            <Home size={16} /> Zur Startseite
          </Link>

          <button onClick={() => window.history.back()} style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.7rem 1.5rem', borderRadius: 8,
            background: 'rgba(255,255,255,0.08)', color: '#ccc',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
            transition: 'background 0.2s',
          }}>
            <ArrowLeft size={16} /> Zurück
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
