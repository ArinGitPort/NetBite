import { chapters } from '@/content/chapters';
import {
  educationalIllustrations,
  OSI_LAYERS,
  TCP_IP_LAYERS,
} from '@/features/lessons/educational-illustration-registry';

describe('educational illustration registry', () => {
  const lessonIllustrations = chapters.flatMap(({ lessons }) => lessons.map(({ illustration }) => illustration));

  test('resolves all 77 lesson illustration IDs', () => {
    expect(lessonIllustrations).toHaveLength(77);
    expect(new Set(lessonIllustrations).size).toBe(77);
    lessonIllustrations.forEach((id) => expect(educationalIllustrations[id].id).toBe(id));
  });

  test('provides sources and a complete screen-reader description for every panel', () => {
    Object.values(educationalIllustrations).forEach((illustration) => {
      expect(illustration.sourceIds.length).toBeGreaterThan(0);
      expect(illustration.accessibilityLabel.length).toBeGreaterThan(24);
    });
  });

  test('keeps the exact conventional OSI order', () => {
    expect(OSI_LAYERS.map(({ label, value }) => `${label} ${value}`)).toEqual([
      'L7 APPLICATION',
      'L6 PRESENTATION',
      'L5 SESSION',
      'L4 TRANSPORT',
      'L3 NETWORK',
      'L2 DATA LINK',
      'L1 PHYSICAL',
    ]);
  });

  test('keeps the four-layer TCP/IP order and deterministic model mapping', () => {
    expect(TCP_IP_LAYERS.map(({ value }) => value)).toEqual([
      'APPLICATION',
      'TRANSPORT',
      'INTERNET',
      'NETWORK ACCESS / LINK',
    ]);
    expect(educationalIllustrations['concept-layer-map'].mappings).toEqual([
      ['APPLICATION + PRESENTATION + SESSION', 'APPLICATION'],
      ['TRANSPORT', 'TRANSPORT'],
      ['NETWORK', 'INTERNET'],
      ['DATA LINK + PHYSICAL', 'NETWORK ACCESS / LINK'],
    ]);
  });

  test('keeps critical IPv4, ARP, and VLAN facts in application text', () => {
    expect(educationalIllustrations['ipv4-address'].segments?.map(({ value }) => value)).toEqual(['192', '168', '10', '25']);
    expect(educationalIllustrations['subnet-boundaries'].segments?.map(({ value }) => value)).toEqual(['192.168.10.64', '192.168.10.70', '192.168.10.128']);
    expect(educationalIllustrations['subnet-map'].subnets).toHaveLength(4);
    expect(educationalIllustrations['subnet-borrowed-bits'].bits?.map(({ bit }) => bit).join('')).toBe('11100000');
    expect(educationalIllustrations['arp-request'].accessibilityLabel).toContain('broadcasts');
    expect(educationalIllustrations['arp-reply'].accessibilityLabel).toContain('unicasts');
    expect(educationalIllustrations['vlan-trunk'].footer).toContain('DOES NOT COMBINE');
  });
});
