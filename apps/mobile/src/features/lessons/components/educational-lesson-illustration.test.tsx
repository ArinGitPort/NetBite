import { fireEvent, render } from '@testing-library/react-native';

import { EducationalLessonIllustration } from '@/features/lessons/components/educational-lesson-illustration';
import { educationalIllustrations } from '@/features/lessons/educational-illustration-registry';

describe('EducationalLessonIllustration', () => {
  test('renders exact address segments as selectable text', async () => {
    const screen = await render(<EducationalLessonIllustration type="ipv4-prefix" />);
    expect(screen.getByText('192.168.10')).toBeTruthy();
    expect(screen.getByText('25')).toBeTruthy();
    expect(screen.getByLabelText(/first 24 bits identify the network/i)).toBeTruthy();
  });

  test('renders a technical table without putting facts inside its raster asset', async () => {
    const screen = await render(<EducationalLessonIllustration type="subnet-mask" />);
    expect(screen.getByText('255.255.255.192')).toBeTruthy();
    expect(screen.getByText('6 HOST BITS')).toBeTruthy();
    expect(screen.getByText('STEP 64')).toBeTruthy();
  });

  test('renders exact ARP envelope and payload fields as selectable text', async () => {
    const screen = await render(<EducationalLessonIllustration type="arp-request" />);
    expect(screen.getByText('FF:FF:FF:FF:FF:FF')).toBeTruthy();
    expect(screen.getByText('0x0806')).toBeTruthy();
    expect(screen.getByText('UNKNOWN / UNUSED')).toBeTruthy();
    expect(screen.getByLabelText(/target hardware: unknown \/ unused/i)).toBeTruthy();
  });

  test('stacks packet fields without truncating exact values on a narrow panel', async () => {
    const screen = await render(<EducationalLessonIllustration type="arp-request" />);
    const panel = screen.getByLabelText(/PC1 sends an ARP Request/i);
    fireEvent(panel, 'layout', { nativeEvent: { layout: { width: 360, height: 600, x: 0, y: 0 } } });
    expect(screen.getByText('192.168.10.10 / 02:00:00:00:00:0A')).toBeTruthy();
    expect(screen.getByText('192.168.10.20')).toBeTruthy();
  });

  test('renders exact ICMP Echo operational values', async () => {
    const echo = await render(<EducationalLessonIllustration type="echo-exchange" />);
    expect(echo.getByText('8 / 0')).toBeTruthy();
    expect(echo.getByText('0 / 0')).toBeTruthy();
  });

  test('renders exact 802.1Q operational values', async () => {
    const vlan = await render(<EducationalLessonIllustration type="dot1q-tag" />);
    expect(vlan.getByText('0x8100 / 16 BITS')).toBeTruthy();
    expect(vlan.getByText('12 BITS')).toBeTruthy();
  });

  test('renders a synchronized guided visual stage accessibly', async () => {
    const screen = await render(<EducationalLessonIllustration stageId="add" type="block-size" />);
    expect(screen.getByText('ADD 64 FOR EACH NEXT START')).toBeTruthy();
    expect(screen.getByLabelText(/guided visual stage: add 64/i)).toBeTruthy();
  });

  test('renders all seven OSI layers in order', async () => {
    const screen = await render(<EducationalLessonIllustration type="osi-stack" />);
    const labels = screen.getAllByText(/^(APPLICATION|PRESENTATION|SESSION|TRANSPORT|NETWORK|DATA LINK|PHYSICAL)$/);
    expect(labels.map(({ props }) => props.children)).toEqual([
      'APPLICATION', 'PRESENTATION', 'SESSION', 'TRANSPORT', 'NETWORK', 'DATA LINK', 'PHYSICAL',
    ]);
  });

  test('explains model mapping without relying on color', async () => {
    const screen = await render(<EducationalLessonIllustration type="concept-layer-map" />);
    expect(screen.getByText(/APPLICATION \+ PRESENTATION \+ SESSION$/)).toBeTruthy();
    expect(screen.getByText(/NETWORK ACCESS \/ LINK$/)).toBeTruthy();
    expect(screen.getByLabelText(/Data Link and Physical map/i)).toBeTruthy();
  });

  test('stacks a full subnet range into intact semantic values on a narrow panel', async () => {
    const screen = await render(<EducationalLessonIllustration type="subnet-range" />);
    fireEvent(screen.getByLabelText(/subnet begins at network address/i), 'layout', {
      nativeEvent: { layout: { width: 360, height: 300, x: 0, y: 0 } },
    });

    expect(screen.getByText('192.168.10.64')).toBeTruthy();
    expect(screen.getByText('192.168.10.65')).toBeTruthy();
    expect(screen.getByText('192.168.10.126')).toBeTruthy();
    expect(screen.getByText('192.168.10.127')).toBeTruthy();
    expect(screen.getByText('FIRST')).toBeTruthy();
    expect(screen.getByText('LAST')).toBeTruthy();
  });

  test.each([
    'device-types', 'ethernet-link', 'mac-fields', 'ipv4-address', 'ipv4-octets',
    'subnet-borrowed-bits', 'subnet-map', 'osi-stack', 'concept-layer-map',
  ] as const)('renders %s in compact mode', async (type) => {
    const screen = await render(<EducationalLessonIllustration type={type} />);
    const panel = screen.getByLabelText(educationalIllustrations[type].accessibilityLabel);
    fireEvent(panel, 'layout', { nativeEvent: { layout: { width: 360, height: 400, x: 0, y: 0 } } });
    expect(panel).toBeTruthy();
  });

  test.each([360, 390, 430, 500, 768, 1024])('keeps the full /26 number line readable at %ipx', async (width) => {
    const screen = await render(<EducationalLessonIllustration type="block-size" />);
    const panel = screen.getByLabelText(/number line begins at 192.168.10.0/i);
    fireEvent(panel, 'layout', { nativeEvent: { layout: { width, height: 500, x: 0, y: 0 } } });
    expect(screen.getByText('192.168.10.0')).toBeTruthy();
    expect(screen.getByText('192.168.10.64')).toBeTruthy();
    expect(screen.getByText('192.168.10.128')).toBeTruthy();
    expect(screen.getByText('192.168.10.192')).toBeTruthy();
  });
});
