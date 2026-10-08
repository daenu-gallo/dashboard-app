const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.jsx', 'utf8');

// Add state for the button
code = code.replace(
  '  const updateField = (field, value) => {',
  `  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const updateField = (field, value) => {`
);

code = code.replace(
  '<button className="btn-save">Speichern</button>',
  '<button className="btn-save" onClick={handleSave}>{saved ? "✓ Gespeichert" : "Speichern"}</button>'
);

fs.writeFileSync('src/pages/SettingsPage.jsx', code);
console.log('Patched SettingsPage.jsx');
