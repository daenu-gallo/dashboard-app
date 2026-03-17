import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #0f1419 100%)',
          color: '#fff', fontFamily: "'Inter', sans-serif", padding: '2rem',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 480 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.5rem',
            }}>
              <Camera size={36} style={{ color: '#ef4444' }} />
            </div>

            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
              Etwas ist schiefgelaufen
            </h1>
            <p style={{ color: '#888', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 2rem' }}>
              Ein unerwarteter Fehler ist aufgetreten. Bitte lade die Seite neu oder kehre zur Startseite zurück.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={this.handleReload} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.7rem 1.5rem', borderRadius: 8,
                background: '#528c68', color: '#fff', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              }}>
                <RefreshCw size={16} /> Seite neu laden
              </button>
              <button onClick={this.handleGoHome} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.7rem 1.5rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.08)', color: '#ccc',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem',
              }}>
                Zur Startseite
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '2rem', textAlign: 'left', color: '#666', fontSize: '0.8rem' }}>
                <summary style={{ cursor: 'pointer', color: '#888' }}>Fehlerdetails</summary>
                <pre style={{
                  marginTop: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8, overflow: 'auto', maxHeight: 200,
                }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
