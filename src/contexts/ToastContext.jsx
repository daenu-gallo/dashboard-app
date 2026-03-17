import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = useCallback({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
  }, [addToast]);

  // Fix: make toast an object with methods
  const toastObj = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error', 5000),
    info: (msg) => addToast(msg, 'info'),
  };

  return (
    <ToastContext.Provider value={toastObj}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '0.7rem 1.2rem',
            borderRadius: 10,
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            animation: 'toastIn 0.3s ease',
            pointerEvents: 'auto',
            background: t.type === 'error' ? '#ef4444'
              : t.type === 'info' ? '#3b82f6'
              : '#528c68',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            {t.type === 'success' && '✓'}
            {t.type === 'error' && '✕'}
            {t.type === 'info' && 'ℹ'}
            {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
