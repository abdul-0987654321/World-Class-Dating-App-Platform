const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix escaped backticks - replace \` with `
content = content.replace(/\\`/g, '`');

// Fix escaped dollar signs in template literals
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed syntax errors in index.ts');
