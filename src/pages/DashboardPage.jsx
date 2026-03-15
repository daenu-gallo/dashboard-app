import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

// Fresh website - no data yet
const data = [];

const DashboardPage = () => {
  return (
    <div className="dashboard-page">
      <div className="stats-header card">
        <div className="stat-item active">
          <div className="stat-value">0 Seitenaufrufe</div>
          <div className="stat-indicator blue"></div>
        </div>
        <div className="stat-item">
          <div className="stat-value">0 Geteilt</div>
          <div className="stat-indicator green"></div>
        </div>
        <div className="stat-item">
          <div className="stat-value">0 Apps Installiert</div>
          <div className="stat-indicator red"></div>
        </div>
        <div className="stat-item">
          <div className="stat-value">0 Downloads</div>
          <div className="stat-indicator yellow"></div>
        </div>
      </div>

      <div className="chart-container card">
        <h3 className="chart-title">Statistiken</h3>
        <div className="chart-wrapper">
          {data.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, color: '#999', fontSize: '0.9rem' }}>
              Noch keine Daten vorhanden
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart
                data={data}
                margin={{ top: 20, right: 30, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#6B7280' }} 
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6B7280' }} 
                  axisLine={false}
                  tickLine={false}
                  tickCount={6}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="linear" dataKey="views" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="linear" dataKey="shared" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                <Line type="linear" dataKey="apps" stroke="#ef4444" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
