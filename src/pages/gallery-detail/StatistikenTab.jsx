import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RotateCcw, Eye, Users, Clock, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const StatistikenTab = ({ galleryId }) => {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  const loadViews = async () => {
    if (!galleryId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gallery_views')
        .select('*')
        .eq('gallery_id', galleryId)
        .order('viewed_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setViews(data || []);

      // Build chart data: views per day (last 14 days)
      const days = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
        days[key] = 0;
      }
      (data || []).forEach(v => {
        const d = new Date(v.viewed_at);
        const key = d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' });
        if (key in days) days[key]++;
      });
      setChartData(Object.entries(days).map(([name, aufrufe]) => ({ name, aufrufe })));
    } catch (err) {
      console.error('[StatistikenTab] Load error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { loadViews(); }, [galleryId]);

  // Compute stats
  const totalViews = views.length;
  const uniqueVisitors = new Set(views.map(v => v.visitor_id).filter(Boolean)).size;
  const todayViews = views.filter(v => {
    const d = new Date(v.viewed_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const weekViews = views.filter(v => {
    const d = new Date(v.viewed_at);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;

  // Top referrers
  const referrerCounts = {};
  views.forEach(v => {
    if (v.referrer) {
      try {
        const host = new URL(v.referrer).hostname || v.referrer;
        referrerCounts[host] = (referrerCounts[host] || 0) + 1;
      } catch {
        referrerCounts[v.referrer] = (referrerCounts[v.referrer] || 0) + 1;
      }
    }
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `vor ${hours} Std.`;
    const days = Math.floor(hours / 24);
    return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
  };

  if (loading) {
    return (
      <div className="statistiken-tab" style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
        Statistiken werden geladen...
      </div>
    );
  }

  return (
    <div className="statistiken-tab">
      {/* Top Summary Cards */}
      <div className="stats-top-cards">
        <div className="stats-top-card">
          <span className="stats-top-value">{totalViews} Seitenaufrufe</span>
          <div className="stats-top-bar blue" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{uniqueVisitors} Unique Besucher</span>
          <div className="stats-top-bar green" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{todayViews} Heute</span>
          <div className="stats-top-bar red" />
        </div>
        <div className="stats-top-card">
          <span className="stats-top-value">{weekViews} Letzte 7 Tage</span>
          <div className="stats-top-bar yellow" />
        </div>
      </div>

      {/* Activity Log */}
      <div>
        <div className="activity-log-header">
          <h3>Letzte Besucher</h3>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <RotateCcw size={16} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={loadViews} title="Aktualisieren" />
          </div>
        </div>
        <div className="activity-log">
          {views.length === 0 ? (
            <div style={{ padding: '2rem', color: '#999', fontSize: '0.85rem', textAlign: 'center' }}>
              Noch keine Aufrufe. Teile den Galerie-Link mit deinen Kunden!
            </div>
          ) : (
            views.slice(0, 15).map((v, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-dot view" />
                <div className="activity-text">
                  <div className="activity-title">
                    <Eye size={13} style={{ marginRight: 4, verticalAlign: -2, opacity: 0.6 }} />
                    Besucher {v.visitor_id?.slice(0, 6) || '?'}
                  </div>
                  <div className="activity-desc">
                    {v.referrer ? `via ${(() => { try { return new URL(v.referrer).hostname; } catch { return 'direkt'; } })()}` : 'Direkter Aufruf'}
                  </div>
                </div>
                <span className="activity-time">{formatTimeAgo(v.viewed_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right - Charts & Summary */}
      <div className="stats-right">
        <div className="stats-chart-section">
          <h3>Aufrufe (14 Tage)</h3>
          {chartData.every(d => d.aufrufe === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#999', fontSize: '0.85rem' }}>
              Noch keine Daten in den letzten 14 Tagen
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} />
                <YAxis tick={{ fontSize: 9, fill: '#888' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{
                  background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }} />
                <Line type="monotone" dataKey="aufrufe" stroke="#528c68" strokeWidth={2}
                  dot={{ r: 3, fill: '#528c68', stroke: '#1e1e2e', strokeWidth: 2 }}
                  activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="stats-summary">
          <h3>Zusammenfassung</h3>
          <div className="stats-summary-grid">
            <span className="stat-line"><strong>{totalViews}</strong> Galerie Aufrufe</span>
            <span className="stat-line"><strong>{uniqueVisitors}</strong> Unique Besucher</span>
            <span className="stat-line"><strong>{todayViews}</strong> Aufrufe heute</span>
            <span className="stat-line"><strong>{weekViews}</strong> Aufrufe letzte 7 Tage</span>
          </div>
        </div>

        {topReferrers.length > 0 && (
          <div className="stats-summary" style={{ marginTop: '1rem' }}>
            <h3><Globe size={14} style={{ marginRight: 4, verticalAlign: -2 }} /> Top Quellen</h3>
            <div className="stats-summary-grid">
              {topReferrers.map(([host, count], i) => (
                <span key={i} className="stat-line"><strong>{count}</strong> {host}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatistikenTab;
