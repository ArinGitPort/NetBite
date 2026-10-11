import { strict as assert } from 'node:assert';
import { isUnsentDeliveryExpired, isValidCanaryClassId, privatePushBody, privatePushTitle } from './workshop-push-safety.ts';

Deno.test('push delivery requires an explicit canary class', () => {
  assert.equal(isValidCanaryClassId(undefined), false);
  assert.equal(isValidCanaryClassId('all'), false);
  assert.equal(isValidCanaryClassId('00000000-0000-0000-0000-000000000001'), true);
});

Deno.test('unsent delivery expires after one hour', () => {
  const now = Date.parse('2026-10-11T12:00:00Z');
  assert.equal(isUnsentDeliveryExpired('2026-10-11T11:00:01Z', now), false);
  assert.equal(isUnsentDeliveryExpired('2026-10-11T11:00:00Z', now), true);
  assert.equal(isUnsentDeliveryExpired('invalid', now), true);
});

Deno.test('lock-screen text contains no class or assessment details', () => {
  assert.equal(privatePushTitle, 'NetBite');
  assert.equal(privatePushBody, 'Open NetBite to read it');
});
