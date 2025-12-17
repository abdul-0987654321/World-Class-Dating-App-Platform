const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/__tests__/unit/services/verification.service.test.ts',
  'tests/unit/profile.service.test.ts',
  'tests/e2e/api/user-api.spec.ts',
];

const jestRef = '/// <reference types="jest" />\n';

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);

  try {
    if (!fs.existsSync(fullPath)) {
      console.log(`File not found: ${file}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');

    // Check if already has the reference
    if (content.startsWith('/// <reference types="jest"')) {
      console.log(`Already has jest reference: ${file}`);
      return;
    }

    // Prepend the jest reference
    const newContent = jestRef + content;
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`Added jest reference to: ${file}`);
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('\nDone!');
