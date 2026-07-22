import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { calculateSubnetRange, parseIPv4Address, type RouteEntry } from '@/core/network/advanced-networking';
import type { SandboxDevice, SandboxDevicePatch, SandboxValidationIssue } from '@/core/network/sandbox';
import { AppButton } from '@/shared/components/app-button';
import { Text } from '@/shared/components/console-text';
import { Fonts, Palette, Space, Typography } from '@/shared/theme';

function Field({ label, value, placeholder, keyboardType, onChangeText }: { label: string; value: string; placeholder: string; keyboardType?: 'default' | 'numeric'; onChangeText: (value: string) => void }) {
  return <View style={styles.field}><Text variant="technical" style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} autoCapitalize="none" autoCorrect={false} keyboardType={keyboardType} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Palette.textMuted} selectionColor={Palette.orange} style={styles.input} value={value} /></View>;
}

function SelectButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.select, selected && styles.selectActive]}><Text variant="technical" style={[styles.selectText, selected && styles.selectTextActive]}>{label}</Text></Pressable>;
}

export function SandboxInspector({ device, issues, onConfigure, onRemove, onOpenCli }: {
  device: SandboxDevice;
  issues: SandboxValidationIssue[];
  onConfigure: (patch: SandboxDevicePatch) => { ok: boolean; message?: string };
  onRemove: () => void;
  onOpenCli: () => void;
}) {
  const [interfaceId, setInterfaceId] = useState(device.interfaces[0]?.id ?? '');
  const selected = device.interfaces.find((item) => item.id === interfaceId) ?? device.interfaces[0];
  const [ip, setIp] = useState(selected?.ipv4 ?? '');
  const [prefix, setPrefix] = useState(selected?.prefix?.toString() ?? (device.type === 'switch' ? '' : '24'));
  const [gateway, setGateway] = useState(device.defaultGateway ?? '');
  const [vlans, setVlans] = useState(device.vlans.filter((vlan) => vlan !== 1).join(','));
  const [allowed, setAllowed] = useState(selected?.allowedVlans?.join(',') ?? '');
  const [routeNetwork, setRouteNetwork] = useState('');
  const [routePrefix, setRoutePrefix] = useState('');
  const [routeNextHop, setRouteNextHop] = useState('');
  const [feedback, setFeedback] = useState<string>();

  const deviceIssues = useMemo(() => issues.filter((issue) => issue.deviceIds.includes(device.id)), [device.id, issues]);
  const chooseInterface = (id: string) => {
    const item = device.interfaces.find((candidate) => candidate.id === id) ?? device.interfaces[0];
    setInterfaceId(id); setIp(item?.ipv4 ?? ''); setPrefix(item?.prefix?.toString() ?? (device.type === 'switch' ? '' : '24')); setAllowed(item?.allowedVlans?.join(',') ?? ''); setFeedback(undefined);
  };
  const saveAddressing = () => {
    const address = ip.trim();
    const gatewayAddress = gateway.trim();
    const numericPrefix = prefix.trim() === '' ? undefined : Number(prefix);
    if (address && numericPrefix === undefined) { setFeedback('Enter a prefix length, such as 24.'); return; }
    if (!address && numericPrefix !== undefined) { setFeedback('Enter an IPv4 address or clear the prefix.'); return; }
    const result = onConfigure({ interfaceId: selected.id, interface: { ipv4: address, prefix: numericPrefix }, ...(device.type === 'pc' ? { defaultGateway: gatewayAddress } : {}) });
    setFeedback(result.ok ? `${selected.id} saved${address ? ` as ${address}/${numericPrefix}` : ' with no IPv4 address'}.` : result.message);
  };
  const saveVlans = () => {
    const list = vlans.trim() ? vlans.split(',').map((value) => Number(value.trim())) : [];
    const result = onConfigure({ vlans: list }); setFeedback(result.ok ? 'VLAN database saved.' : result.message);
  };
  const saveAllowed = () => {
    const list = allowed.trim() ? allowed.split(',').map((value) => Number(value.trim())) : [];
    const result = onConfigure({ interfaceId: selected.id, interface: { allowedVlans: list } }); setFeedback(result.ok ? 'Allowed VLANs saved.' : result.message);
  };
  const addRoute = () => {
    const numericPrefix = Number(routePrefix); const range = calculateSubnetRange(routeNetwork, numericPrefix);
    if (!range || range.network !== routeNetwork || !parseIPv4Address(routeNextHop)) { setFeedback('Use a full network address, prefix, and valid next-hop address.'); return; }
    const route: RouteEntry = { prefix: routeNetwork, prefixLength: numericPrefix, nextHop: routeNextHop, exitInterface: 'NEXT-HOP', source: numericPrefix === 0 ? 'default' : 'static' };
    const result = onConfigure({ routes: [...device.routes.filter((item) => !(item.prefix === route.prefix && item.prefixLength === route.prefixLength && item.nextHop === route.nextHop)), route] });
    if (result.ok) { setRouteNetwork(''); setRoutePrefix(''); setRouteNextHop(''); }
    setFeedback(result.ok ? 'Static route added.' : result.message);
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}><View style={styles.headerCopy}><Text variant="label" style={styles.eyebrow}>DEVICE INSPECTOR</Text><Text variant="sectionHeading" style={styles.title}>{device.name} / {device.type.toUpperCase()}</Text></View>{device.type !== 'pc' ? <AppButton label="Open CLI" variant="secondary" onPress={onOpenCli} /> : null}</View>
      <Text variant="technical" style={styles.boundary}>CHANGES AFFECT THIS AUTOSAVED WORKSPACE.</Text>
      <View style={styles.interfacePicker}>{device.interfaces.map((item) => <SelectButton key={item.id} label={`${item.id}${item.adminUp ? '' : ' / DOWN'}`} selected={item.id === selected.id} onPress={() => chooseInterface(item.id)} />)}</View>
      {device.type !== 'switch' ? (
        <View style={styles.formBlock}>
          <Text variant="label" style={styles.blockTitle}>INTERFACE ADDRESSING</Text>
          <Text variant="bodySmall" style={styles.savedState}>{selected.ipv4 && selected.prefix !== undefined ? `CURRENT / ${selected.ipv4}/${selected.prefix}${device.defaultGateway ? ` / GATEWAY ${device.defaultGateway}` : ''}` : 'CURRENT / NOT CONFIGURED'}</Text>
          <View style={styles.row}><Field label="IPV4 ADDRESS" value={ip} placeholder="EXAMPLE / 192.168.1.10" onChangeText={setIp} /><Field label="PREFIX" value={prefix} placeholder="EXAMPLE / 24" keyboardType="numeric" onChangeText={setPrefix} /></View>
          {device.type === 'pc' ? <Field label="DEFAULT GATEWAY" value={gateway} placeholder="EXAMPLE / 192.168.1.1" onChangeText={setGateway} /> : null}
          <View style={styles.row}><SelectButton label={selected.adminUp ? 'ADMIN UP' : 'ADMIN DOWN'} selected={selected.adminUp} onPress={() => onConfigure({ interfaceId: selected.id, interface: { adminUp: !selected.adminUp } })} /><AppButton label="Save addressing" style={styles.flexButton} onPress={saveAddressing} /></View>
        </View>
      ) : (
        <View style={styles.formBlock}>
          <Text variant="label" style={styles.blockTitle}>SWITCHPORT {selected.id}</Text>
          <View style={styles.row}><SelectButton label="ACCESS" selected={selected.switchportMode !== 'trunk'} onPress={() => onConfigure({ interfaceId: selected.id, interface: { switchportMode: 'access', accessVlan: selected.accessVlan ?? 1 } })} /><SelectButton label="TRUNK" selected={selected.switchportMode === 'trunk'} onPress={() => onConfigure({ interfaceId: selected.id, interface: { switchportMode: 'trunk' } })} /></View>
          {selected.switchportMode === 'trunk' ? <><Field label="ALLOWED VLANS" value={allowed} placeholder="EXAMPLE / 10,20" onChangeText={setAllowed} /><AppButton label="Save allowed VLANs" onPress={saveAllowed} /></> : <><Field label="ACCESS VLAN" value={String(selected.accessVlan ?? 1)} placeholder="EXAMPLE / 10" keyboardType="numeric" onChangeText={(value) => onConfigure({ interfaceId: selected.id, interface: { accessVlan: Number(value) } })} /></>}
          <Field label="VLAN DATABASE" value={vlans} placeholder="EXAMPLE / 10,20" onChangeText={setVlans} /><AppButton label="Save VLAN database" variant="secondary" onPress={saveVlans} />
        </View>
      )}
      {device.type === 'router' ? <View style={styles.formBlock}><Text variant="label" style={styles.blockTitle}>STATIC ROUTES</Text>{device.routes.map((route, index) => <View key={`${route.prefix}-${index}`} style={styles.record}><Text variant="technical" style={styles.recordText}>{route.prefix}/{route.prefixLength} VIA {route.nextHop}</Text><Pressable accessibilityRole="button" onPress={() => onConfigure({ routes: device.routes.filter((candidate) => candidate !== route) })}><Text variant="technical" style={styles.removeText}>REMOVE</Text></Pressable></View>)}<View style={styles.row}><Field label="NETWORK" value={routeNetwork} placeholder="EXAMPLE / 10.0.2.0" onChangeText={setRouteNetwork} /><Field label="PREFIX" value={routePrefix} placeholder="EXAMPLE / 24" keyboardType="numeric" onChangeText={setRoutePrefix} /></View><Field label="NEXT HOP" value={routeNextHop} placeholder="EXAMPLE / 10.0.1.2" onChangeText={setRouteNextHop} /><AppButton label="Add static route" onPress={addRoute} /></View> : null}
      {device.macTable.length || device.arpTable.length ? <View style={styles.formBlock}><Text variant="label" style={styles.blockTitle}>LEARNED STATE</Text>{device.macTable.map((entry) => <Text key={`${entry.macAddress}-${entry.vlan}`} variant="technical" style={styles.recordText}>MAC / VLAN {entry.vlan} / {entry.macAddress} / {entry.interfaceId}</Text>)}{device.arpTable.map((entry) => <Text key={entry.ip} variant="technical" style={styles.recordText}>ARP / {entry.ip} / {entry.macAddress}</Text>)}</View> : null}
      {deviceIssues.map((issue) => <Text key={issue.code + issue.message} accessibilityLiveRegion="polite" variant="bodySmall" style={styles.warning}>{issue.level.toUpperCase()} / {issue.message}</Text>)}
      {feedback ? <Text accessibilityLiveRegion="polite" variant="bodySmall" style={styles.feedback}>{feedback}</Text> : null}
      <AppButton label="Remove device" variant="secondary" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.surface, padding: Space.lg, gap: Space.md },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.md },
  headerCopy: { flex: 1, minWidth: 180 },
  eyebrow: { color: Palette.green },
  title: { color: Palette.text, fontFamily: Fonts.semibold, marginTop: Space.xs },
  boundary: { color: Palette.textMuted },
  interfacePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  select: { minHeight: 44, minWidth: 88, flexGrow: 1, borderWidth: 1, borderColor: Palette.border, padding: Space.sm, alignItems: 'center', justifyContent: 'center' },
  selectActive: { borderColor: Palette.orange, backgroundColor: Palette.orangeSoft },
  selectText: { color: Palette.textMuted },
  selectTextActive: { color: Palette.orange },
  formBlock: { borderTopWidth: 1, borderTopColor: Palette.border, paddingTop: Space.md, gap: Space.md },
  blockTitle: { color: Palette.orange },
  savedState: { color: Palette.green },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, alignItems: 'flex-end' },
  field: { flex: 1, minWidth: 150, gap: Space.xs },
  fieldLabel: { color: Palette.textMuted },
  input: { minHeight: 44, borderWidth: 1, borderColor: Palette.border, backgroundColor: Palette.background, color: Palette.white, paddingHorizontal: Space.md, paddingVertical: Space.sm, fontFamily: Fonts.mono, ...Typography.bodySmall },
  flexButton: { flexGrow: 1, minWidth: 160 },
  record: { minHeight: 44, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Space.sm, borderWidth: 1, borderColor: Palette.border, padding: Space.sm },
  recordText: { color: Palette.text, flexShrink: 1 },
  removeText: { color: Palette.accentBright },
  warning: { borderWidth: 1, borderColor: Palette.orange, backgroundColor: Palette.orangeSoft, color: Palette.orange, padding: Space.sm },
  feedback: { color: Palette.green },
});
