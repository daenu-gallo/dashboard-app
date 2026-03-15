import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RotateCcw, Filter } from 'lucide-react';

// Fresh website - no chart data yet
const chartData = [];

// No activities yet
const activities = [];

const StatistikenTab = () => {
  // All totals are 0 for a fresh website
  const totals = { views: 0, shared: 0, apps: 0, downloads: 0 };

  return (
    <div className="statistiken-tab">
      {/* Top Summary Cards */}
      <div className="stats-top-cards">
        <div className="stats-top-card">
          <span className="stats-top-value">{totals.views} Seitenaufrufe</span>
          <div className="stats-top-bar blue" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{totals.shared} Geteilt</span>
          <div className="stats-top-bar green" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{totals.apps} Apps Installiert</span>
          <div className="stats-top-bar red" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{totals.downloads} Downloads</span>
          <div className="stats-top-bar yellow" />
        </div>
      </div>

      {/* Left - Activity Log */}
      <div>
        <div className="activity-log-header">
          <h3>Aktivitäten</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <RotateCcw size={16} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
            <Filter size={16} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />
          </div>
        </div>
        <div className="activity-log">
          {activities.length === 0 ? (
            <div style={{ padding: '2rem', color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
              Noch keine Aktivitäten vorhanden
            </div>
          ) : (
            activities.map((a, idx) => (
              <div key={idx} className="activity-item">
                <div className={`activity-dot ${a.type}`} />
                <div className="activity-text">
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-desc">{a.desc}</div>
                </div>
                <span className="activity-time">{a.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right - Charts & Summary */}
      <div className="stats-right">
        <div className="stats-chart-section">
          <h3>Statistiken</h3>
          {chartData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#999', fontSize: '0.85rem' }}>
              Noch keine Daten vorhanden
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6B7280' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                <YAxis tick={{ fontSize: 9, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '0.75rem' }} />
                <Line type="linear" dataKey="views" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Aufrufe" />
                <Line type="linear" dataKey="shared" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Geteilt" />
                <Line type="linear" dataKey="apps" stroke="#ef4444" strokeWidth={1.5} dot={false} name="Apps" />
                <Line type="linear" dataKey="downloads" stroke="#eab308" strokeWidth={1.5} dot={false} name="Downloads" />
              </LineChart>
            </ResponsiveContainer>
          )}
          <div className="stats-legend">
            <span className="legend-item active">Aufrufe</span>
            <span className="legend-item active" style={{ background: '#22c55e' }}>Geteilt</span>
            <span className="legend-item" style={{ background: '#ef4444' }}>App Installationen</span>
            <span className="legend-item" style={{ background: '#eab308' }}>Downloads</span>
          </div>
        </div>

        <div className="stats-summary">
          <h3>Statistiken gesamter Zeitraum</h3>
          <div className="stats-summary-grid">
            <span className="stat-line"><strong>0</strong> Galerie Aufrufe</span>
            <span className="stat-line"><strong>0</strong> Geteilt Inhalte</span>
            <span className="stat-line"><strong>0</strong> App Installationen</span>
            <span className="stat-line"><strong>0</strong> Downloads</span>
            <span className="stat-line"><strong>0</strong> Klicks auf deine E-Mail Adresse</span>
            <span className="stat-line"><strong>0</strong> ZIP Downloads</span>
            <span className="stat-line"><strong>0</strong> Klicks auf deine Webseite</span>
            <span className="stat-line"><strong>0</strong> Aufrufe deiner Kontaktdaten</span>
            <span className="stat-line"><strong>0</strong> Klicks auf deine Telefonnummer</span>
            <span className="stat-line"><strong>0</strong> Aufrufe geteilter Inhalte</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikenTab;
