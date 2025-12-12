const { exec } = require('child_process');
const path = require('path');

const tscPath = path.join(__dirname, 'node_modules', 'typescript', 'bin', 'tsc');

exec(`node "${tscPath}" --noEmit`, (error, stdout, stderr) => {
  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
  if (error) process.exit(error.code || 1);
});
