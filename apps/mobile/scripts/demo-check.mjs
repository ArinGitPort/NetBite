import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import net from 'node:net';

const root = process.cwd();
const require = createRequire(import.meta.url);
const expoCli = join(dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let failures = 0;
const report = (ok, label, detail) => { console.log(`${ok ? '[OK]' : '[ACTION]'} ${label}${detail ? ` / ${detail}` : ''}`); if (!ok) failures += 1; };

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#') && line.includes('=')).map((line) => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
}

function command(command, args = []) {
  try { return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch { return undefined; }
}

async function portAvailable(port) {
  return new Promise((resolve) => { const server = net.createServer(); server.once('error', () => resolve(false)); server.once('listening', () => server.close(() => resolve(true))); server.listen(port, '127.0.0.1'); });
}

async function metroHealthy() {
  try {
    const response = await fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(1500) });
    return (await response.text()).includes('packager-status:running');
  } catch { return false; }
}

console.log('NETBITE DEMO PREFLIGHT\n');
const nodeMajor = Number(process.versions.node.split('.')[0]);
report(nodeMajor >= 20, 'Node runtime', process.version);
report(pkg.dependencies?.expo?.startsWith('~57.'), 'Expo SDK', pkg.dependencies?.expo);

const env = { ...loadEnvFile(join(root, '.env.local')), ...process.env };
for (const key of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) report(Boolean(env[key]), key, env[key] ? 'present (value hidden)' : 'optional for local demo');
report(true, 'Presentation mode', env.EXPO_PUBLIC_NETBITE_DEMO_MODE === '1' ? 'enabled for development' : 'optional; set to 1 to enable');

const metroPortAvailable = await portAvailable(8081);
const existingMetroHealthy = !metroPortAvailable && await metroHealthy();
report(metroPortAvailable || existingMetroHealthy, 'Metro port 8081', metroPortAvailable ? 'available' : existingMetroHealthy ? 'occupied by a healthy Metro server' : 'occupied by an unrelated process');
const adb = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe') : join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
report(existsSync(adb), 'ADB executable', existsSync(adb) ? adb : 'set ANDROID_HOME or install Android platform-tools');
if (existsSync(adb)) {
  command(adb, ['start-server']);
  const devices = command(adb, ['devices']) ?? '';
  const emulator = devices.split(/\r?\n/).find((line) => /^emulator-\d+\s+device$/.test(line));
  report(Boolean(emulator), 'Android emulator', emulator?.split(/\s+/)[0] ?? 'start an emulator in Android Studio');
  if (emulator) {
    const serial = emulator.split(/\s+/)[0];
    const installed = command(adb, ['-s', serial, 'shell', 'pm', 'path', 'host.exp.exponent']);
    const packageInfo = command(adb, ['-s', serial, 'shell', 'dumpsys', 'package', 'host.exp.exponent']) ?? '';
    const version = packageInfo.match(/versionName=([^\s]+)/)?.[1];
    report(Boolean(installed), 'Expo Go', installed ? `installed${version ? ` / ${version}` : ''}; confirm its SDK list includes 57` : 'install the SDK 57-compatible Expo Go app');
  }
}

const exportRoot = join(tmpdir(), `netbite-demo-check-${process.pid}`);
for (const platform of ['android', 'web']) {
  const output = join(exportRoot, platform);
  const result = spawnSync(process.execPath, [expoCli, 'export', '--platform', platform, '--output-dir', output], { cwd: root, encoding: 'utf8', timeout: 180_000 });
  report(result.status === 0, `${platform.toUpperCase()} bundle`, result.status === 0 ? 'healthy' : 'export failed; run the command directly for details');
}
rmSync(exportRoot, { recursive: true, force: true });

console.log(failures ? `\n${failures} item(s) need attention. Local curriculum files were not changed.` : '\nREADY FOR DEMONSTRATION.');
process.exitCode = failures ? 1 : 0;
