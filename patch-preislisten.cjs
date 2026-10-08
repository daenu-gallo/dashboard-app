const fs = require('fs');
let code = fs.readFileSync('src/pages/shop/Preislisten.jsx', 'utf8');

// Get updatePriceList from useShop
code = code.replace(
  'const { priceLists, fetchPriceLists, createPriceList, updatePriceListItem, deletePriceList } = useShop();',
  'const { priceLists, fetchPriceLists, createPriceList, updatePriceList, updatePriceListItem, deletePriceList } = useShop();'
);

// Add rename handler
const renameHandler = `
  const handleRenameList = async () => {
    if (!selectedList) return;
    const newName = prompt('Neuer Name für die Preisliste:', selectedList.name);
    if (newName && newName.trim() !== '' && newName !== selectedList.name) {
      await updatePriceList(selectedList.id, { name: newName.trim() });
    }
  };
`;

code = code.replace('  const handleDeleteList = async () => {', renameHandler + '\n  const handleDeleteList = async () => {');

// Attach to button
code = code.replace(
  '<button className="edit-btn" title="Umbenennen"><Pencil size={16} /></button>',
  '<button className="edit-btn" title="Umbenennen" onClick={handleRenameList}><Pencil size={16} /></button>'
);

fs.writeFileSync('src/pages/shop/Preislisten.jsx', code);
console.log('Patched Preislisten.jsx');
