const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', 'worker.js');

if (!fs.existsSync(workerPath)) {
  console.log('[AdOptimize Deploy] .open-next/worker.js does not exist. Running opennextjs-cloudflare build first...');
  execSync('npx opennextjs-cloudflare build', { stdio: 'inherit' });
}

if (!fs.existsSync(workerPath)) {
  console.error('[AdOptimize Deploy] Deployment aborted: .open-next/worker.js does not exist.');
  process.exit(1);
}

console.log('[AdOptimize Deploy] Verified .open-next/worker.js exists. Deploying to Cloudflare Workers with wrangler...');
execSync('npx wrangler deploy', { stdio: 'inherit' });
