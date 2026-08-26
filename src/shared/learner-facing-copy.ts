import type { SyncStatus } from '@/core/account/types';
import type { ContentUpdateStatus } from '@/core/content-delivery/types';

export function getSyncStatusLabel(status: SyncStatus) {
  switch (status) {
    case 'syncing': return 'BACKING UP';
    case 'synced': return 'BACKED UP';
    case 'action-needed': return 'WAITING FOR INTERNET';
    default: return 'SAVED ON THIS DEVICE';
  }
}

export function getContentStatusLabel(status: ContentUpdateStatus) {
  switch (status) {
    case 'checking': return 'CHECKING FOR UPDATES';
    case 'updating': return 'UPDATING MATERIALS';
    case 'updated': return 'MATERIALS UPDATED';
    case 'current': return 'MATERIALS UP TO DATE';
    case 'offline': return 'MATERIALS AVAILABLE OFFLINE';
    case 'error': return 'UPDATE NEEDS ATTENTION';
    default: return 'BUILT-IN MATERIALS READY';
  }
}

export function getRecoveryMessage(context: 'app-data' | 'lab') {
  return context === 'app-data'
    ? "NetBite couldn't open your saved data. Try again, or continue offline using a safe backup."
    : 'This lab was updated. A backup of your previous unfinished work is still stored on this device.';
}

export function getSimulatorBoundaryCopy(scope: 'app' | 'sandbox' | 'cli' | 'transport' | 'switching' | 'operations') {
  switch (scope) {
    case 'sandbox': return 'Practice Ethernet and IPv4 configuration. This sandbox does not send real network traffic.';
    case 'cli': return 'SUPPORTED NETBITE COMMANDS / PRACTICE OUTPUT / NOT A LIVE DEVICE';
    case 'transport': return 'This practice demonstrates selected TCP and UDP behavior. It does not use real sockets, timers, congestion, or random packet loss.';
    case 'switching': return 'This practice explains Ethernet switching decisions. It does not send traffic on a real network.';
    case 'operations': return 'SUPPORTED NETBITE COMMANDS / SAME CONFIGURATION AS THE DEVICE PANEL';
    default: return 'EDUCATIONAL NETWORK PRACTICE / DOES NOT SEND REAL NETWORK TRAFFIC';
  }
}

export function getLabResultLabel(labId: string) {
  if (labId.includes('dhcp')) return 'DHCP EXCHANGE';
  if (labId.includes('dns')) return 'DNS LOOKUP';
  if (labId.includes('acl')) return 'MATCHED ACL RULE';
  if (labId.includes('nat')) return 'TRANSLATION RESULT';
  if (labId.includes('ipv6-address')) return 'ADDRESS CHECK';
  if (labId.includes('ipv6-delivery')) return 'IPV6 DELIVERY RESULT';
  if (labId.includes('spanning')) return 'SPANNING TREE RESULT';
  if (labId.includes('etherchannel')) return 'LACP RESULT';
  if (labId.includes('route-source') || labId.includes('static-route')) return 'ROUTE CHECK';
  if (labId.includes('ospf')) return 'OSPF RESULT';
  if (labId.includes('transport')) return 'CONNECTION RESULT';
  if (labId.includes('capstone')) return 'NETWORK TEST RESULT';
  return 'TEST RESULT';
}
