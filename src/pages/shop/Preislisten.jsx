import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useShop } from '../../contexts/ShopContext';

// Default product catalog (without photo albums, as specified)
const DEFAULT_PRODUCTS = [
  {
    category: 'Digitale Pakete',
    items: [
      { sku: 'digital_single', name: 'Einzelnes Digitalfoto', purchasePrice: 0, defaultPrice: 2.00 },
      { sku: 'digital_pack_10', name: 'Digitalpaket 10 Fotos', purchasePrice: 0, defaultPrice: 15.00 },
      { sku: 'digital_pack_all', name: 'Alle Fotos digital', purchasePrice: 0, defaultPrice: 49.00 },
    ],
  },
  {
    category: 'Ausdrucke',
    items: [
      { sku: 'print_13x9', name: 'Fotoabzug classic 13x9cm', purchasePrice: 0.28, defaultPrice: 0.60 },
      { sku: 'print_18x13', name: 'Fotoabzug classic 18x13cm', purchasePrice: 0.56, defaultPrice: 0.90 },
      { sku: 'print_15x10', name: 'Fotoabzug classic 15x10cm', purchasePrice: 0.37, defaultPrice: 0.85 },
      { sku: 'print_19x13', name: 'Fotoabzug classic 19x13cm', purchasePrice: 0.60, defaultPrice: 1.10 },
      { sku: 'print_23x15', name: 'Fotoabzug classic 23x15cm', purchasePrice: 0.70, defaultPrice: 1.20 },
      { sku: 'print_30x20', name: 'Fotoabzug classic 30x20cm', purchasePrice: 1.62, defaultPrice: 2.10 },
      { sku: 'print_45x30', name: 'Fotoabzug classic 45x30cm', purchasePrice: 4.31, defaultPrice: 4.90 },
      { sku: 'print_sq_15x15', name: 'Fotoabzüge quadratisch 15x15cm', purchasePrice: 0.66, defaultPrice: 1.10 },
      { sku: 'print_sq_21x21', name: 'Fotoabzüge quadratisch 21x21cm', purchasePrice: 1.62, defaultPrice: 2.10 },
    ],
  },
  {
    category: 'Leinwand',
    items: [
      { sku: 'canvas_30x20', name: 'Leinwand 30x20cm', purchasePrice: 12.50, defaultPrice: 29.00 },
      { sku: 'canvas_40x30', name: 'Leinwand 40x30cm', purchasePrice: 18.00, defaultPrice: 39.00 },
      { sku: 'canvas_60x40', name: 'Leinwand 60x40cm', purchasePrice: 28.00, defaultPrice: 59.00 },
      { sku: 'canvas_80x60', name: 'Leinwand 80x60cm', purchasePrice: 42.00, defaultPrice: 89.00 },
      { sku: 'canvas_100x75', name: 'Leinwand 100x75cm', purchasePrice: 58.00, defaultPrice: 119.00 },
    ],
  },
  {
    category: 'Poster',
    items: [
      { sku: 'poster_a4', name: 'Poster A4', purchasePrice: 3.50, defaultPrice: 9.00 },
      { sku: 'poster_a3', name: 'Poster A3', purchasePrice: 6.00, defaultPrice: 15.00 },
      { sku: 'poster_a2', name: 'Poster A2', purchasePrice: 10.00, defaultPrice: 25.00 },
      { sku: 'poster_a1', name: 'Poster A1', purchasePrice: 18.00, defaultPrice: 39.00 },
    ],
  },
  {
    category: 'Postkarten',
    items: [
      { sku: 'postcard_a6', name: 'Postkarte A6', purchasePrice: 0.45, defaultPrice: 1.50 },
      { sku: 'postcard_dl', name: 'Postkarte DIN lang', purchasePrice: 0.55, defaultPrice: 1.80 },
    ],
  },
];

function buildDefaultItems() {
  const items = [];
  DEFAULT_PRODUCTS.forEach((cat) => {
    cat.items.forEach((item) => {
      items.push({
        product_sku: item.sku,
        product_name: item.name,
        category: cat.category,
        lab: 'gelato',
        purchase_price: item.purchasePrice,
        selling_price: item.defaultPrice,
        enabled: true,
      });
    });
  });
  return items;
}

