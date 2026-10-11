import { render } from "@testing-library/react-native";
import { createWorkshopTopologyStarter } from "@netbite/workshops/topology-authoring";

import { FixedThemeProvider } from "@/shared/theme-context";
import { DeviceInspector, SelectedConnection } from "./workshop-topology-inspector";

describe("workshop topology inspector", () => {
  it.each(["light", "dark"] as const)("renders device and connection details in %s mode", async (theme) => {
    const topology = createWorkshopTopologyStarter("first-network");
    const screen = await render(
      <FixedThemeProvider theme={theme}>
        <DeviceInspector device={topology.devices[0]} />
        <SelectedConnection topology={topology} linkId={topology.links[0].id} />
      </FixedThemeProvider>,
    );
    expect(screen.getByText(/SELECTED DEVICE \/ PC1/)).toBeTruthy();
    expect(screen.getByText("SELECTED CONNECTION")).toBeTruthy();
    expect(screen.getByText(/Port E0/)).toBeTruthy();
  });
});
