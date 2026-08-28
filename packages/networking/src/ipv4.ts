export function prefixToSubnetMask(prefix: number): string | null {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  return Array.from({ length: 4 }, (_, octetIndex) => {
    const remainingBits = prefix - octetIndex * 8;
    if (remainingBits >= 8) return 255;
    if (remainingBits <= 0) return 0;
    return 256 - 2 ** (8 - remainingBits);
  }).join('.');
}

export function deriveIpv4Network(
  address: string | undefined,
  prefix: number | undefined,
): string | null {
  if (!address || prefix == null || !prefixToSubnetMask(prefix)) return null;
  const octets = address.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const value = (((octets[0] << 24) >>> 0) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const network = (value & mask) >>> 0;
  return `${[(network >>> 24) & 255, (network >>> 16) & 255, (network >>> 8) & 255, network & 255].join('.')}/${prefix}`;
}
