const fs = require('fs');
const path = require('path');

const oldPath = 'src/utils/security.ts';
const newPath = 'src/utils/security.tsx';

if (fs.existsSync(oldPath)) {
  fs.renameSync(oldPath, newPath);
  console.log(`Renamed ${oldPath} to ${newPath}`);
} else {
  console.log(`${oldPath} not found`);
}
