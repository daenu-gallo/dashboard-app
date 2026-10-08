const fs = require('fs');
let code = fs.readFileSync('src/pages/gallery-detail/CustomerView.jsx', 'utf8');

// 1. Extract handleCommentSubmit
const commentRegex = /  const handleCommentSubmit = async \(e\) => \{[\s\S]*?^\s*};\n/m;
const matchComment = code.match(commentRegex);
code = code.replace(commentRegex, '');

// 2. Extract abandoned cart useEffect
const cartRegex = /  \/\/ Sync abandoned carts\n  useEffect\(\(\) => \{[\s\S]*?^\s*\}, \[cart, customerUser, supaGallery\?\.id\]\);\n/m;
const matchCart = code.match(cartRegex);
code = code.replace(cartRegex, '');

// 3. Insert both after `const pendingSelection = useRef(null);`
const targetPoint = '  const pendingSelection = useRef(null);\n';
const insertion = `
${matchComment[0]}
${matchCart[0]}
`;
code = code.replace(targetPoint, targetPoint + insertion);

fs.writeFileSync('src/pages/gallery-detail/CustomerView.jsx', code);
console.log('Fixed CustomerView.jsx');
