import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AnnouncementBanner from './AnnouncementBanner';
import { useVersionCheck } from '../../hooks/useVersionCheck';
import './MainLayout.css';

const MainLayout = ({ children }) => {
  const { announcement, dismissAnnouncement } = useVersionCheck();

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <Topbar />
        <AnnouncementBanner announcement={announcement} onDismiss={dismissAnnouncement} />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
