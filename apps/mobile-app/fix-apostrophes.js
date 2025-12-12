const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'src/components/profile/ProfileWritingAssistant.tsx',
    line: 294,
    from: "      text: 'Life's too short for bad coffee and boring conversations',",
    to: "      text: \"Life's too short for bad coffee and boring conversations\","
  },
  {
    file: 'src/components/verification/PhotoVerification.tsx',
    line: 117,
    // We'll find this one dynamically
  }
];

// Fix ProfileWritingAssistant.tsx
const file1 = 'src/components/profile/ProfileWritingAssistant.tsx';
let content1 = fs.readFileSync(file1, 'utf8');
// Replace single quotes with double quotes for strings containing apostrophes
content1 = content1.replace(
  /'([^']*'[^']*)'(?=,)/g,  // Match 'text with ' inside' followed by comma
  '"$1"'  // Replace with double quotes
);
fs.writeFileSync(file1, content1, 'utf8');
console.log(`Fixed: ${file1}`);

// Fix PhotoVerification.tsx
const file2 = 'src/components/verification/PhotoVerification.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
content2 = content2.replace(
  /'([^']*'[^']*)'(?=,)/g,
  '"$1"'
);
fs.writeFileSync(file2, content2, 'utf8');
console.log(`Fixed: ${file2}`);

console.log('Done!');
