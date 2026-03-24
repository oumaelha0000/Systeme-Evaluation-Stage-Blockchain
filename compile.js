const { execSync } = require('child_process');

try {
  execSync('npx hardhat compile', { stdio: 'pipe' });
  console.log('Compiled successfully');
} catch (error) {
  console.log('--- ERROR LOG ---');
  console.log(error.stdout.toString());
  console.log(error.stderr.toString());
}
