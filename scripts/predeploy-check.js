/**
 * Pre-deploy configuration check.
 *
 * Wrangler rejects a deploy with `binding DB of type d1 must have a valid
 * database_id specified [code: 10021]` when the D1 binding is present but the
 * id is a placeholder. That message does not say what to do, so this script
 * checks the configuration first and prints the exact fix.
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', 'wrangler.jsonc');

function stripJsonc(source) {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function main() {
  if (!fs.existsSync(configPath)) {
    console.error('[predeploy] wrangler.jsonc not found.');
    process.exit(1);
  }

  let config;
  try {
    config = JSON.parse(stripJsonc(fs.readFileSync(configPath, 'utf8')));
  } catch (error) {
    console.error('[predeploy] wrangler.jsonc is not valid JSONC:', error.message);
    process.exit(1);
  }

  const bindings = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const dbBinding = bindings.find((entry) => entry && entry.binding === 'DB');

  if (!dbBinding) {
    console.warn(
      [
        '',
        '[predeploy] No D1 binding named "DB" is configured.',
        '',
        'The AI agent will fall back to an in-memory store, which does not persist',
        'conversations or proposals across requests. Approvals will fail closed.',
        '',
        'To enable durable storage:',
        '  1. npm run db:create',
        '  2. Paste the returned database_id into wrangler.jsonc',
        '  3. npm run db:migrate',
        '',
      ].join('\n')
    );
    return;
  }

  const id = String(dbBinding.database_id || '').trim();
  const looksLikePlaceholder =
    !id ||
    /^REPLACE/i.test(id) ||
    /^<.*>$/.test(id) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (looksLikePlaceholder) {
    console.error(
      [
        '',
        '[predeploy] The D1 binding "DB" has no valid database_id.',
        `  Found: ${id || '(empty)'}`,
        '',
        'Wrangler will reject this deploy with error 10021.',
        '',
        'Fix:',
        '  1. npm run db:create',
        '  2. Copy the database_id from the output into wrangler.jsonc',
        '  3. npm run db:migrate',
        '',
      ].join('\n')
    );
    process.exit(1);
  }

  console.log(`[predeploy] D1 binding "DB" -> ${dbBinding.database_name} (${id})`);
}

main();