const Preislisten = () => {
  const { priceLists, fetchPriceLists, createPriceList, deletePriceList, updatePriceListItem, loading } = useShop();

  // Local state for UI
  const [selectedListId, setSelectedListId] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState({});
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [saving, setSaving] = useState(false);

  // Local items state (for editing before save)
  const [localItems, setLocalItems] = useState([]);

  // Select first list when loaded
  useEffect(() => {
    if (priceLists.length > 0 && !selectedListId) {
      setSelectedListId(priceLists[0].id);
    }
  }, [priceLists]);

  // Sync local items from selected list
  const selectedList = priceLists.find((l) => l.id === selectedListId);
  useEffect(() => {
    if (selectedList?.price_list_items) {
      // Merge DB items with default catalog (for any new products)
      const dbItems = selectedList.price_list_items;
      const merged = [];
      DEFAULT_PRODUCTS.forEach((cat) => {
        cat.items.forEach((catItem) => {
          const dbItem = dbItems.find((di) => di.product_sku === catItem.sku);
          if (dbItem) {
            merged.push({
              ...dbItem,
              purchasePrice: parseFloat(dbItem.purchase_price),
              sellingPrice: parseFloat(dbItem.selling_price),
            });
          } else {
            merged.push({
              id: null,
              product_sku: catItem.sku,
              product_name: catItem.name,
              category: cat.category,
              lab: 'gelato',
              purchasePrice: catItem.purchasePrice,
              sellingPrice: catItem.defaultPrice,
              enabled: true,
            });
          }
        });
      });
      setLocalItems(merged);
    } else {
      // No DB items yet → use defaults
      setLocalItems(buildDefaultItems().map((i) => ({
        ...i,
        id: null,
        purchasePrice: i.purchase_price,
        sellingPrice: i.selling_price,
      })));
    }
  }, [selectedList]);

  const toggleCategory = (cat) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const updateLocalItem = (sku, field, value) => {
    setLocalItems((prev) =>
      prev.map((item) => item.product_sku === sku ? { ...item, [field]: value } : item)
    );
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setSaving(true);
    const list = await createPriceList(newListName.trim(), buildDefaultItems());
    if (list) setSelectedListId(list.id);
    setNewListName('');
    setShowNewListModal(false);
    setSaving(false);
  };

  const handleDeleteList = async () => {
    if (priceLists.length <= 1) return;
    if (!confirm(`Preisliste "${selectedList?.name}" wirklich löschen?`)) return;
    await deletePriceList(selectedListId);
    setSelectedListId(priceLists.find((l) => l.id !== selectedListId)?.id || '');
  };

  // Save individual item change
  const handleItemBlur = async (item) => {
    if (item.id) {
      await updatePriceListItem(item.id, {
        lab: item.lab,
        selling_price: item.sellingPrice,
        enabled: item.enabled,
      });
    }
  };

  return (
    <div className="shop-content">
      <h2 className="shop-section-title">Preislisten</h2>
      <p className="shop-section-desc">
        Hier kannst du deine individuellen Preislisten für den Verkauf deiner Bilder erstellen.
        Wähle aus verschiedenen Printprodukten und digitalen Dateien, lege die Preise fest und
        entscheide, welches Labor die Prints produziert. Du kannst mehrere Preislisten anlegen,
        sie mit deinen Galerien verknüpfen und jederzeit bearbeiten, um dein Angebot flexibel
        anzupassen.
      </p>

      {/* Header */}
      <div className="pricelist-header">
        <div className="pricelist-selector">
          <label>Wähle die Preisliste aus, die du bearbeiten möchtest:</label>
          <select className="pricelist-select" value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
            {priceLists.map((list) => (
              <option key={list.id} value={list.id}>{list.name}</option>
            ))}
            {priceLists.length === 0 && <option value="">Keine Preislisten</option>}
          </select>
        </div>
        <button className="btn-new-pricelist" onClick={() => setShowNewListModal(true)}>
          <Plus size={14} /> Neue Preisliste erstellen
        </button>
      </div>

      {/* New List Inline Form */}
      {showNewListModal && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text" className="pricelist-select" placeholder="Name der neuen Preisliste"
            value={newListName} onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateList()} autoFocus
          />
          <button className="btn-show-period" onClick={handleCreateList} disabled={saving}>
            {saving ? 'Erstellen...' : 'Erstellen'}
          </button>
          <button className="btn-download-invoices" onClick={() => setShowNewListModal(false)}>Abbrechen</button>
        </div>
      )}

      {/* Price List Card */}
      {selectedList && (
        <div className="pricelist-card">
          <div className="pricelist-card-header">
            <span className="pricelist-card-title">{selectedList.name}</span>
            <div className="pricelist-card-actions">
              <button className="edit-btn" title="Umbenennen"><Pencil size={16} /></button>
              <button className="edit-btn" title="Löschen" onClick={handleDeleteList} style={{ color: '#dc2626' }}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <table className="product-table">
            <thead>
              <tr>
                <th style={{ width: 260 }}>Produkt</th>
                <th>Labor</th>
                <th>Einkaufspreis</th>
                <th>Verkaufspreis</th>
                <th>Brutto Marge ⓘ</th>
              </tr>
            </thead>
            <tbody>
              {DEFAULT_PRODUCTS.map((cat) => {
                const isCollapsed = collapsedCategories[cat.category];
                const catItems = localItems.filter((item) =>
                  cat.items.some((ci) => ci.sku === item.product_sku)
                );

                return (
                  <React.Fragment key={cat.category}>
                    {/* Category Header */}
                    <tr className="category-row">
                      <td colSpan={4}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={catItems.every((i) => i.enabled)}
                            onChange={(e) => {
                              catItems.forEach((item) => {
                                updateLocalItem(item.product_sku, 'enabled', e.target.checked);
                                if (item.id) updatePriceListItem(item.id, { enabled: e.target.checked });
                              });
                            }}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          {cat.category}
                        </div>
                      </td>
                      <td>
                        <button className="category-toggle" onClick={() => toggleCategory(cat.category)}>
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </td>
                    </tr>

                    {/* Product Rows */}
                    {!isCollapsed &&
                      catItems.map((item) => {
                        const margin = ((item.sellingPrice || 0) - (item.purchasePrice || 0)).toFixed(2);
                        const isNegative = parseFloat(margin) < 0;
                        return (
                          <tr key={item.product_sku}>
                            <td>
                              <div className="product-row">
                                <input
                                  type="checkbox"
                                  checked={item.enabled}
                                  onChange={(e) => {
                                    updateLocalItem(item.product_sku, 'enabled', e.target.checked);
                                    if (item.id) updatePriceListItem(item.id, { enabled: e.target.checked });
                                  }}
                                />
                                <div className="product-thumb" />
                                <span className="product-name">{item.product_name || item.name}</span>
                              </div>
                            </td>
                            <td>
                              <select
                                className="lab-select"
                                value={item.lab}
                                onChange={(e) => {
                                  updateLocalItem(item.product_sku, 'lab', e.target.value);
                                  if (item.id) updatePriceListItem(item.id, { lab: e.target.value });
                                }}
                              >
                                <option value="gelato">Gelato</option>
                                <option value="nphoto">nPhoto</option>
                              </select>
                            </td>
                            <td style={{ color: 'var(--text-secondary)' }}>
                              Fr. {(item.purchasePrice || 0).toFixed(2)}
                            </td>
                            <td>
                              <input
                                type="number"
                                className="price-input"
                                value={item.sellingPrice}
                                step="0.05"
                                min="0"
                                onChange={(e) => updateLocalItem(item.product_sku, 'sellingPrice', parseFloat(e.target.value) || 0)}
                                onBlur={() => handleItemBlur(item)}
                              />
                            </td>
                            <td>
                              <span className={`margin-badge ${isNegative ? 'negative' : ''}`}>
                                Fr. {margin}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {priceLists.length === 0 && !loading && (
        <div className="orders-empty" style={{ padding: '3rem' }}>
          <p>Keine Preislisten vorhanden.</p>
          <button className="btn-new-pricelist" onClick={() => setShowNewListModal(true)}>
            <Plus size={14} /> Erste Preisliste erstellen
          </button>
        </div>
      )}
    </div>
  );
};

export default Preislisten;
