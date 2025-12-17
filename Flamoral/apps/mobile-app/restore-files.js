const { execSync } = require('child_process');

try {
  execSync('git checkout src/components/profile/ProfileWritingAssistant.tsx', { cwd: __dirname, stdio: 'inherit' });
  execSync('git checkout src/components/verification/PhotoVerification.tsx', { cwd: __dirname, stdio: 'inherit' });
  console.log('Files restored from git');
} catch (error) {
  console.error('Error restoring files:', error.message);
}
