import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Home, 
  LayoutGrid, 
  FolderOpen, 
  Settings, 
  ShoppingCart,
  LogOut
} from 'lucide-react';
import { usePersistedState } from '../../hooks/usePersistedState';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const [globalBrand] = usePersistedState('global_brand_settings', {});

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Logo Area */}
        <div className="sidebar-logo">
          <img src={globalBrand.logoDark || '/fotohahn-logo.png'} alt={globalBrand.firmenname || 'Logo'} className="logo-icon" style={{ width: 44, height: 44, objectFit: 'contain' }} />
        </div>
        
        {/* Icons/Links */}
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Dashboard">
            <Home size={20} />
          </NavLink>
          
          <NavLink to="/galleries" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Galerien">
            <LayoutGrid size={20} />
          </NavLink>
          
          <NavLink to="/portfolios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Portfolios">
            <FolderOpen size={20} />
          </NavLink>
          
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Einstellungen">
            <Settings size={20} />
          </NavLink>
          
          <NavLink to="/shop" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Shop">
             <ShoppingCart size={20} />
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom">
         <div className="nav-item" onClick={() => navigate('/login')} title="Logout" style={{ cursor: 'pointer' }}>
            <LogOut size={20} />
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
