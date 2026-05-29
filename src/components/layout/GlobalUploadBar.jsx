import React, { useState } from 'react';
import { useUpload } from '../../contexts/UploadContext';
import { CheckCircle, Loader, X } from 'lucide-react';

/**
 * Global upload progress bar — visible on every page during active uploads.
 */
const GlobalUploadBar = () => {
  const { uploadQueue, uploadProgress, isUploading, cancelUpload } = useUpload();
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isUploading && !uploadQueue.some(q => q.status === 'done')) return null;

  const activeItem = uploadQueue.find(q => q.status === 'uploading');
  const doneItems = uploadQueue.filter(q => q.status === 'done');
  const queuedItems = uploadQueue.filter(q => q.status === 'queued');

  const percent = uploadProgress
    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
    : 0;

  const wasCancelled = doneItems.some(d => d.wasCancelled);

  const handleCancel = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    cancelUpload();
    setShowConfirm(false);
  };

  return (
    <div style={{
      background: wasCancelled
        ? 'linear-gradient(135deg, #3a2020, #4a2828)'
        : 'linear-gradient(135deg, #1a2f23, #2a4a35)',
      borderBottom: `1px solid ${wasCancelled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(82, 140, 104, 0.3)'}`,
      padding: '0.6rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      fontSize: '0.8rem',
      color: wasCancelled ? '#fca5a5' : '#c8e6c9',
      zIndex: 100,
    }}>
      {/* Icon */}
      {activeItem ? (
        <Loader size={16} className="spin" style={{ color: '#81c784', flexShrink: 0 }} />
      ) : (
        <CheckCircle size={16} style={{ color: wasCancelled ? '#ef4444' : '#66bb6a', flexShrink: 0 }} />
      )}

      {/* Status text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {activeItem ? (
          <span>
            <strong>Upload läuft:</strong> {uploadProgress?.albumName || 'Album'} —{' '}
            {uploadProgress?.completed || 0} / {uploadProgress?.total || 0} Fotos
            {queuedItems.length > 0 && ` (+ ${queuedItems.length} Album${queuedItems.length > 1 ? 's' : ''} in Warteschlange)`}
          </span>
        ) : doneItems.length > 0 ? (
          <span>
            {wasCancelled ? (
              <><strong>Upload abgebrochen</strong> — {doneItems.reduce((sum, d) => sum + (d.newUploads || 0), 0)} Fotos wurden bereits hochgeladen</>
            ) : (
              <><strong>Upload abgeschlossen</strong> — {doneItems.reduce((sum, d) => sum + (d.newUploads || 0), 0)} Fotos hochgeladen
              {doneItems.reduce((sum, d) => sum + (d.skippedDuplicates || 0), 0) > 0 &&
                `, ${doneItems.reduce((sum, d) => sum + (d.skippedDuplicates || 0), 0)} Duplikate übersprungen`}</>
            )}
          </span>
        ) : null}
      </div>

      {/* Progress bar */}
      {activeItem && (
        <div style={{
          width: 140, height: 6, borderRadius: 3,
          background: 'rgba(255,255,255,0.15)',
          flexShrink: 0, overflow: 'hidden',
        }}>
          <div style={{
            width: `${percent}%`, height: '100%', borderRadius: 3,
            background: 'linear-gradient(90deg, #66bb6a, #81c784)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      {/* Percentage */}
      {activeItem && (
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#a5d6a7', minWidth: 36, textAlign: 'right' }}>
          {percent}%
        </span>
      )}

      {/* Cancel button */}
      {activeItem && (
        <button
          onClick={handleCancel}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            padding: showConfirm ? '0.3rem 0.7rem' : '0.3rem',
            borderRadius: 6,
            border: showConfirm ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
            background: showConfirm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.08)',
            color: showConfirm ? '#fca5a5' : '#aaa',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: showConfirm ? 600 : 400,
            transition: 'all 0.2s',
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
          onMouseLeave={() => setShowConfirm(false)}
          title="Upload abbrechen"
        >
          <X size={14} />
          {showConfirm && 'Wirklich abbrechen?'}
        </button>
      )}
    </div>
  );
};

export default GlobalUploadBar;
