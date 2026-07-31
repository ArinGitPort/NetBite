export interface CanonicalCliCommand {
  id: string;
  command: string;
  description: string;
}

export const cliCommandCatalog: CanonicalCliCommand[] = [
  { id: 'cli-help', command: 'help', description: 'List commands available in the current mode.' },
  { id: 'cli-enable', command: 'enable', description: 'Enter privileged EXEC mode.' },
  { id: 'cli-configure-terminal', command: 'configure terminal', description: 'Enter global configuration mode.' },
  { id: 'cli-show-running-config', command: 'show running-config', description: 'Inspect the current modeled configuration.' },
  { id: 'cli-show-ip-interface-brief', command: 'show ip interface brief', description: 'Summarize modeled interface addressing and state.' },
  { id: 'cli-show-ip-route', command: 'show ip route', description: 'Inspect connected and static IPv4 routes.' },
  { id: 'cli-show-vlan-brief', command: 'show vlan brief', description: 'Inspect VLANs and access-port membership.' },
  { id: 'cli-show-interfaces-trunk', command: 'show interfaces trunk', description: 'Inspect active trunks and allowed VLANs.' },
  { id: 'cli-ping', command: 'ping <destination>', description: 'Run a deterministic IPv4 reachability test.' },
  { id: 'cli-interface', command: 'interface <name>', description: 'Enter interface or subinterface configuration.' },
  { id: 'cli-ip-address', command: 'ip address <address> <mask>', description: 'Assign IPv4 settings to the selected interface.' },
  { id: 'cli-ip-route', command: 'ip route <network> <mask> <next-hop>', description: 'Create a bounded static route.' },
  { id: 'cli-switchport-access', command: 'switchport access vlan <id>', description: 'Assign an access interface to a VLAN.' },
  { id: 'cli-switchport-trunk', command: 'switchport mode trunk', description: 'Place an interface in trunk mode.' },
  { id: 'cli-encapsulation-dot1q', command: 'encapsulation dot1q <id>', description: 'Bind a router subinterface to an 802.1Q VLAN.' },
];

export function resolveCanonicalCliCommand(input: string) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return undefined;
  return cliCommandCatalog.find((item) => {
    const stem = item.command.replace(/ <[^>]+>/g, '');
    return normalized === item.command || normalized === stem || normalized.startsWith(`${stem} `);
  });
}
