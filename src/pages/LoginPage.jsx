import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePersistedState } from '../hooks/usePersistedState';
import loginBg from '../assets/login-bg.png';
import './Login.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Ungültige E-Mail oder Passwort.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('Bitte bestätige zuerst deine E-Mail-Adresse.');
      } else {
        setError(err.message || 'Ein Fehler ist aufgetreten.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          {globalBrand.logoDark ? (
            <img src={globalBrand.logoDark} alt={globalBrand.firmenname || 'Logo'} style={{ width: 42, height: 42, objectFit: 'contain' }} />
          ) : (
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h6v6H4z" />
              <path d="M14 4h6v6h-6z" />
              <path d="M4 14h6v6H4z" />
              <path d="M17 17m-3 0a3 3 0 1 0 6 0 3 3 0 1 0 -6 0" />
            </svg>
          )}
          <h1 className="login-brand">{globalBrand.webseite ? globalBrand.webseite.replace(/^https?:\/\//, '').replace(/^www\./, '') : ''}</h1>
        </div>

        {error && (
          <div className="login-error">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="login-field">
            <label>E-Mail</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">✉</span>
              <input
                type="email"
                placeholder="name@domain.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="login-field">
            <label>Passwort</label>
            <div className="login-input-wrapper">
              <span className="login-input-icon">🔒</span>
              <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Anmeldung...' : 'Login'}
          </button>
        </form>

        <div className="login-links">
          <Link to="/forgot-password" className="login-link">Passwort vergessen?</Link>
          <Link to="/register" className="login-link">Noch keinen Account?</Link>
        </div>

        <div className="login-footer">
          <a href="https://fotohahn.ch/impressum" target="_blank" rel="noopener noreferrer">Impressum</a>
          <span className="login-footer-sep">|</span>
          <a href="https://fotohahn.ch/datenschutzerklaerung-von-fotohahn-ch/" target="_blank" rel="noopener noreferrer">Datenschutz</a>
          <span className="login-footer-sep">|</span>
          <a href="https://fotohahn.ch/kontaktaufnahme-hochzeitsfotograf-thun-bern/" target="_blank" rel="noopener noreferrer">Kontakt</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
