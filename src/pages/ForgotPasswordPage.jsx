import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePersistedState } from '../hooks/usePersistedState';
import loginBg from '../assets/login-bg.png';
import './Login.css';

const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Ein Fehler ist aufgetreten.');
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
          <h1 className="login-brand">{globalBrand.webseite ? globalBrand.webseite.replace(/^https?:\/\//, '').replace(/^www\./, '') : 'fotohahn.ch'}</h1>
        </div>

        <h2 className="login-title">Passwort zurücksetzen</h2>

        {success ? (
          <div className="login-success">
            <p>📧 E-Mail gesendet!</p>
            <p>Falls ein Account mit <strong>{email}</strong> existiert, erhältst du eine E-Mail mit einem Link zum Zurücksetzen deines Passworts.</p>
            <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}>
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <>
            <p className="login-subtitle">
              Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen deines Passworts.
            </p>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleReset}>
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

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Wird gesendet...' : 'Link senden'}
              </button>
            </form>

            <div className="login-links">
              <Link to="/login" className="login-link">Zurück zum Login</Link>
            </div>
          </>
        )}

        <div className="login-footer">
          <a href="https://fotohahn.ch/impressum" target="_blank" rel="noopener noreferrer">Impressum</a>
          <span>·</span>
          <a href="https://fotohahn.ch/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutz</a>
          <span>·</span>
          <a href="https://fotohahn.ch/kontakt" target="_blank" rel="noopener noreferrer">Kontakt</a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
