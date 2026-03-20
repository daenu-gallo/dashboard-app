import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Camera, FolderOpen, Eye, CalendarDays, ExternalLink, TrendingUp, Clock, RotateCcw, Send, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useBrand } from '../contexts/BrandContext';
import './Dashboard.css';

const UPLOAD_API = import.meta.env.VITE_UPLOAD_API_URL || '';

const DashboardPage = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ galleries: 0, albums: 0, views: 0, presets: 0 });
  const [recentGalleries, setRecentGalleries] = useState([]);
  const [recentViews, setRecentViews] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [announcementType, setAnnouncementType] = useState('info');
  const [announcementSaved, setAnnouncementSaved] = useState(false);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [deployStatus, setDeployStatus] = useState({});

  // Check if user is admin
  useEffect(() => {
    if (!session?.access_token || !UPLOAD_API) return;
    fetch(`${UPLOAD_API}/api/admin/check`, {
      headers: { 'Authorization': `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setIsAdmin(d.isAdmin))
      .catch(() => setIsAdmin(false));
  }, [session]);

  // Load announcement from app_config
  useEffect(() => {
    if (!isAdmin) return;
    const loadAnnouncement = async () => {
      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'app_settings')
        .maybeSingle();
      if (data?.value) {
        let config = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setAnnouncement(config?.announcement || '');
        setAnnouncementType(config?.announcement_type || 'info');
      }
    };
    loadAnnouncement();
  }, [isAdmin]);

  // Save announcement
  const handleSaveAnnouncement = async () => {
    setAnnouncementLoading(true);
    try {
      const { data: existing } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'app_settings')
        .maybeSingle();

      let config = {};
      if (existing?.value) {
        config = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value;
      }
      config.announcement = announcement;
      config.announcement_type = announcementType;
      config.announcement_at = new Date().toISOString();

      await supabase
        .from('app_config')
        .upsert({ key: 'app_settings', value: config }, { onConflict: 'key' });

      setAnnouncementSaved(true);
      setTimeout(() => setAnnouncementSaved(false), 3000);
    } catch (err) {
      console.error('Announcement save error:', err);
    }
    setAnnouncementLoading(false);
  };

  // Trigger deploy
  const handleDeploy = async (service) => {
    if (!session?.access_token) return;
    setDeployStatus(prev => ({ ...prev, [service]: 'loading' }));
    try {
      const res = await fetch(`${UPLOAD_API}/api/admin/deploy/${service}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setDeployStatus(prev => ({ ...prev, [service]: 'success' }));
      } else {
        setDeployStatus(prev => ({ ...prev, [service]: 'error' }));
        console.error(`Deploy ${service} failed:`, data);
      }
    } catch (err) {
      setDeployStatus(prev => ({ ...prev, [service]: 'error' }));
      console.error(`Deploy ${service} error:`, err);
    }
    setTimeout(() => setDeployStatus(prev => ({ ...prev, [service]: null })), 5000);
  };

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Gute Nacht';
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };

  useEffect(() => {
    if (!user) return;
    const loadStats = async () => {
      try {
        // Gallery count
        const { count: galleryCount } = await supabase
          .from('galleries').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Album count
        const { count: albumCount } = await supabase
          .from('albums').select('*', { count: 'exact', head: true });

        // Gallery views count (graceful fallback if table doesn't exist)
        let viewCount = 0;
        try {
          const { count } = await supabase
            .from('gallery_views').select('*', { count: 'exact', head: true });
          viewCount = count || 0;
        } catch { /* table might not exist yet */ }

        // Preset count
        const { count: presetCount } = await supabase
          .from('presets').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        setStats({
          galleries: galleryCount || 0,
          albums: albumCount || 0,
          views: viewCount,
          presets: presetCount || 0,
        });

        // Recent galleries (last 5)
        const { data: recent } = await supabase
          .from('galleries').select('title, slug, created_at, shooting_date')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRecentGalleries(recent || []);

        // Recent views (last 10) – join with galleries for title
        try {
          const { data: views } = await supabase
            .from('gallery_views')
            .select('viewed_at, gallery_id, galleries(title, slug)')
            .order('viewed_at', { ascending: false })
            .limit(10);
          setRecentViews(views || []);
        } catch { /* table might not exist */ }

        // Chart: Galleries created per month (last 6 months)
        const { data: allGalleries } = await supabase
          .from('galleries').select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (allGalleries && allGalleries.length > 0) {
          const months = {};
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' });
            months[key] = 0;
          }
          allGalleries.forEach(g => {
            const d = new Date(g.created_at);
            const key = d.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' });
            if (key in months) months[key]++;
          });
          setChartData(Object.entries(months).map(([name, count]) => ({ name, galerien: count })));
        }
      } catch (err) {
        console.error('[Dashboard] Stats load error:', err);
      }
      setLoading(false);
    };
    loadStats();
  }, [user]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

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

  // Deploy button helper
  const DeployButton = ({ service, label }) => {
    const status = deployStatus[service];
    return (
      <button
        onClick={() => handleDeploy(service)}
        disabled={status === 'loading'}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1.2rem', borderRadius: 8, border: 'none',
          background: status === 'success' ? '#22c55e' : status === 'error' ? '#ef4444' : '#528c68',
          color: '#fff', fontWeight: 600, cursor: status === 'loading' ? 'wait' : 'pointer',
          fontSize: '0.85rem', transition: 'all 0.3s', opacity: status === 'loading' ? 0.7 : 1,
          width: '100%', justifyContent: 'center',
        }}
        title={`${label} neu deployen`}
      >
        {status === 'loading' ? <Loader size={16} className="spin" /> :
         status === 'success' ? <CheckCircle size={16} /> :
         status === 'error' ? <AlertCircle size={16} /> :
         <RotateCcw size={16} />}
        {status === 'loading' ? 'Deploying...' :
         status === 'success' ? 'Gestartet ✓' :
         status === 'error' ? 'Fehler ✗' :
         label}
      </button>
    );
  };

  // Brand name for greeting (hook must be before conditional returns)
  const { brands } = useBrand();

  if (loading) {
    return (
      <div className="dashboard-page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#999' }}>
          Lade Dashboard...
        </div>
      </div>
    );
  }

  const displayName = brands?.[0]?.name || user?.email?.split('@')[0] || 'Fotograf';

  return (
    <div className="dashboard-page">
      {/* Greeting */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          {getGreeting()}, {displayName} 👋
        </h1>
        <p style={{ color: '#888', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
          Hier ist dein Überblick für heute.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="stats-header card">
        <div className="stat-item active">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Camera size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.galleries} Galerien</div>
            <div className="stat-label">Erstellt</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <FolderOpen size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.albums} Alben</div>
            <div className="stat-label">Gesamt</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <Eye size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.views} Aufrufe</div>
            <div className="stat-label">Gesamt</div>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.presets} Presets</div>
            <div className="stat-label">Vorlagen</div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Chart */}
        <div className="chart-container card">
          <h3 className="chart-title">Galerien pro Monat</h3>
          <div className="chart-wrapper">
            {chartData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250, color: '#999', fontSize: '0.9rem' }}>
                Noch keine Daten vorhanden
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#888' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#888' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#1e1e2e',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="galerien"
                    stroke="#528c68"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#528c68', stroke: '#1e1e2e', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Views */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
            <Eye size={16} style={{ marginRight: 6, verticalAlign: -2 }} />
            Letzte Aufrufe
          </h3>
          {recentViews.length === 0 ? (
            <div style={{ color: '#999', fontSize: '0.9rem', padding: '1rem 0' }}>
              Noch keine Aufrufe. Teile einen Galerie-Link mit deinen Kunden!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentViews.map((v, i) => (
                <div
                  key={i}
                  onClick={() => v.galleries?.slug && navigate(`/galleries/${v.galleries.slug}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.6rem 0.8rem', background: 'rgba(255,255,255,0.03)',
                    borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Eye size={14} style={{ color: '#ef4444', opacity: 0.7 }} />
                    <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>
                      {v.galleries?.title || 'Unbekannte Galerie'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap' }}>
                    <Clock size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
                    {formatTimeAgo(v.viewed_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Galleries */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>Letzte Galerien</h3>
        {recentGalleries.length === 0 ? (
          <div style={{ color: '#999', fontSize: '0.9rem', padding: '1rem 0' }}>
            Noch keine Galerien erstellt. Erstelle deine erste Galerie über das + in der Topbar!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentGalleries.map((g, i) => (
              <div
                key={i}
                onClick={() => navigate(`/galleries/${g.slug}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Camera size={16} style={{ color: '#528c68' }} />
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{g.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>
                    <CalendarDays size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                    {formatDate(g.created_at)}
                  </span>
                  <ExternalLink size={14} style={{ color: '#666' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Admin Section (nur für Admin sichtbar) ── */}
      {isAdmin && (
        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem', borderLeft: '3px solid #528c68' }}>
          <h3 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} style={{ color: '#528c68' }} />
            Admin-Bereich
          </h3>

          {/* Revisionsmeldung */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block', color: '#ccc' }}>
              Revisionsmeldung (Banner-Text)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select
                value={announcementType}
                onChange={e => setAnnouncementType(e.target.value)}
                style={{
                  padding: '0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                  background: '#1e1e2e', color: '#fff', fontSize: '0.8rem', minWidth: 100,
                }}
              >
                <option value="info">ℹ️ Info</option>
                <option value="warning">⚠️ Warnung</option>
                <option value="success">✅ Erfolg</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <textarea
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                placeholder="z.B. Neue Funktion: Bilder können jetzt als ZIP heruntergeladen werden!"
                rows={2}
                style={{
                  flex: 1, padding: '0.6rem 0.8rem', borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)', background: '#1e1e2e',
                  color: '#fff', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSaveAnnouncement}
                disabled={announcementLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.6rem 1rem', borderRadius: 8, border: 'none',
                  background: announcementSaved ? '#22c55e' : '#528c68',
                  color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
                  transition: 'all 0.3s', whiteSpace: 'nowrap',
                }}
                title="Revisionsmeldung speichern und an alle Benutzer senden"
              >
                {announcementSaved ? <CheckCircle size={14} /> : <Send size={14} />}
                {announcementSaved ? 'Gespeichert ✓' : 'Senden'}
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.3rem' }}>
              Wird als Banner oben auf jeder Seite angezeigt. Leer lassen = kein Banner.
            </p>
          </div>

          {/* Deploy Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <DeployButton service="dashboard-app" label="Redeploy Dashboard-App" />
            <DeployButton service="upload-api" label="Redeploy Upload-API" />
          </div>
          <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem' }}>
            Löst einen Coolify-Rebuild aus. Neuester Code wird von GitHub gezogen und neu gebaut.
          </p>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
