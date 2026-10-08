const fs = require('fs');
let code = fs.readFileSync('src/contexts/ShopContext.jsx', 'utf8');

const newMethod = `
  // ─── Update Price List ───
  const updatePriceList = useCallback(async (listId, updates) => {
    const { error } = await supabase
      .from('price_lists')
      .update(updates)
      .eq('id', listId);
    if (error) {
      console.error('[ShopContext] updatePriceList:', error);
    } else {
      await fetchPriceLists();
    }
    return { error };
  }, [fetchPriceLists]);

  // ─── Update Price List Items ───
`;

code = code.replace('  // ─── Update Price List Items ───', newMethod);
code = code.replace('priceLists, fetchPriceLists, createPriceList, updatePriceListItem, deletePriceList,', 'priceLists, fetchPriceLists, createPriceList, updatePriceList, updatePriceListItem, deletePriceList,');

fs.writeFileSync('src/contexts/ShopContext.jsx', code);
console.log('Patched ShopContext.jsx');
