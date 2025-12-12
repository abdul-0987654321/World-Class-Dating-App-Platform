const fs = require('fs');
const path = require('path');

const file = 'src/utils/security.ts';
const filePath = path.join(__dirname, file);

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if React is already imported
  if (!content.includes('import React from')) {
    // Add React import at the top after the comment block
    content = content.replace(
      /import { Platform, Alert } from 'react-native';/,
      "import React from 'react';\nimport { Platform, Alert } from 'react-native';"
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed: ${file}`);
} else {
  console.log(`Not found: ${file}`);
}

console.log('Done!');
