const { spawn } = require('child_process');
const path = require('path');

const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');

const tsc = spawn(tscPath, ['--noEmit'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

tsc.on('close', (code) => {
  process.exit(code);
});
