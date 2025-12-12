const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/components/profile/ProfileWritingAssistant.tsx',
  'src/components/verification/PhotoVerification.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    const before = content.length;

    // Replace all Unicode smart quotes
    content = content
      .replace(/\u2018/g, "'")  // LEFT SINGLE QUOTATION MARK
      .replace(/\u2019/g, "'")  // RIGHT SINGLE QUOTATION MARK
      .replace(/\u201C/g, '"')  // LEFT DOUBLE QUOTATION MARK
      .replace(/\u201D/g, '"'); // RIGHT DOUBLE QUOTATION MARK

    const after = content.length;

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file} (${before} -> ${after} chars)`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
