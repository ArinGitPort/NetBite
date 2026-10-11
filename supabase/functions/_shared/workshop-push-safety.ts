export const privatePushTitle = 'NetBite';
export const privatePushBody = 'Open NetBite to read it';

export function isValidCanaryClassId(value: string | undefined): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export function isUnsentDeliveryExpired(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt);
  return !Number.isFinite(created) || now - created >= 60 * 60_000;
}
