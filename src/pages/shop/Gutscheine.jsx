import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, BookOpen, X } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';

const Gutscheine = () => {
  const { coupons, createCoupon, updateCoupon, deleteCoupon } = useShop();
  const [search, setSearch] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('percent');
  const [formValue, setFormValue] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = coupons.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!formCode.trim() || !formName.trim()) return;
    setSaving(true);
    await createCoupon({
      code: formCode.trim(),
      name: formName.trim(),
      discount_type: formType,
      discount_value: parseFloat(formValue) || 0,
    });
    setSaving(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!formCode.trim() || !formName.trim()) return;
    setSaving(true);
    await updateCoupon(editingId, {
      code: formCode.trim(),
      name: formName.trim(),
      discount_type: formType,
      discount_value: parseFloat(formValue) || 0,
    });
    setSaving(false);
    resetForm();
  };

  const handleDelete = async (id) => {
    if (!confirm('Gutschein wirklich löschen?')) return;
    await deleteCoupon(id);
  };

  const startEdit = (coupon) => {
    setEditingId(coupon.id);
    setFormCode(coupon.code);
    setFormName(coupon.name);
    setFormType(coupon.discount_type || 'percent');
    setFormValue(coupon.discount_value?.toString() || '');
    setShowCreate(true);
  };

  const resetForm = () => {
    setShowCreate(false);
    setEditingId(null);
    setFormCode('');
    setFormName('');
    setFormType('percent');
    setFormValue('');
  };

  return (
    <div className="shop-content">
      <div className="coupons-header">
        <h2 className="shop-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🏷️</span> Gutscheine
        </h2>
        <a className="shop-help-link" href="#"><BookOpen size={13} /> Hilfeartikel anzeigen</a>
      </div>

      {/* Search */}
      <div className="shop-search">
        <Search size={14} style={{ color: '#999' }} />
        <input type="text" placeholder="Suche" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Create / Edit Form */}
      {showCreate && (
        <div style={{
          border: '1px solid var(--border-light, #e5e7eb)',
          borderRadius: 8, padding: '1rem', marginBottom: '1rem', background: '#fafafa',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem' }}>
              {editingId ? 'Gutschein bearbeiten' : 'Neuen Gutschein erstellen'}
            </h4>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="automation-field" style={{ flex: 1, minWidth: 150 }}>
              <label>Code</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="z.B. SOMMER20" />
            </div>
            <div className="automation-field" style={{ flex: 1, minWidth: 200 }}>
              <label>Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="z.B. Sommer 20% Rabatt" />
            </div>
            <div className="automation-field" style={{ flex: '0 0 120px' }}>
              <label>Typ</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                <option value="percent">Prozent</option>
                <option value="fixed">Fixbetrag</option>
              </select>
            </div>
            <div className="automation-field" style={{ flex: '0 0 100px' }}>
              <label>Wert</label>
              <input type="number" value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder={formType === 'percent' ? '%' : 'CHF'} />
            </div>
          </div>
          <button className="btn-save-activate" style={{ maxWidth: 180, fontSize: '0.8125rem', padding: '0.5rem', marginTop: '0.5rem' }}
            onClick={editingId ? handleUpdate : handleCreate} disabled={saving}
          >
            {saving ? 'Speichern...' : editingId ? 'Aktualisieren' : 'Erstellen'}
          </button>
        </div>
      )}

      {/* Table */}
      <table className="coupons-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th style={{ textAlign: 'right' }}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={3} className="orders-empty">Keine Gutscheine gefunden</td></tr>
          ) : (
            filtered.slice(0, perPage).map((coupon) => (
              <tr key={coupon.id}>
                <td style={{ fontWeight: 500 }}>{coupon.code}</td>
                <td>{coupon.name}</td>
                <td>
                  <div className="coupon-actions" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn-edit" title="Bearbeiten" onClick={() => startEdit(coupon)}>
                      <Pencil size={15} style={{ color: 'var(--color-primary)' }} />
                    </button>
                    <button className="btn-delete" title="Löschen" onClick={() => handleDelete(coupon.id)}>
                      <Trash2 size={15} style={{ color: '#dc2626' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Add + Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
        <button className="btn-add-coupon" onClick={() => { resetForm(); setShowCreate(true); }}>
          <Plus size={14} /> Gutschein erstellen
        </button>
        <div className="shop-pagination">
          <span>Ergebnisse pro Seite</span>
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Gutscheine;
