import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePersistedState } from '../hooks/usePersistedState';
import loginBg from '../assets/login-bg.png';
import './Login.css';

const RegisterPage = () => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setLoading(true);

    try {
      await register(email, password);
      setSuccess(true);
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Diese E-Mail ist bereits registriert.');
      } else {
        setError(err.message || 'Registrierung fehlgeschlagen.');
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
          <h1 className="login-brand">{globalBrand.webseite ? globalBrand.webseite.replace(/^https?:\/\//, '').replace(/^www\./, '') : 'fotohahn.ch'}</h1>
        </div>

        <h2 className="login-title">Account erstellen</h2>

        {success ? (
          <div className="login-success">
            <p>✅ Registrierung erfolgreich!</p>
            <p>Bitte prüfe dein E-Mail-Postfach und bestätige deine E-Mail-Adresse.</p>
            <Link to="/login" className="login-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: '1rem' }}>
              Zurück zum Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <form className="login-form" onSubmit={handleRegister}>
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
                    placeholder="Mindestens 6 Zeichen"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Passwort bestätigen</label>
                <div className="login-input-wrapper">
                  <span className="login-input-icon">🔒</span>
                  <input
                    type="password"
                    placeholder="Passwort wiederholen"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'Wird erstellt...' : 'Account erstellen'}
              </button>
            </form>

            <div className="login-links">
              <Link to="/login" className="login-link">Bereits einen Account? Zum Login</Link>
            </div>
          </>
        )}

        <div className="login-footer">
          <a href="https://fotohahn.ch/impressum" target="_blank" rel="noopener noreferrer">Impressum</a>
          <span>·</span>
          <a href="https://fotohahn.ch/datenschutzerklaerung-von-fotohahn-ch/" target="_blank" rel="noopener noreferrer">Datenschutz</a>
          <span>·</span>
          <a href="https://fotohahn.ch/kontaktaufnahme-hochzeitsfotograf-thun-bern/" target="_blank" rel="noopener noreferrer">Kontakt</a>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
