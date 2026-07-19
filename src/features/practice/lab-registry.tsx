import type { ComponentType } from 'react';

import { EthernetCableLab } from '@/features/ethernet/components/ethernet-cable-lab';
import { GuidedPracticeLab } from '@/features/practice/components/guided-practice-lab';
import { practiceConfigs } from '@/features/practice/practice-configs';
import { SwitchDecisionLab } from '@/features/switching/components/switch-decision-lab';
import { CliLab } from '@/features/cli/components/cli-lab';
import { cliLabDefinitions } from '@/features/cli/cli-lab-definitions';

function practiceComponent(labId: string): ComponentType {
  const config = practiceConfigs[labId];
  return function RegisteredPractice() {
    return <GuidedPracticeLab config={config} />;
  };
}

function cliComponent(labId: string): ComponentType {
  const definition = cliLabDefinitions[labId];
  return function RegisteredCliLab() {
    return <CliLab definition={definition} />;
  };
}

export function createLabRegistry(firstNetworkLab: ComponentType): Record<string, ComponentType> {
  return {
    'first-network': firstNetworkLab,
    'ethernet-cables': EthernetCableLab,
    'switch-decision-desk': SwitchDecisionLab,
    ...Object.fromEntries(Object.keys(practiceConfigs).map((labId) => [labId, practiceComponent(labId)])),
    ...Object.fromEntries(Object.keys(cliLabDefinitions).map((labId) => [labId, cliComponent(labId)])),
  };
}
