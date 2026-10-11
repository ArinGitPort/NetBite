import type { DeviceConfigurationSectionProps } from '@/features/workshops/topology-device-editor-types';
import { Button } from '@/components/ui/button';
import { InputField, TextareaField } from '@/components/ui/form-field';
import { SelectField } from '@/components/ui/select';
import { TopologyDeviceSection as Section } from '@/features/workshops/topology-device-section';

export function TopologyDeviceExpected({ device, update, config, setConfig }: DeviceConfigurationSectionProps) {
  return (
          <Section title="Expected protocol state">
        <TextareaField
          label="What students should observe"
          hint="Add one result per line, such as an installed route, STP role, translation, neighbor, or ACL result."
          rows={4}
          value={config.expectedState?.notes?.join("\n") ?? ""}
          onChange={(event) =>
            setConfig({
              expectedState: {
                ...config.expectedState,
                notes: event.target.value.split("\n").filter(Boolean),
              },
            })
          }
        />
      </Section>
  );
}
