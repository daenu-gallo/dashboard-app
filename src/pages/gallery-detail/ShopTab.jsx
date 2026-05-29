import React, { useState, useEffect } from 'react';
import { Info, ExternalLink, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShop } from '../../contexts/ShopContext';

const ShopTab = ({ gallery, updateGallery }) => {
  const navigate = useNavigate();
  const { priceLists, fetchPriceLists } = useShop();

  // Gallery-level shop settings from toggles
  const toggles = gallery?.toggles || {};
  const shopActive = !!toggles.shop;
  const selectedPriceListId = gallery?.shop_price_list_id || '';
  const productPosition = gallery?.shop_product_position || 'after_last_album';

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleToggleShop = async () => {
    const newToggles = { ...toggles, shop: !shopActive };
    await updateGallery(gallery.id, { toggles: newToggles });
  };

  const handlePriceListChange = async (e) => {
    await updateGallery(gallery.id, { shop_price_list_id: e.target.value || null });
  };

  const handlePositionChange = async (e) => {
    await updateGallery(gallery.id, { shop_product_position: e.target.value });
  };

  return (
    <div className="shop-tab">
      {/* Left Column — Shop Settings */}
      <div className="shop-section">
        <h3>Shop</h3>

        <div className="shop-toggle-row" style={{ cursor: 'pointer' }} onClick={handleToggleShop}>
          <div className={`toggle-wrapper ${shopActive ? 'on' : ''}`} />
          <span>Shop aktiv</span>
        </div>

        {shopActive && (
          <>
            <div className="shop-form-group" style={{ marginTop: '1rem' }}>
              <label>Preisliste für diese Galerie</label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={selectedPriceListId}
                onChange={handlePriceListChange}
              >
                <option value="">Standard-Preisliste</option>
                {priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </div>

            <div className="shop-form-group" style={{ marginTop: '0.75rem' }}>
              <label>Produkte in Galerie</label>
              <select
                className="form-select"
                style={{ width: '100%' }}
                value={productPosition}
                onChange={handlePositionChange}
              >
                <option value="after_last_album">Nach dem letzten Album</option>
                <option value="after_4th_album">Nach dem vierten Album</option>
                <option value="before_footer">Vor dem Footer</option>
                <option value="hidden">Nur über Warenkorb erreichbar</option>
              </select>
            </div>
          </>
        )}

        <button
          className="shop-link"
          onClick={() => navigate('/shop?tab=preislisten')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            marginTop: '1rem', color: 'var(--color-primary)',
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '0.85rem', padding: 0,
          }}
        >
          <ExternalLink size={14} /> Shop Preislisten verwalten
        </button>
      </div>

      {/* Right Column — Info / Status */}
      <div className="automation-section">
        <h3>Shop-Status dieser Galerie</h3>

        {!shopActive ? (
          <div className="automation-warning">
            Der Shop ist für diese Galerie deaktiviert. Aktiviere den Shop links, um Fotoprodukte zu verkaufen.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: '#e8f5e9', border: '1px solid #c8e6c9',
              borderRadius: '8px', padding: '1rem',
              color: '#2e7d32', fontSize: '0.85rem',
            }}>
              <strong>✅ Shop ist aktiv</strong>
              <p style={{ margin: '0.5rem 0 0', opacity: 0.85 }}>
                Kunden können in dieser Galerie Fotoprodukte bestellen. Die Bestellungen erscheinen unter
                <strong> Shop → Bestellungen</strong>.
              </p>
            </div>

            <div style={{
              background: 'var(--bg-main)', border: '1px solid var(--border-color)',
              borderRadius: '8px', padding: '1rem', fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <ShoppingBag size={16} />
                <strong>Checkout-Flow</strong>
              </div>
              <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div>1. Kunde wählt Foto + Produkt</div>
                <div>2. Warenkorb → Checkout mit Adressdaten</div>
                <div>3. Zahlung via <strong>Stripe</strong></div>
                <div>4. Bestellung wird automatisch an <strong>Gelato</strong> weitergeleitet</div>
                <div>5. Bestätigungs-E-Mail an den Kunden</div>
              </div>
            </div>

            <button
              className="shop-link"
              onClick={() => navigate('/shop?tab=automatisierung')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                color: 'var(--color-primary)',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '0.85rem', padding: 0,
              }}
            >
              <ExternalLink size={14} /> Verkaufsautomatisierung verwalten
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopTab;
