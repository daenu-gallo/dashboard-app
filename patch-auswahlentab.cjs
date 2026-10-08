const fs = require('fs');
let code = fs.readFileSync('src/pages/gallery-detail/AuswahlenTab.jsx', 'utf8');

// Export to CSV
const handleExport = `
  const handleExport = () => {
    if (!selectedPhotos || selectedPhotos.length === 0) return;
    const lines = ['Bildname,Link'];
    selectedPhotos.forEach(p => {
      lines.push(\`"\${p.name}","\${p.src}"\`);
    });
    const blob = new Blob([lines.join('\\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`Auswahl_\${activeCustomer || 'Export'}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
  };
`;

// Download all (naïve approach: open all in new tabs or trigger multiple downloads)
const handleDownloadAll = `
  const handleDownloadAll = () => {
    if (!selectedPhotos || selectedPhotos.length === 0) return;
    if (selectedPhotos.length > 20) {
       if (!window.confirm(\`Möchtest du wirklich \${selectedPhotos.length} Bilder gleichzeitig herunterladen? Dies öffnet viele Downloads.\`)) return;
    }
    selectedPhotos.forEach((p, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = p.src;
        a.download = p.name || \`Bild_\${i}.jpg\`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
  };
`;

code = code.replace('  const handleDeleteSelection = async () => {', handleExport + '\n' + handleDownloadAll + '\n  const handleDeleteSelection = async () => {');

// Attach handlers to the top buttons
code = code.replace(
  '<button><Upload size={12} /> Export</button>',
  '<button onClick={handleExport}><Upload size={12} /> Export (CSV)</button>'
);
code = code.replace(
  '<button><Download size={12} /> Auswahl herunterladen</button>',
  '<button onClick={handleDownloadAll}><Download size={12} /> Auswahl herunterladen</button>'
);

// Individual photo actions
code = code.replace(
  '<button title="Vergrössern"><ArrowUpCircle size={14} /></button>',
  '<button title="Vergrössern" onClick={(e) => { e.stopPropagation(); window.open(photo.src, \'_blank\'); }}><ArrowUpCircle size={14} /></button>'
);
code = code.replace(
  '<button title="Info"><Info size={14} /></button>',
  '<button title="Info" onClick={(e) => { e.stopPropagation(); alert(\`Dateiname: \${photo.name}\\nLink: \${photo.src}\`); }}><Info size={14} /></button>'
);
code = code.replace(
  '<button title="Herunterladen"><Download size={14} /></button>',
  '<button title="Herunterladen" onClick={(e) => { e.stopPropagation(); const a = document.createElement(\'a\'); a.href = photo.src; a.download = photo.name; a.target = \'_blank\'; a.click(); }}><Download size={14} /></button>'
);

fs.writeFileSync('src/pages/gallery-detail/AuswahlenTab.jsx', code);
console.log('Patched AuswahlenTab.jsx');
