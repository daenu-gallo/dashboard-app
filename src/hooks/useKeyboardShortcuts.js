import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts for power users.
 * 
 * Ctrl/Cmd + K  → Focus search (if visible)
 * Ctrl/Cmd + 1  → Dashboard
 * Ctrl/Cmd + 2  → Galerien
 * Ctrl/Cmd + 3  → Portfolios
 * Ctrl/Cmd + 4  → Einstellungen
 */
export const useKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Don't intercept when typing in inputs
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case '1':
          e.preventDefault();
          navigate('/');
          break;
        case '2':
          e.preventDefault();
          navigate('/galleries');
          break;
        case '3':
          e.preventDefault();
          navigate('/portfolios');
          break;
        case '4':
          e.preventDefault();
          navigate('/settings');
          break;
        case 'k':
          e.preventDefault();
          // Focus the first search input on the page
          const searchInput = document.querySelector('.search-input, input[type="search"]');
          if (searchInput) searchInput.focus();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
};
