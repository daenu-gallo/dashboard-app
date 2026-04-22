import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, ListOrdered, Tag, ShoppingBag, Zap } from 'lucide-react';
import ShopAbrechnung from './ShopAbrechnung';
import Preislisten from './Preislisten';
import Gutscheine from './Gutscheine';
import Bestellungen from './Bestellungen';
import Verkaufsautomatisierung from './Verkaufsautomatisierung';
import './Shop.css';

const shopTabs = [
  { id: 'abrechnung', label: 'Shop-Abrechnung', icon: Receipt },
  { id: 'preislisten', label: 'Preislisten', icon: ListOrdered },
  { id: 'gutscheine', label: 'Gutscheine', icon: Tag },
  { id: 'bestellungen', label: 'Bestellungen', icon: ShoppingBag },
  { id: 'automatisierung', label: 'Verkaufsautomatisierung', icon: Zap },
];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'abrechnung');

  // Sync tab from URL params
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'abrechnung': return <ShopAbrechnung />;
      case 'preislisten': return <Preislisten />;
      case 'gutscheine': return <Gutscheine />;
      case 'bestellungen': return <Bestellungen />;
      case 'automatisierung': return <Verkaufsautomatisierung />;
      default: return <ShopAbrechnung />;
    }
  };

  return (
    <div className="shop-page">
      <h1 className="text-h1">Shop</h1>

      {/* Main Tab Navigation */}
      <nav className="shop-tabs">
        {shopTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`shop-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Tab Content */}
      {renderTab()}
    </div>
  );
};

export default ShopPage;
