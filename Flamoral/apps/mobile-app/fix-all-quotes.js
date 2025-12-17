const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/profile/ProfileWritingAssistant.tsx',
  'src/components/verification/PhotoVerification.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check each character
    let newContent = '';
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const code = char.charCodeAt(0);

      // Replace curly quotes with straight quotes
      if (code === 0x2018 || code === 0x2019) {
        // Single curly quotes -> straight quote
        newContent += "'";
      } else if (code === 0x201C || code === 0x201D) {
        // Double curly quotes -> straight quote
        newContent += '"';
      } else {
        newContent += char;
      }
    }

    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Fixed: ${file}`);
    } else {
      console.log(`No changes needed: ${file}`);
    }
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
