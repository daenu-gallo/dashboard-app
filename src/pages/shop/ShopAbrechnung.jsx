import React, { useState, useEffect } from 'react';
import { Pencil, CreditCard, Building2, Download, HelpCircle } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';

const ShopAbrechnung = () => {
  const { shopSettings, saveShopSettings, documents, fetchDocuments } = useShop();
  const [innerTab, setInnerTab] = useState('rechnungsadresse');
  const [editingAddress, setEditingAddress] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local state for forms
  const [address, setAddress] = useState({
    name: '', email: '', firma: '', strasse: '', plz: '', ort: '', land: 'Schweiz',
  });
  const [settlementCard, setSettlementCard] = useState({
    type: 'MASTERCARD', number: '**** **** **** 0000',
  });
  const [customerPayment, setCustomerPayment] = useState({
    paypalEnabled: false, paypalClientId: '', paypalSecretKey: '',
    bankEnabled: true, bankName: '', bankIban: '',
  });
  const [editingBank, setEditingBank] = useState(false);

  // Sync from DB
  useEffect(() => {
    if (shopSettings) {
      if (shopSettings.billing_address) setAddress({ ...address, ...shopSettings.billing_address });
      if (shopSettings.settlement_account) setSettlementCard({ ...settlementCard, ...shopSettings.settlement_account });
      if (shopSettings.customer_payment) setCustomerPayment({ ...customerPayment, ...shopSettings.customer_payment });
    }
  }, [shopSettings]);

  const handleSaveAddress = async () => {
    setSaving(true);
    await saveShopSettings({ billing_address: address });
    setSaving(false);
    setEditingAddress(false);
  };

  const handleSavePayment = async () => {
    setSaving(true);
    await saveShopSettings({ customer_payment: customerPayment });
    setSaving(false);
  };

  const innerTabs = [
    { id: 'rechnungsadresse', label: 'Rechnungsadresse' },
    { id: 'abrechnungskonto', label: 'Abrechnungskonto' },
    { id: 'kundenzahlung', label: 'Kundenzahlung' },
    { id: 'dokumente', label: 'Dokumente' },
  ];

  return (
    <div className="shop-content">
      <h2 className="shop-section-title">Shop-Abrechnung</h2>
      <p className="shop-section-desc">
        Rechne die Einkäufe in deinem Shop ganz einfach ab – direkt mit deinen Kunden.
        Nutze dafür bequem <strong>PayPal</strong> (empfohlen) oder alternativ die <strong>Banküberweisung</strong> (empfohlen als Fallback).
        Die Einnahmen gehen dabei vollständig und direkt an dich.
      </p>
      <p className="shop-section-desc" style={{ marginTop: '-0.75rem' }}>
        Mindestens einmal im Monat erhältst du von uns eine Rechnung über die angefallenen Produktionskosten und Gebühren.
        Damit alles reibungslos funktioniert, benötigen wir dazu deine aktuelle <strong>Rechnungsadresse</strong> sowie dein <strong>Abrechnungskonto</strong>.
      </p>

      {/* Inner Tabs */}
      <nav className="shop-inner-tabs">
        {innerTabs.map((tab) => (
          <button
            key={tab.id}
            className={`shop-inner-tab ${innerTab === tab.id ? 'active' : ''}`}
            onClick={() => setInnerTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── Rechnungsadresse ─── */}
      {innerTab === 'rechnungsadresse' && (
        <div>
          <h3 className="shop-section-title" style={{ fontSize: '1rem' }}>Deine Rechnungsadresse</h3>
          <p className="shop-section-desc">
            Damit wir die <strong>Gebühren und Produktionskosten</strong> aus deinen <strong>Shopverkäufen</strong> korrekt mit dir <strong>abrechnen</strong> können,
            bitten wir dich, uns deine aktuelle <strong>Rechnungsadresse</strong> zur Verfügung zu stellen.
          </p>

          {editingAddress ? (
            <div style={{ maxWidth: 520 }}>
              <div className="automation-field">
                <label>Name</label>
                <input type="text" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
              </div>
              <div className="automation-field">
                <label>E-Mail</label>
                <input type="email" value={address.email} onChange={(e) => setAddress({ ...address, email: e.target.value })} />
              </div>
              <div className="automation-field">
                <label>Firma</label>
                <input type="text" value={address.firma} onChange={(e) => setAddress({ ...address, firma: e.target.value })} />
              </div>
              <div className="automation-field">
                <label>Strasse</label>
                <input type="text" value={address.strasse} onChange={(e) => setAddress({ ...address, strasse: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="automation-field" style={{ flex: '0 0 120px' }}>
                  <label>PLZ</label>
                  <input type="text" value={address.plz} onChange={(e) => setAddress({ ...address, plz: e.target.value })} />
                </div>
                <div className="automation-field" style={{ flex: 1 }}>
                  <label>Ort</label>
                  <input type="text" value={address.ort} onChange={(e) => setAddress({ ...address, ort: e.target.value })} />
                </div>
              </div>
              <div className="automation-field">
                <label>Land</label>
                <select value={address.land} onChange={(e) => setAddress({ ...address, land: e.target.value })}>
                  <option>Schweiz</option>
                  <option>Deutschland</option>
                  <option>Österreich</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                <button className="btn-save-activate" style={{ maxWidth: 200 }} onClick={handleSaveAddress} disabled={saving}>
                  {saving ? 'Speichern...' : 'Speichern'}
                </button>
                <button className="btn-download-invoices" onClick={() => setEditingAddress(false)}>Abbrechen</button>
              </div>
            </div>
          ) : (
            <div className="address-card">
              <p>
                {address.name || <em style={{ color: '#999' }}>Kein Name hinterlegt</em>}<br />
                {address.email && <>{address.email}<br /></>}
                {address.firma && <>{address.firma}<br /></>}
                {address.strasse && <>{address.strasse}<br /></>}
                {(address.plz || address.ort) && <>{address.plz} {address.ort}<br /></>}
                {address.land}
              </p>
              <button className="edit-btn" onClick={() => setEditingAddress(true)} title="Bearbeiten">
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Abrechnungskonto ─── */}
      {innerTab === 'abrechnungskonto' && (
        <div>
          <h3 className="shop-section-title" style={{ fontSize: '1rem' }}>Dein Abrechnungskonto</h3>
          <p className="shop-section-desc">
            Damit wir die <strong>Gebühren und Produktionskosten</strong> aus deinen <strong>Shopverkäufen</strong> korrekt mit dir <strong>abrechnen</strong> können,
            bitten wir dich, ein <strong>Abrechnungskonto</strong> zu hinterlegen.
          </p>

          <div className="payment-card">
            <div className="payment-card-header">
              <div className="payment-card-title">
                <CreditCard size={18} />
                {settlementCard.type} Card
              </div>
              <button className="edit-btn" title="Bearbeiten"><Pencil size={16} /></button>
            </div>
            <p className="payment-card-number">{settlementCard.number}</p>
          </div>
        </div>
      )}

      {/* ─── Kundenzahlung ─── */}
      {innerTab === 'kundenzahlung' && (
        <div>
          <h3 className="shop-section-title" style={{ fontSize: '1rem' }}>Zahlungsmethode für deine Kunden im Shop</h3>
          <p className="shop-section-desc">
            Hier kannst du die Zahlungsinformationen hinterlegen, über die deine Kunden ihre Einkäufe in deinem Shop bezahlen können.
          </p>
          <p className="shop-section-desc" style={{ marginTop: '-0.75rem' }}>
            Wir empfehlen, <strong>beide verfügbaren Optionen</strong> zu aktivieren – <strong>PayPal</strong> als bevorzugte Zahlungsmethode
            und <strong>Banküberweisung</strong> als praktische Alternative, falls PayPal einmal nicht genutzt werden kann.
          </p>

          <div className="payment-methods-grid">
            {/* PayPal */}
            <div className={`payment-method-card ${customerPayment.paypalEnabled ? 'active' : ''}`}>
              <div className="payment-method-header">
                <div>
                  <span className="payment-method-title">💳 PayPal</span>
                  <HelpCircle size={12} style={{ marginLeft: '0.25rem', color: '#7fb5ff', cursor: 'help' }} />
                  <br />
                  <span className="payment-method-badge">(empfohlen)</span>
                </div>
                <div className="payment-method-actions">
                  <div
                    className={`toggle-wrapper ${customerPayment.paypalEnabled ? 'on' : ''}`}
                    onClick={() => setCustomerPayment({ ...customerPayment, paypalEnabled: !customerPayment.paypalEnabled })}
                  />
                </div>
              </div>

              {customerPayment.paypalEnabled && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="automation-field">
                    <label>Kunden ID <HelpCircle size={11} style={{ color: '#7fb5ff' }} /></label>
                    <input
                      type="text"
                      placeholder="Kunden ID"
                      value={customerPayment.paypalClientId}
                      onChange={(e) => setCustomerPayment({ ...customerPayment, paypalClientId: e.target.value })}
                    />
                  </div>
                  <div className="automation-field">
                    <label>Secret Key <HelpCircle size={11} style={{ color: '#7fb5ff' }} /></label>
                    <input
                      type="password"
                      placeholder="Secret Key"
                      value={customerPayment.paypalSecretKey}
                      onChange={(e) => setCustomerPayment({ ...customerPayment, paypalSecretKey: e.target.value })}
                    />
                  </div>
                  <button className="btn-save-activate" style={{ maxWidth: 160, fontSize: '0.8125rem', padding: '0.5rem' }} onClick={handleSavePayment} disabled={saving}>
                    {saving ? 'Speichern...' : 'Speichern'}
                  </button>
                </div>
              )}
            </div>

            {/* Banküberweisung */}
            <div className={`payment-method-card ${customerPayment.bankEnabled ? 'active' : ''}`}>
              <div className="payment-method-header">
                <div>
                  <span className="payment-method-title"><Building2 size={16} style={{ display: 'inline', verticalAlign: '-2px' }} /> Banküberweisung</span>
                  <HelpCircle size={12} style={{ marginLeft: '0.25rem', color: '#7fb5ff', cursor: 'help' }} />
                  <br />
                  <span className="payment-method-badge">(empfohlen als Fallback)</span>
                </div>
                <div className="payment-method-actions">
                  <button className="edit-btn" title="Bearbeiten" onClick={() => setEditingBank(!editingBank)}><Pencil size={14} /></button>
                  <div
                    className={`toggle-wrapper ${customerPayment.bankEnabled ? 'on' : ''}`}
                    onClick={() => setCustomerPayment({ ...customerPayment, bankEnabled: !customerPayment.bankEnabled })}
                  />
                </div>
              </div>
              {customerPayment.bankEnabled && !editingBank && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0 }}>
                    {customerPayment.bankName || <em style={{ color: '#999' }}>Kein Name hinterlegt</em>}<br />
                    {customerPayment.bankIban || <em style={{ color: '#999' }}>Keine IBAN hinterlegt</em>}
                  </p>
                </div>
              )}
              {customerPayment.bankEnabled && editingBank && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div className="automation-field">
                    <label>Kontoinhaber</label>
                    <input type="text" placeholder="Name" value={customerPayment.bankName}
                      onChange={(e) => setCustomerPayment({ ...customerPayment, bankName: e.target.value })} />
                  </div>
                  <div className="automation-field">
                    <label>IBAN</label>
                    <input type="text" placeholder="CH00 0000 0000 0000 0000 0"  value={customerPayment.bankIban}
                      onChange={(e) => setCustomerPayment({ ...customerPayment, bankIban: e.target.value })} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-save-activate" style={{ maxWidth: 140, fontSize: '0.8125rem', padding: '0.5rem' }} onClick={() => { handleSavePayment(); setEditingBank(false); }} disabled={saving}>
                      Speichern
                    </button>
                    <button className="btn-download-invoices" style={{ fontSize: '0.8125rem', padding: '0.5rem' }} onClick={() => setEditingBank(false)}>Abbrechen</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Dokumente ─── */}
      {innerTab === 'dokumente' && (
        <div>
          <h3 className="shop-section-title" style={{ fontSize: '1rem' }}>Dokumente</h3>

          <table className="docs-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Dokument</th>
                <th>Info</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {(!documents || documents.length === 0) ? (
                <tr>
                  <td colSpan={5} className="orders-empty">Keine Dokumente vorhanden</td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{new Date(doc.doc_date).toLocaleDateString('de-CH')}</td>
                    <td>{doc.document_name}</td>
                    <td>{doc.info}</td>
                    <td>{doc.status}</td>
                    <td>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="download-btn" title="Herunterladen">
                          <Download size={16} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShopAbrechnung;
