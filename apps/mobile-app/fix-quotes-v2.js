const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: 'src/components/ai/SmartReplySuggestions.tsx',
    replacements: [
      { from: "'Haha that's interesting! Tell me more'", to: "'Haha that\\'s interesting! Tell me more'" },
    ]
  },
  {
    file: 'src/components/profile/ProfileWritingAssistant.tsx',
    replacements: []
  },
  {
    file: 'src/components/verification/PhotoVerification.tsx',
    replacements: []
  }
];

fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace all curly/smart quotes with straight quotes
    // U+2018 LEFT SINGLE QUOTATION MARK
    // U+2019 RIGHT SINGLE QUOTATION MARK
    // U+201C LEFT DOUBLE QUOTATION MARK
    // U+201D RIGHT DOUBLE QUOTATION MARK
    content = content.split('').map(char => {
      const code = char.charCodeAt(0);
      if (code === 0x2018 || code === 0x2019) return "'";
      if (code === 0x201C || code === 0x201D) return '"';
      return char;
    }).join('');

    // Apply specific replacements
    replacements.forEach(({ from, to }) => {
      content = content.replace(new RegExp(from, 'g'), to);
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`Not found: ${file}`);
  }
});

console.log('Done!');
