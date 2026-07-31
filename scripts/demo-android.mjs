import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';

const root = process.cwd();
const adb = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe') : join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const fail = (message, recovery) => { console.error(`\nNETBITE DEMO START STOPPED\n${message}\n\nRECOVERY\n${recovery}\n`); process.exit(1); };
const run = (args) => { try { return execFileSync(adb, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch { return undefined; } };
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const portFree = () => new Promise((resolve) => { const server = net.createServer(); server.once('error', () => resolve(false)); server.once('listening', () => server.close(() => resolve(true))); server.listen(8081, '127.0.0.1'); });
const metroHealthy = async () => { try { const response = await fetch('http://127.0.0.1:8081/status', { signal: AbortSignal.timeout(1500) }); return (await response.text()).includes('packager-status:running'); } catch { return false; } };

if (!existsSync(adb)) fail('ADB was not found.', 'Install Android platform-tools or set ANDROID_HOME, then retry npm run demo:android.');
run(['start-server']);
let deviceLine = (run(['devices']) ?? '').split(/\r?\n/).find((line) => /^emulator-\d+\s+device$/.test(line));
if (!deviceLine) {
  const emulatorPath = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'emulator', 'emulator.exe') : join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk', 'emulator', 'emulator.exe');
  if (!existsSync(emulatorPath)) fail('No online emulator was found and the emulator launcher is missing.', 'Open Android Studio Device Manager, start an emulator, then retry.');
  const available = execFileSync(emulatorPath, ['-list-avds'], { encoding: 'utf8' }).split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const avd = process.env.NETBITE_ANDROID_AVD || available[0];
  if (!avd) fail('No Android Virtual Device is configured.', 'Create one in Android Studio Device Manager, then retry.');
  console.log(`Starting Android emulator ${avd}...`);
  spawn(emulatorPath, ['-avd', avd], { detached: true, stdio: 'ignore' }).unref();
  for (let attempt = 0; attempt < 90 && !deviceLine; attempt += 1) {
    await delay(1_000);
    deviceLine = (run(['devices']) ?? '').split(/\r?\n/).find((line) => /^emulator-\d+\s+device$/.test(line));
  }
}
if (!deviceLine) fail('The Android emulator did not connect to ADB.', 'Cold boot the emulator from Android Studio Device Manager, then retry.');
const serial = deviceLine.split(/\s+/)[0];
for (let attempt = 0; attempt < 60; attempt += 1) {
  if (run(['-s', serial, 'shell', 'getprop', 'sys.boot_completed']) === '1') break;
  if (attempt === 59) fail('The emulator did not finish booting within two minutes.', 'Cold boot the emulator from Android Studio Device Manager.');
  await delay(2_000);
}
if (!run(['-s', serial, 'shell', 'pm', 'path', 'host.exp.exponent'])) fail('Expo Go is not installed on the emulator.', 'Install an Expo Go build compatible with SDK 57, then retry.');

let metro;
if (!(await portFree())) {
  if (!(await metroHealthy())) fail('Port 8081 is occupied by a process that is not a healthy Metro server.', 'Close that application yourself or choose another port. NetBite will not kill unrelated processes.');
  console.log('Using the healthy Metro server already listening on 8081.');
} else {
  const cli = join(root, 'node_modules', 'expo', 'bin', 'cli');
  metro = spawn(process.execPath, ['--dns-result-order=ipv4first', cli, 'start', '--localhost', '--port', '8081'], { cwd: root, stdio: 'inherit', env: process.env });
  for (let attempt = 0; attempt < 60 && !(await metroHealthy()); attempt += 1) await delay(1_000);
  if (!(await metroHealthy())) fail('Metro did not become ready.', 'Run npm run android:clean once, then retry npm run demo:android.');
}

const restoreTunnel = () => {
  const devices = run(['devices']) ?? '';
  if (!devices.includes(`${serial}\tdevice`)) return false;
  run(['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']);
  return (run(['-s', serial, 'reverse', '--list']) ?? '').includes('tcp:8081');
};
if (!restoreTunnel()) fail('ADB reverse could not be established.', 'Run adb kill-server, restart the emulator, and retry.');
run(['-s', serial, 'shell', 'monkey', '-p', 'host.exp.exponent', '-c', 'android.intent.category.LAUNCHER', '1']);
await delay(1_000);
run(['-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'exp://127.0.0.1:8081/--/', '-p', 'host.exp.exponent']);
console.log('\nNETBITE DEMO STARTED / Ctrl+C stops this launcher. The ADB tunnel will be checked every five seconds.\n');
const monitor = setInterval(() => { if (!restoreTunnel()) console.warn('ADB tunnel unavailable; waiting for the emulator to reconnect...'); }, 5_000);
const stop = () => { clearInterval(monitor); metro?.kill('SIGINT'); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
metro?.on('exit', (code) => { clearInterval(monitor); process.exit(code ?? 0); });
