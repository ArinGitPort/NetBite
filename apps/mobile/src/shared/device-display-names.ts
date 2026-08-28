const canonicalNames: Record<string, string> = {
  'pc-a': 'PC1',
  'pc-b': 'PC2',
  'pc-c': 'PC3',
  'pc-1': 'PC1',
  'pc-2': 'PC2',
  'pc-3': 'PC3',
  r1: 'R1',
  r2: 'R2',
  r3: 'R3',
  'sw-a': 'SW1',
  'sw-b': 'SW2',
  'sw-c': 'SW3',
  'sw-1': 'SW1',
  'sw-2': 'SW2',
  'sw-3': 'SW3',
  'dhcp-1': 'DHCP1',
  'dns-1': 'DNS1',
  'web-1': 'WEB1',
  'server-1': 'SERVER1',
};

const aliases: Record<string, string> = {
  'pc-a': 'pc-a',
  pc1: 'pc-a',
  'pc-1': 'pc-a',
  'pc-b': 'pc-b',
  pc2: 'pc-b',
  'pc-2': 'pc-b',
  'pc-c': 'pc-c',
  pc3: 'pc-c',
  'pc-3': 'pc-c',
  'nb-r1': 'r1',
  'r-1': 'r1',
  r1: 'r1',
  'nb-r2': 'r2',
  'r-2': 'r2',
  r2: 'r2',
  'nb-r3': 'r3',
  'r-3': 'r3',
  r3: 'r3',
  'nb-sw-a': 'sw-a',
  'sw-a': 'sw-a',
  sw1: 'sw-a',
  'sw-1': 'sw-a',
  'nb-sw-b': 'sw-b',
  'sw-b': 'sw-b',
  sw2: 'sw-b',
  'sw-2': 'sw-b',
  'nb-sw-c': 'sw-c',
  'sw-c': 'sw-c',
  sw3: 'sw-c',
  'sw-3': 'sw-c',
  dhcp1: 'dhcp-1',
  'dhcp-1': 'dhcp-1',
  dns1: 'dns-1',
  'dns-1': 'dns-1',
  web1: 'web-1',
  'web-1': 'web-1',
  server1: 'server-1',
  'server-1': 'server-1',
};

export function getDeviceDisplayName(id: string, fallback?: string) {
  const normalizedReference = normalizeDeviceReference(id);
  return canonicalNames[id.toLowerCase()] ?? canonicalNames[normalizedReference] ?? normalizeVisibleDeviceName(fallback ?? id);
}

export function normalizeDeviceReference(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll('_', '-').replaceAll(' ', '');
  return aliases[normalized] ?? normalized;
}

export function normalizeVisibleDeviceName(value: string) {
  return value
    .replace(/\bNB-R([1-9]\d*)\b/gi, 'R$1')
    .replace(/\bR-([1-9]\d*)\b/gi, 'R$1')
    .replace(/\bNB-SW-A\b/gi, 'SW1')
    .replace(/\bNB-SW-B\b/gi, 'SW2')
    .replace(/\bNB-SW-([1-9]\d*)\b/gi, 'SW$1')
    .replace(/\bSW-([1-9]\d*)\b/gi, 'SW$1')
    .replace(/\bPC-A\b/gi, 'PC1')
    .replace(/\bPC-B\b/gi, 'PC2')
    .replace(/\bPC-C\b/gi, 'PC3')
    .replace(/\bDHCP-([1-9]\d*)\b/gi, 'DHCP$1')
    .replace(/\bDNS-([1-9]\d*)\b/gi, 'DNS$1')
    .replace(/\bWEB-([1-9]\d*)\b/gi, 'WEB$1')
    .replace(/\bSERVER-([1-9]\d*)\b/gi, 'SERVER$1');
}
