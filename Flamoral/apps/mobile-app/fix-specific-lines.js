const fs = require('fs');
const path = require('path');

// Function to fix a specific file
function fixFile(filePath, lineFixes) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lineFixes.forEach(({ lineNum, oldText, newText }) => {
    const index = lineNum - 1;
    if (lines[index] && lines[index].includes(oldText)) {
      lines[index] = lines[index].replace(oldText, newText);
      console.log(`  ✓ Fixed line ${lineNum}`);
    } else {
      console.log(`  ✗ Line ${lineNum} not found or doesn't match`);
    }
  });

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

// Fix ProfileWritingAssistant.tsx - line 294
console.log('\nFixing ProfileWritingAssistant.tsx...');
fixFile('src/components/profile/ProfileWritingAssistant.tsx', [
  {
    lineNum: 294,
    oldText: "text: 'Life's too short for bad coffee and boring conversations',",
    newText: "text: \"Life's too short for bad coffee and boring conversations\","
  }
]);

// Fix PhotoVerification.tsx - line 117
// First let's check what's on that line
const photoContent = fs.readFileSync('src/components/verification/PhotoVerification.tsx', 'utf8');
const photoLines = photoContent.split('\n');
console.log('\nPhotoVerification.tsx line 117:', photoLines[116]);

// Try to find and fix lines with apostrophes in single-quoted strings
console.log('\nSearching for problematic patterns in PhotoVerification.tsx...');
let fixed = 0;
for (let i = 0; i < photoLines.length; i++) {
  const line = photoLines[i];
  // Match pattern: 'text with ' inside'
  if (line.match(/'[^']*'[^']*'/)) {
    console.log(`  Found at line ${i+1}: ${line.substring(0, 80)}...`);
    // Replace outer quotes with double quotes
    photoLines[i] = line.replace(/'([^']*'[^']*)'/, '"$1"');
    fixed++;
  }
}

if (fixed > 0) {
  fs.writeFileSync('src/components/verification/PhotoVerification.tsx', photoLines.join('\n'), 'utf8');
  console.log(`✓ Fixed ${fixed} lines in PhotoVerification.tsx`);
}

console.log('\nDone!');
