const fs = require('fs');
let code = fs.readFileSync('src/pages/shop/Bestellungen.jsx', 'utf8');

// 1. Import X from lucide-react
code = code.replace('Download, Eye }', 'Download, Eye, X }');

// 2. Add state for selectedOrder
code = code.replace(
  'const [perPage, setPerPage] = useState(10);',
  'const [perPage, setPerPage] = useState(10);\n  const [selectedOrder, setSelectedOrder] = useState(null);'
);

// 3. Add onClick to Eye button
code = code.replace(
  '<button className="download-btn" title="Details anzeigen"><Eye size={16} /></button>',
  '<button className="download-btn" title="Details anzeigen" onClick={() => setSelectedOrder(order)}><Eye size={16} /></button>'
);

// 4. Add modal at the end before last closing div
const modalCode = `
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
                <span className={\`status-badge \${selectedOrder.status}\`}>
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
`;

code = code.replace(
  '    </div>\n  );\n};\n\nexport default Bestellungen;',
  modalCode + '    </div>\n  );\n};\n\nexport default Bestellungen;'
);

fs.writeFileSync('src/pages/shop/Bestellungen.jsx', code);
console.log('Fixed Bestellungen.jsx');
