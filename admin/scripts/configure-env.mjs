import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const adminRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(adminRoot, '..');

function parseEnvironment(source) {
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#')) continue;
    values.set(match[1], match[2].replace(/^(['"])(.*)\1$/, '$2'));
  }
  return values;
}

const rootEnvironment = parseEnvironment(
  await readFile(resolve(workspaceRoot, '.env.local'), 'utf8'),
);
const url = rootEnvironment.get('VITE_SUPABASE_URL') ?? rootEnvironment.get('EXPO_PUBLIC_SUPABASE_URL');
const key = rootEnvironment.get('VITE_SUPABASE_PUBLISHABLE_KEY') ?? rootEnvironment.get('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

if (!url || !key) {
  throw new Error('The root .env.local file does not contain the Supabase URL and publishable key.');
}

await writeFile(
  resolve(adminRoot, '.env.local'),
  `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_PUBLISHABLE_KEY=${key}\n`,
  { encoding: 'utf8', mode: 0o600 },
);

console.log('Created admin/.env.local with the two browser-safe Supabase settings. No values were printed.');
