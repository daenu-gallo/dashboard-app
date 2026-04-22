import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  LayoutGrid, 
  FolderOpen, 
  Settings, 
  ShoppingCart,
  LogOut,
  Receipt,
  ListOrdered,
  Tag,
  ShoppingBag,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useBrand } from '../../contexts/BrandContext';
import './Sidebar.css';

const shopSubItems = [
  { path: '/shop', label: 'Shop-Abrechnung', icon: Receipt, tab: 'abrechnung' },
  { path: '/shop', label: 'Preislisten', icon: ListOrdered, tab: 'preislisten' },
  { path: '/shop', label: 'Gutscheine', icon: Tag, tab: 'gutscheine' },
  { path: '/shop', label: 'Bestellungen', icon: ShoppingBag, tab: 'bestellungen' },
  { path: '/shop', label: 'Verkaufsautomatisierung', icon: Zap, tab: 'automatisierung' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { globalBrand } = useBrand();
  const [shopExpanded, setShopExpanded] = useState(location.pathname.startsWith('/shop'));

  const isShopActive = location.pathname.startsWith('/shop');

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        {/* Logo Area */}
        <div className="sidebar-logo">
          {globalBrand.logoDark ? (
            <img src={globalBrand.logoDark} alt={globalBrand.firmenname || 'Logo'} className="logo-icon" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          ) : (
            <div className="logo-icon" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: '50%', fontSize: '0.6rem', color: '#999' }}>Logo</div>
          )}
        </div>
        
        {/* Icons/Links */}
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title="Dashboard" end>
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
          
          {/* Shop with expandable sub-menu */}
          <div
            className={`nav-item ${isShopActive ? 'active' : ''}`}
            onClick={() => {
              setShopExpanded(!shopExpanded);
              if (!isShopActive) navigate('/shop');
            }}
            title="Shop"
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <ShoppingCart size={20} />
          </div>

          {/* Shop Sub-Items (shown when expanded or active) */}
          {(shopExpanded || isShopActive) && (
            <div className="sidebar-sub-items">
              {shopSubItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.tab}
                    className="nav-sub-item"
                    onClick={() => navigate(`/shop?tab=${item.tab}`)}
                    title={item.label}
                  >
                    <Icon size={14} />
                  </div>
                );
              })}
            </div>
          )}
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
