import { render } from '@testing-library/react-native';

import { SolvedTopologyDiagram } from '@/features/practice/components/solved-topology-diagram';
import { buildSolvedLabExample } from '@/features/practice/solved-lab-examples';

describe('SolvedTopologyDiagram', () => {
  test('renders complete routed subnet captions and both endpoint interfaces', async () => {
    const topology = buildSolvedLabExample('static-route-board')!.topology!;
    const screen = await render(<SolvedTopologyDiagram onSelect={jest.fn()} selectedId="pc-a" topology={topology} />);
    expect(screen.getByText('192.168.10.0/24')).toBeTruthy();
    expect(screen.getByText('10.0.12.0/30')).toBeTruthy();
    expect(screen.getByText('10.0.23.0/30')).toBeTruthy();
    expect(screen.getByText('192.168.30.0/24')).toBeTruthy();
    expect(screen.getAllByText('E0')).toHaveLength(2);
    expect(screen.getAllByText('G0/0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('G0/1').length).toBeGreaterThan(0);
  });
});
