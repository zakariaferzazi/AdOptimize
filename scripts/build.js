const { execSync } = require('child_process');

const isAIStudio = Boolean(
  process.env.APPLET_ID ||
  process.env.K_SERVICE ||
  process.env.AUTHORIZED_SERVICE_ACCOUNT_EMAIL
);

const isInsideOpenNext = Boolean(
  process.env.__OPEN_NEXT_CHILD__ === '1' ||
  process.env.OPEN_NEXT_BUILD ||
  process.env._OPEN_NEXT
);

const buildEnv = {
  ...process.env,
  NODE_ENV: 'production',
};

if (isAIStudio || isInsideOpenNext) {
  // In AI Studio sandbox or when invoked as sub-process by OpenNext:
  console.log('[AdOptimize Build] Executing next build with production environment...');
  execSync('next build', { stdio: 'inherit', env: buildEnv });
} else {
  // In Cloudflare CI / external deploy: run opennextjs-cloudflare build to generate .open-next/worker.js and .open-next/assets
  console.log('[AdOptimize Build] Building Cloudflare OpenNext worker bundle...');
  try {
    execSync('npx opennextjs-cloudflare build', {
      stdio: 'inherit',
      env: { ...buildEnv, __OPEN_NEXT_CHILD__: '1' },
    });
  } catch (err) {
    console.warn('[AdOptimize Build] opennextjs-cloudflare build failed:', err.message);
    console.log('[AdOptimize Build] Falling back to standard next build...');
    execSync('next build', { stdio: 'inherit', env: buildEnv });
  }
}
