import { buildDiagnosticReport, redactDiagnosticText } from '@/core/reliability/diagnostics';

describe('diagnostic privacy', () => {
  it('redacts endpoints, accounts, addresses, and tokens', () => {
    const input = 'https://secret.supabase.co learner@example.com 192.168.10.10/24 sb_publishable_secret eyJabcdefghijklmnopqrstuvwxyz1234567890';
    const output = redactDiagnosticText(input);
    expect(output).not.toContain('secret.supabase');
    expect(output).not.toContain('learner@example');
    expect(output).not.toContain('192.168');
    expect(output).not.toContain('sb_publishable');
  });

  it('builds a readable report from safe facts', () => {
    const report = buildDiagnosticReport({ appVersion: '1.0.0', platform: 'android', storage: 'ready', internet: 'available', cloud: 'available', authentication: 'guest mode', synchronization: 'saved on this device', sandbox: '3 devices / 2 links' });
    expect(report).toContain('NETBITE DIAGNOSTIC REPORT');
    expect(report).toContain('3 devices / 2 links');
    expect(report).not.toContain('schema');
    expect(report).not.toContain('hydration');
  });
});
