const fs = require('fs');
const path = require('path');

const files = [
  'src/components/profile/ProfileWritingAssistant.tsx',
  'src/components/verification/PhotoVerification.tsx',
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;

    // Count occurrences before
    const beforeCurly = (content.match(/['']/g) || []).length;

    // Replace all curly apostrophes with straight ones
    content = content.replace(/'/g, "'");  // RIGHT SINGLE QUOTATION MARK
    content = content.replace(/'/g, "'");  // LEFT SINGLE QUOTATION MARK
    content = content.replace(/"/g, '"');  // LEFT DOUBLE QUOTATION MARK
    content = content.replace(/"/g, '"');  // RIGHT DOUBLE QUOTATION MARK

    // Count occurrences after
    const afterCurly = (content.match(/['']/g) || []).length;

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}: Found and replaced ${beforeCurly} curly quotes`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
