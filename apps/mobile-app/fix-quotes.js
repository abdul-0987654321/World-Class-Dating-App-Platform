const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/ai/SmartReplySuggestions.tsx',
  'src/components/profile/ProfileWritingAssistant.tsx',
  'src/components/verification/PhotoVerification.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace smart quotes with regular quotes
    content = content.replace(/'/g, "'"); // Left single quote
    content = content.replace(/'/g, "'"); // Right single quote
    content = content.replace(/"/g, '"'); // Left double quote
    content = content.replace(/"/g, '"'); // Right double quote

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
