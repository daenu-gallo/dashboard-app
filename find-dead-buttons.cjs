const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const deadButtons = [];

walkDir('./src', (filePath) => {
  if (!filePath.endsWith('.jsx')) return;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Find all <button ... > tags
  // Using a robust enough regex for simple cases
  const buttonRegex = /<button([^>]*)>/g;
  let match;
  while ((match = buttonRegex.exec(content)) !== null) {
    const attrs = match[1];
    
    // Check if it has onClick or type="submit"
    const hasOnClick = attrs.includes('onClick');
    const isSubmit = attrs.includes('type="submit"') || attrs.includes("type='submit'");
    
    // Also check for empty onClick like onClick={() => {}} or onClick={() => console.log(...)}
    let isDummy = false;
    if (hasOnClick) {
       const dummyRegex = /onClick=\{\(\)\s*=>\s*(?:\{\s*\}|console\.log)/;
       if (dummyRegex.test(attrs) || attrs.includes('onClick={() => alert(')) {
           isDummy = true;
       }
    }

    if ((!hasOnClick && !isSubmit) || isDummy) {
      // Find the line number
      const lineNo = content.substring(0, match.index).split('\n').length;
      
      // Extract the button text/children (up to </button>)
      const rest = content.substring(match.index + match[0].length);
      const closeIdx = rest.indexOf('</button>');
      let text = closeIdx !== -1 ? rest.substring(0, closeIdx).trim() : 'Unknown';
      // clean up newlines and extra spaces in text
      text = text.replace(/\s+/g, ' ');
      
      deadButtons.push({
        file: filePath,
        line: lineNo,
        attrs: attrs.trim(),
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        reason: isDummy ? 'Dummy onClick' : 'Missing onClick/submit'
      });
    }
  }
  
  // Also check for <a> tags without href
  const aRegex = /<a([^>]*)>/g;
  while ((match = aRegex.exec(content)) !== null) {
    const attrs = match[1];
    if (!attrs.includes('href=') && !attrs.includes('onClick')) {
      const lineNo = content.substring(0, match.index).split('\n').length;
      const rest = content.substring(match.index + match[0].length);
      const closeIdx = rest.indexOf('</a>');
      let text = closeIdx !== -1 ? rest.substring(0, closeIdx).trim() : 'Unknown';
      text = text.replace(/\s+/g, ' ');
      
      deadButtons.push({
        file: filePath,
        line: lineNo,
        attrs: attrs.trim(),
        text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        reason: '<a> without href or onClick'
      });
    }
  }
});

console.log(JSON.stringify(deadButtons, null, 2));
