import { getContentStatusLabel, getLabResultLabel, getRecoveryMessage, getSimulatorBoundaryCopy, getSyncStatusLabel } from '@/shared/learner-facing-copy';

describe('learner-facing interface copy', () => {
  test('uses consistent online-backup labels', () => {
    expect(getSyncStatusLabel('local')).toBe('SAVED ON THIS DEVICE');
    expect(getSyncStatusLabel('syncing')).toBe('BACKING UP');
    expect(getSyncStatusLabel('synced')).toBe('BACKED UP');
    expect(getSyncStatusLabel('action-needed')).toBe('WAITING FOR INTERNET');
  });

  test('describes content availability without implementation language', () => {
    expect(getContentStatusLabel('offline')).toBe('MATERIALS AVAILABLE OFFLINE');
    expect(getContentStatusLabel('error')).toBe('UPDATE NEEDS ATTENTION');
  });

  test('keeps recovery and simulator limits understandable', () => {
    expect(getRecoveryMessage('app-data')).toMatch(/saved data/i);
    expect(getRecoveryMessage('lab')).toMatch(/backup/i);
    expect(getSimulatorBoundaryCopy('cli')).not.toMatch(/bounded|modeled/i);
  });

  test('uses protocol-specific result labels', () => {
    expect(getLabResultLabel('dhcp-lease-desk')).toBe('DHCP EXCHANGE');
    expect(getLabResultLabel('acl-policy-desk')).toBe('MATCHED ACL RULE');
    expect(getLabResultLabel('static-route-board')).toBe('ROUTE CHECK');
  });
});
