import type { WorkshopTopologyDevice } from '@netbite/workshops/contracts';

export type DeviceConfiguration = NonNullable<WorkshopTopologyDevice['configuration']>;

export interface DeviceConfigurationSectionProps {
  device: WorkshopTopologyDevice;
  update: (patch: Partial<WorkshopTopologyDevice>) => void;
  config: DeviceConfiguration;
  setConfig: (patch: Partial<DeviceConfiguration>) => void;
}
