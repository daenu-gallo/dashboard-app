const fs = require('fs');
let code = fs.readFileSync('src/pages/shop/ShopAbrechnung.jsx', 'utf8');

code = code.replace(
  '<button className="edit-btn" title="Bearbeiten"><Pencil size={16} /></button>',
  '<button className="edit-btn" title="Bearbeiten" onClick={() => alert("Kreditkarten-Informationen können aus Sicherheitsgründen derzeit nur direkt über dein Stripe/Zahlungsanbieter-Dashboard geändert werden.")}><Pencil size={16} /></button>'
);

fs.writeFileSync('src/pages/shop/ShopAbrechnung.jsx', code);
console.log('Patched ShopAbrechnung.jsx');
