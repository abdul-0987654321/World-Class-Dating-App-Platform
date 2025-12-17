const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/hooks/useAuth.secure.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/from '@flamoral\/api-client'/g, "from '../api/client'");
    content = content.replace(/from '@flamoral\/types'/g, "from '../types'");
    content = content.replace(/from "@flamoral\/api-client"/g, 'from "../api/client"');
    content = content.replace(/from "@flamoral\/types"/g, 'from "../types"');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
