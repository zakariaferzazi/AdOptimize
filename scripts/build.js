const { execSync } = require('child_process');

const fs = require('fs');
const path = require('path');

const isInsideOpenNext = Boolean(
  process.env.__OPEN_NEXT_CHILD__ === '1' ||
  process.env.OPEN_NEXT_BUILD ||
  process.env._OPEN_NEXT
);

const buildEnv = {
  ...process.env,
  NODE_ENV: 'production',
};

// Guarantee ponyfill file exists for node-fetch / fetch-blob
const ponyfillPath = path.join(process.cwd(), 'node_modules', 'web-streams-polyfill', 'dist', 'ponyfill.es2018.js');
const ponyfillSource = path.join(process.cwd(), 'node_modules', 'web-streams-polyfill', 'dist', 'ponyfill.js');
if (fs.existsSync(ponyfillSource) && !fs.existsSync(ponyfillPath)) {
  fs.writeFileSync(ponyfillPath, 'module.exports = require("./ponyfill.js");\n');
}

if (isInsideOpenNext) {
  // When invoked as sub-process by OpenNext:
  console.log('[AdOptimize Build] Executing next build child process...');
  execSync('next build', { stdio: 'inherit', env: buildEnv });
} else {
  // Cloudflare OpenNext deployment build
  console.log('[AdOptimize Build] Building Cloudflare OpenNext worker bundle (opennextjs-cloudflare build)...');
  execSync('npx opennextjs-cloudflare build', {
    stdio: 'inherit',
    env: { ...buildEnv, __OPEN_NEXT_CHILD__: '1' },
  });

  const workerPath = path.join(process.cwd(), '.open-next', 'worker.js');
  const assetsPath = path.join(process.cwd(), '.open-next', 'assets');

  if (!fs.existsSync(workerPath)) {
    throw new Error(`[AdOptimize Build] OpenNext build failed: ${workerPath} was not generated.`);
  }
  if (!fs.existsSync(assetsPath)) {
    throw new Error(`[AdOptimize Build] OpenNext build failed: ${assetsPath} was not generated.`);
  }
  console.log('[AdOptimize Build] Successfully verified .open-next/worker.js and .open-next/assets.');
}

