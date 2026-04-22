import React, { useState } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';

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
        <button className="btn-download-invoices">
          <Download size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
          Rechnungen herunterladen
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
                  <button className="download-btn" title="Details anzeigen"><Eye size={16} /></button>
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
    </div>
  );
};

export default Bestellungen;
