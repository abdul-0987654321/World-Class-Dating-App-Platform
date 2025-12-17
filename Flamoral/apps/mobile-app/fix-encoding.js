const fs = require('fs');
const path = require('path');

const files = [
  'src/components/profile/ProfileWritingAssistant.tsx',
  'src/components/verification/PhotoVerification.tsx',
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    // Read file as buffer to preserve encoding
    const buffer = fs.readFileSync(filePath);
    let content = buffer.toString('utf8');

    // Log some info about the file
    console.log(`\nProcessing: ${file}`);
    console.log(`  Original size: ${content.length} chars`);

    // Count and show curly quotes
    const curlySingle = content.match(/[\u2018\u2019]/g);
    const curlyDouble = content.match(/[\u201C\u201D]/g);
    console.log(`  Found ${curlySingle ? curlySingle.length : 0} curly single quotes`);
    console.log(`  Found ${curlyDouble ? curlyDouble.length : 0} curly double quotes`);

    // Replace curly quotes
    content = content.replace(/[\u2018\u2019]/g, "'");  // Both left and right single quotes
    content = content.replace(/[\u201C\u201D]/g, '"');  // Both left and right double quotes

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Fixed and saved`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('\nDone!');
