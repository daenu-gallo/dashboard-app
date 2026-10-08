import React, { useState } from 'react';
import { Search, Download, Eye, X } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';
import { supabase } from '../../lib/supabaseClient';

const Bestellungen = () => {
  const { orders, fetchOrders } = useShop();
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const [dateFrom, setDateFrom] = useState(fmt(thirtyDaysAgo));
  const [dateTo, setDateTo] = useState(fmt(today));
  const [searchQuery, setSearchQuery] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleShowPeriod = () => {
    fetchOrders(dateFrom, dateTo);
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    return o.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const statusLabels = {
    pending: 'Ausstehend',
    processing: 'In Bearbeitung',
    shipped: 'Versendet',
    delivered: 'Zugestellt',
    cancelled: 'Storniert',
  };

  return (
    <div className="shop-content">
      <h2 className="shop-section-title">Bestellungen</h2>

      {/* Date Filters */}
      <div className="orders-filters">
        <div>
          <label>Zeitraum vom</label>
          <input type="date" className="date-input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label>bis</label>
          <input type="date" className="date-input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <button className="btn-show-period" onClick={handleShowPeriod}>Zeitraum anzeigen</button>
        <button className="btn-download-invoices" onClick={async () => {
          const uApi = import.meta.env.VITE_UPLOAD_API_URL || 'http://localhost:3001';
          const url = new URL(`${uApi}/api/generate-accounting-pdf`);
          if (dateFrom) url.searchParams.append('from', dateFrom);
          if (dateTo) url.searchParams.append('to', dateTo);
          url.searchParams.append('userId', (await supabase.auth.getSession()).data.session.user.id);
          window.open(url.toString(), '_blank');
        }}>
          <Download size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Abrechnung (PDF)
        </button>
      </div>

      {/* Search */}
      <div className="orders-search">
        <Search size={14} style={{ color: '#999' }} />
        <input type="text" placeholder="nach Bestellnummer suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      {/* Table */}
      <table className="orders-table">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Galerie</th>
            <th>Bestellnummer</th>
            <th>Rechnungsnummer(n)</th>
            <th>Kunde</th>
            <th>Bruttoumsatz</th>
            <th>Bruttogewinn</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.length === 0 ? (
            <tr><td colSpan={9} className="orders-empty">Keine Bestellungen</td></tr>
          ) : (
            filteredOrders.slice(0, perPage).map((order) => (
              <tr key={order.id}>
                <td>{new Date(order.created_at).toLocaleDateString('de-CH')}</td>
                <td>{order.gallery_id || '–'}</td>
                <td style={{ fontWeight: 500 }}>{order.order_number}</td>
                <td>{order.invoice_numbers || '–'}</td>
                <td>{order.customer_name || '–'}</td>
                <td>{Number(order.total_gross).toFixed(2)} CHF</td>
                <td style={{ color: Number(order.total_profit) >= 0 ? 'var(--color-primary)' : '#dc2626' }}>
                  {Number(order.total_profit).toFixed(2)} CHF
                </td>
                <td>
                  <span className={`status-badge ${order.status}`}>
                    {statusLabels[order.status] || order.status}
                  </span>
                </td>
                <td>
                  <button className="download-btn" title="Details anzeigen" onClick={() => setSelectedOrder(order)}><Eye size={16} /></button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="shop-pagination">
        <span>Ergebnisse pro Seite</span>
        <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <button className="modal-close" onClick={() => setSelectedOrder(null)}><X size={20} /></button>
            <h2 style={{ marginBottom: '1rem' }}>Bestellung {selectedOrder.order_number}</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Kunde</strong><br/>
                {selectedOrder.customer_name}<br/>
                {selectedOrder.customer_email}<br/>
                {selectedOrder.customer_phone}
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Versandadresse</strong><br/>
                {selectedOrder.shipping_address?.strasse}<br/>
                {selectedOrder.shipping_address?.plz} {selectedOrder.shipping_address?.ort}<br/>
                {selectedOrder.shipping_address?.land}
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Datum</strong><br/>
                {new Date(selectedOrder.created_at).toLocaleString('de-CH')}
              </div>
              <div>
                <strong style={{ color: 'var(--text-secondary)' }}>Status</strong><br/>
                <span className={`status-badge ${selectedOrder.status}`}>
                  {statusLabels[selectedOrder.status] || selectedOrder.status}
                </span>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Artikel</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem 0' }}>Bild</th>
                  <th style={{ padding: '0.5rem 0' }}>Produkt</th>
                  <th style={{ padding: '0.5rem 0' }}>Menge</th>
                  <th style={{ padding: '0.5rem 0', textAlign: 'right' }}>Preis</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.order_items || []).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem 0' }}>
                      <img src={item.photo_url || item.photo_src} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                    </td>
                    <td style={{ padding: '0.5rem 0' }}>
                      {item.product_name}<br/>
                      <small style={{ color: '#888' }}>{item.photo_name}</small>
                    </td>
                    <td style={{ padding: '0.5rem 0' }}>{item.quantity}x</td>
                    <td style={{ padding: '0.5rem 0', textAlign: 'right' }}>{Number(item.price * item.quantity).toFixed(2)} CHF</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: '1rem', textAlign: 'right', fontSize: '0.95rem' }}>
              <div>Versandkosten: {Number(selectedOrder.shipping_cost || 0).toFixed(2)} CHF</div>
              {selectedOrder.discount_value > 0 && (
                <div style={{ color: '#10b981' }}>Rabatt: -{Number(selectedOrder.discount_value).toFixed(2)} CHF</div>
              )}
              <div style={{ fontWeight: 'bold', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                Total: {Number(selectedOrder.total_gross || selectedOrder.total_amount).toFixed(2)} CHF
              </div>
            </div>
            
            {selectedOrder.gelato_order_id && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: '0.85rem', color: '#999' }}>
                Gelato Order ID: {selectedOrder.gelato_order_id}<br/>
                {selectedOrder.invoice_numbers && <>Rechnung: {selectedOrder.invoice_numbers}</>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Bestellungen;
