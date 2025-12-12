const fs = require('fs');
const path = require('path');

// Fix ProfileWritingAssistant.tsx - line 294
console.log('Fixing ProfileWritingAssistant.tsx...');
const file1 = 'src/components/profile/ProfileWritingAssistant.tsx';
let content1 = fs.readFileSync(file1, 'utf8');
const lines1 = content1.split('\n');
const line294 = lines1[293];
console.log('Before:', line294);
lines1[293] = line294.replace(
  "text: 'Life's too short for bad coffee and boring conversations',",
  'text: "Life\'s too short for bad coffee and boring conversations",'
);
console.log('After:', lines1[293]);
fs.writeFileSync(file1, lines1.join('\n'), 'utf8');

// Fix PhotoVerification.tsx - line 117
console.log('\nFixing PhotoVerification.tsx...');
const file2 = 'src/components/verification/PhotoVerification.tsx';
let content2 = fs.readFileSync(file2, 'utf8');
const lines2 = content2.split('\n');
const line117 = lines2[116];
console.log('Before:', line117);
lines2[116] = line117.replace(
  "'Time's Up',",
  '"Time\'s Up",'
);
console.log('After:', lines2[116]);
fs.writeFileSync(file2, lines2.join('\n'), 'utf8');

console.log('\nDone!');
