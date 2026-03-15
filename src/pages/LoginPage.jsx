import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Facebook } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import loginBg from '../assets/login-bg.png';
import './Login.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate login
    navigate('/');
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
              />
            </div>
          </div>

          <button type="submit" className="login-btn">Login</button>
        </form>

        <div className="login-links">
          <a href="#" className="login-link">Passwort vergessen?</a>
          <a href="#" className="login-link">Noch keinen Account?</a>
        </div>

        <div className="login-footer">
          <a href="#">Impressum</a>
          <span>·</span>
          <a href="#">Datenschutz</a>
          <span>·</span>
          <a href="#">Kontakt</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
