/**
 * Lessons linked from each Operations lab briefing. Required Operations
 * checkpoints are derived from this map so teaching and assessment stay aligned.
 */
export const operationsLabPrerequisiteLessonIds = {
  'transport-service-desk': ['ops-services', 'ops-ports', 'ops-tcp-handshake'],
  'dhcp-lease-desk': ['dhcp-purpose', 'dhcp-offer', 'dhcp-request-ack', 'dhcp-leases', 'dhcp-relay'],
  'dns-resolution-desk': ['dns-stub', 'dns-recursive', 'dns-cache'],
  'acl-policy-desk': ['acl-tuple', 'acl-order', 'acl-direction'],
  'nat-translation-desk': ['nat-boundary', 'nat-pat', 'nat-return'],
  'ipv6-address-desk': ['ipv6-hex', 'ipv6-double-colon', 'ipv6-prefix'],
  'ipv6-neighbor-desk': ['icmpv6-role', 'ipv6-no-arp', 'ipv6-static-route'],
  'spanning-tree-desk': ['stp-bpdu', 'stp-root', 'stp-root-port'],
  'etherchannel-desk': ['ec-purpose', 'ec-compatibility', 'ec-verify'],
  'route-source-desk': ['dynamic-purpose', 'route-sources', 'admin-distance'],
  'ospf-area-desk': ['ospf-router-id', 'ospf-hello', 'ospf-spf'],
  'network-operations-capstone': [],
} as const satisfies Record<string, readonly string[]>;

export const operationsCheckpointLessonIds = new Set<string>(
  Object.values(operationsLabPrerequisiteLessonIds).flat(),
);
