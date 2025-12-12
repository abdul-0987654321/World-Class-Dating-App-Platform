const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace escaped backticks with proper backticks
content = content.replace(/\\`/g, '`');
// Replace escaped dollar signs with proper dollar signs
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed template literals in index.ts');
