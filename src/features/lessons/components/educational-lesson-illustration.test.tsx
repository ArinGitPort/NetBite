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
    expect(screen.getByText('62')).toBeTruthy();
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
});
