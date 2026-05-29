import React from 'react';
import { useUpload } from '../../contexts/UploadContext';
import { Upload, CheckCircle, Loader } from 'lucide-react';

/**
 * Global upload progress bar — visible on every page during active uploads.
 * This ensures the user always sees that uploads are running, even after navigating away.
 */
const GlobalUploadBar = () => {
  const { uploadQueue, uploadProgress, isUploading } = useUpload();

  if (!isUploading && !uploadQueue.some(q => q.status === 'done')) return null;

  const activeItem = uploadQueue.find(q => q.status === 'uploading');
  const doneItems = uploadQueue.filter(q => q.status === 'done');
  const queuedItems = uploadQueue.filter(q => q.status === 'queued');

  const percent = uploadProgress
    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
    : 0;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1a2f23, #2a4a35)',
      borderBottom: '1px solid rgba(82, 140, 104, 0.3)',
      padding: '0.6rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      fontSize: '0.8rem',
      color: '#c8e6c9',
      zIndex: 100,
    }}>
      {/* Icon */}
      {activeItem ? (
        <Loader size={16} className="spin" style={{ color: '#81c784', flexShrink: 0 }} />
      ) : (
        <CheckCircle size={16} style={{ color: '#66bb6a', flexShrink: 0 }} />
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
            <strong>Upload abgeschlossen</strong> — {doneItems.reduce((sum, d) => sum + (d.newUploads || 0), 0)} Fotos hochgeladen
            {doneItems.reduce((sum, d) => sum + (d.skippedDuplicates || 0), 0) > 0 &&
              `, ${doneItems.reduce((sum, d) => sum + (d.skippedDuplicates || 0), 0)} Duplikate übersprungen`}
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
    </div>
  );
};

export default GlobalUploadBar;
