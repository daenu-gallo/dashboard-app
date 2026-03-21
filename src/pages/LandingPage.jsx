import React from 'react';
import { Camera, Shield, Zap, Globe, Star, Users, Image as ImageIcon, ArrowRight, Mail, Check, ChevronRight, Heart, Download, Lock } from 'lucide-react';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="lp">
      {/* ── Navigation ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <a href="/" className="lp-logo">
            <Camera size={26} strokeWidth={1.8} />
            <span>Fotohahn</span>
          </a>
          <div className="lp-nav-links">
            <a href="#features">Features</a>
            <a href="#how">So geht's</a>
            <a href="#compare">Vergleich</a>
            <a href="/register" className="lp-btn-nav">7 Tage gratis testen</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="lp-hero">
        <div className="lp-hero-glow" />
        <div className="lp-container">
          <div className="lp-hero-content">
            <div className="lp-pill">🇨🇭 Gehostet in der Schweiz</div>
            <h1>Die Alternative für<br /><span className="lp-gradient-text">Fotografen-Galerien</span></h1>
            <p className="lp-hero-sub">
              Präsentiere deine Arbeit in eleganten Online-Galerien — mit eigenem Branding, 
              Passwortschutz und Wasserzeichen. Keine US-Cloud, sondern sicher gehostet 
              in der Schweiz.
            </p>
            <div className="lp-hero-actions">
              <a href="/register" className="lp-btn-primary lp-btn-lg">
                Kostenlos testen <ArrowRight size={20} />
              </a>
              <span className="lp-hero-note">7 Tage gratis · Keine Kreditkarte nötig</span>
            </div>
          </div>
          <div className="lp-hero-visual">
            <div className="lp-mockup">
              <div className="lp-mockup-bar">
                <span className="lp-dot" /><span className="lp-dot" /><span className="lp-dot" />
                <span className="lp-url">galerie.fotohahn.ch/dein-shooting</span>
              </div>
              <div className="lp-mockup-screen">
                <div className="lp-mock-hero-img" />
                <div className="lp-mock-grid">
                  <div className="lp-mock-thumb" /><div className="lp-mock-thumb" />
                  <div className="lp-mock-thumb" /><div className="lp-mock-thumb" />
                  <div className="lp-mock-thumb" /><div className="lp-mock-thumb" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Trusted By ── */}
      <section className="lp-trust">
        <div className="lp-container">
          <p>Entwickelt von Fotografen, für Fotografen</p>
          <div className="lp-trust-items">
            <span><Lock size={16} /> SSL verschlüsselt</span>
            <span><Shield size={16} /> DSGVO-konform</span>
            <span><Globe size={16} /> Eigene Domain möglich</span>
            <span><Download size={16} /> Unbegrenzte Downloads</span>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-pill-sm">Features</span>
            <h2>Alles was du als Fotograf brauchst</h2>
            <p>Von Galerie-Erstellung bis Kundenfreigabe — in einer einzigen Plattform.</p>
          </div>
          <div className="lp-features">
            <div className="lp-feat">
              <div className="lp-feat-icon"><ImageIcon size={22} /></div>
              <h3>Professionelle Galerien</h3>
              <p>Hero-Bilder, Alben, Lightbox und responsive Design. Deine Fotos im besten Licht.</p>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><Lock size={22} /></div>
              <h3>Passwort & PIN</h3>
              <p>Schütze Galerien mit Passwort. Downloads optional mit separatem PIN-Code absichern.</p>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><Zap size={22} /></div>
              <h3>Drag & Drop Upload</h3>
              <p>Hunderte Bilder per Drag & Drop hochladen. Automatische Thumbnails inklusive.</p>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><Globe size={22} /></div>
              <h3>Eigene Domain</h3>
              <p>galerie.deinfirma.ch — Kundenansicht unter deiner eigenen Domain. Vollständiges White-Label.</p>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><Star size={22} /></div>
              <h3>Wasserzeichen</h3>
              <p>Bild-, Text- oder Kachelmuster-Wasserzeichen. Individuell pro Galerie konfigurierbar.</p>
            </div>
            <div className="lp-feat">
              <div className="lp-feat-icon"><Heart size={22} /></div>
              <h3>Kundenauswahl</h3>
              <p>Deine Kunden markieren Favoriten und stellen ihre Auswahl direkt in der Galerie zusammen.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="lp-section lp-section-dark">
        <div className="lp-container">
          <div className="lp-section-head lp-head-light">
            <span className="lp-pill-sm">So einfach geht's</span>
            <h2>In 3 Schritten zur Galerie</h2>
          </div>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <h3>Konto erstellen</h3>
              <p>Registriere dich kostenlos und richte dein Branding ein — Logo, Farben, Domain.</p>
            </div>
            <div className="lp-step-connector" />
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <h3>Galerie erstellen</h3>
              <p>Erstelle eine Galerie, lade die Bilder hoch und konfiguriere Passwort & Wasserzeichen.</p>
            </div>
            <div className="lp-step-connector" />
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <h3>Link verschicken</h3>
              <p>Teile den personalisierten Link mit deinem Kunden — fertig! Der Rest läuft automatisch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="compare" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-head">
            <span className="lp-pill-sm">Vergleich</span>
            <h2>Warum Fotohahn?</h2>
            <p>Die bessere Wahl für Schweizer Fotografen.</p>
          </div>
          <div className="lp-compare-table">
            <div className="lp-compare-header">
              <div className="lp-compare-feature" />
              <div className="lp-compare-col lp-compare-highlight">Fotohahn</div>
              <div className="lp-compare-col">Scrappbook*</div>
              <div className="lp-compare-col">Pixieset</div>
            </div>
            {[
              ['Hosting in der Schweiz', true, true, false],
              ['Eigene Domain', true, true, true],
              ['Passwortschutz', true, true, true],
              ['Wasserzeichen', true, false, true],
              ['Kundenauswahl', true, true, true],
              ['DSGVO-konform', true, '?', false],
              ['Keine US-Cloud', true, true, false],
              ['Unbegrenzte Galerien', true, false, false],
              ['7 Tage gratis testen', true, false, true],
            ].map(([feat, fh, sb, px], i) => (
              <div key={i} className="lp-compare-row">
                <div className="lp-compare-feature">{feat}</div>
                <div className="lp-compare-col lp-compare-highlight">{fh === true ? <Check size={18} className="lp-check" /> : fh === false ? '—' : fh}</div>
                <div className="lp-compare-col">{sb === true ? <Check size={18} className="lp-check-muted" /> : sb === false ? '—' : sb}</div>
                <div className="lp-compare-col">{px === true ? <Check size={18} className="lp-check-muted" /> : px === false ? '—' : px}</div>
              </div>
            ))}
            <p className="lp-compare-note">* Scrappbook hat den Betrieb eingestellt</p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="lp-cta">
        <div className="lp-container">
          <div className="lp-cta-card">
            <h2>Bereit für professionelle Galerien?</h2>
            <p>Starte jetzt deine 7-tägige Testphase — kostenlos und ohne Kreditkarte.</p>
            <div className="lp-cta-actions">
              <a href="/register" className="lp-btn-primary lp-btn-lg">
                Jetzt kostenlos starten <ArrowRight size={20} />
              </a>
              <a href="mailto:info@fotohahn.ch" className="lp-btn-ghost">
                <Mail size={18} /> Fragen? Schreib uns
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container">
          <div className="lp-footer-inner">
            <div className="lp-footer-brand">
              <Camera size={20} strokeWidth={1.8} />
              <span>Fotohahn</span>
            </div>
            <div className="lp-footer-links">
              <a href="/legal/impressum">Impressum</a>
              <a href="/legal/datenschutz">Datenschutz</a>
              <a href="mailto:info@fotohahn.ch">Kontakt</a>
            </div>
            <p>© {new Date().getFullYear()} Fotohahn · Bern, Schweiz</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
