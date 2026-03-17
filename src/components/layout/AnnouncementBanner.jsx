import React from 'react';
import { X, Megaphone, AlertTriangle, Info } from 'lucide-react';

const typeStyles = {
  info: {
    bg: 'linear-gradient(135deg, #528c68 0%, #3d7a52 100%)',
    icon: Info,
  },
  warning: {
    bg: 'linear-gradient(135deg, #e6a817 0%, #d09b15 100%)',
    icon: AlertTriangle,
  },
  update: {
    bg: 'linear-gradient(135deg, #4a7c9b 0%, #3a6a87 100%)',
    icon: Megaphone,
  },
};

const AnnouncementBanner = ({ announcement, onDismiss }) => {
  if (!announcement?.message) return null;

  const style = typeStyles[announcement.type] || typeStyles.info;
  const Icon = style.icon;

  return (
    <div style={{
      background: style.bg,
      color: '#fff',
      padding: '0.6rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      fontSize: '0.85rem',
      fontWeight: 500,
      position: 'relative',
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{announcement.message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: 4,
          padding: '2px 6px',
          cursor: 'pointer',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
        }}
        title="Schliessen"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default AnnouncementBanner;
